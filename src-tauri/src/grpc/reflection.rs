//! Loads service definitions from a server via gRPC Server Reflection.

use std::collections::{HashMap, HashSet, VecDeque};

use prost::Message;
use prost_reflect::DescriptorPool;
use prost_types::FileDescriptorProto;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tonic::transport::Channel;
use tonic::{Code, Request};

use super::client::apply_metadata;
use crate::types::KeyValue;

/// Implements the reflection walk for one generated protocol version
/// (`v1` and `v1alpha` are wire-identical apart from the package name).
macro_rules! reflection_impl {
    ($name:ident, $pb:path) => {
        async fn $name(
            channel: Channel,
            metadata: &[KeyValue],
        ) -> Result<Vec<FileDescriptorProto>, tonic::Status> {
            use $pb as pb;
            use pb::server_reflection_client::ServerReflectionClient;
            use pb::server_reflection_request::MessageRequest;
            use pb::server_reflection_response::MessageResponse;

            type Inbound = tonic::Streaming<pb::ServerReflectionResponse>;

            async fn send(
                tx: &mpsc::Sender<pb::ServerReflectionRequest>,
                msg: MessageRequest,
            ) -> Result<(), tonic::Status> {
                let req = pb::ServerReflectionRequest { host: String::new(), message_request: Some(msg) };
                tx.send(req).await.map_err(|_| tonic::Status::aborted("Reflection stream closed"))
            }

            async fn recv(inbound: &mut Inbound) -> Result<MessageResponse, tonic::Status> {
                let response = inbound
                    .message()
                    .await?
                    .ok_or_else(|| tonic::Status::aborted("Reflection stream ended early"))?;
                match response.message_response {
                    Some(MessageResponse::ErrorResponse(e)) => {
                        Err(tonic::Status::new(Code::from(e.error_code), e.error_message))
                    }
                    Some(other) => Ok(other),
                    None => Err(tonic::Status::internal("Empty reflection response")),
                }
            }

            let (tx, rx) = mpsc::channel::<pb::ServerReflectionRequest>(8);
            let mut request = Request::new(ReceiverStream::new(rx));
            apply_metadata(&mut request, metadata).map_err(tonic::Status::invalid_argument)?;

            // Queue the first request before opening the stream so servers
            // that wait for a message before sending headers don't deadlock.
            send(&tx, MessageRequest::ListServices(String::new())).await?;
            let mut client = ServerReflectionClient::new(channel);
            let mut inbound = client.server_reflection_info(request).await?.into_inner();

            let services = match recv(&mut inbound).await? {
                MessageResponse::ListServicesResponse(list) => list.service,
                _ => return Err(tonic::Status::internal("Unexpected reflection response")),
            };

            let mut files: HashMap<String, FileDescriptorProto> = HashMap::new();
            let mut wanted: VecDeque<MessageRequest> = services
                .into_iter()
                .filter(|s| !s.name.starts_with("grpc.reflection."))
                .map(|s| MessageRequest::FileContainingSymbol(s.name))
                .collect();
            let mut requested: HashSet<String> = HashSet::new();

            while let Some(req) = wanted.pop_front() {
                // A dependency may have arrived bundled with another file.
                if matches!(&req, MessageRequest::FileByFilename(name) if files.contains_key(name)) {
                    continue;
                }
                send(&tx, req).await?;
                let MessageResponse::FileDescriptorResponse(fds) = recv(&mut inbound).await? else {
                    return Err(tonic::Status::internal("Unexpected reflection response"));
                };
                for bytes in fds.file_descriptor_proto {
                    let file = FileDescriptorProto::decode(bytes.as_slice()).map_err(|e| {
                        tonic::Status::internal(format!("Invalid descriptor from server: {e}"))
                    })?;
                    for dep in &file.dependency {
                        if !files.contains_key(dep) && requested.insert(dep.clone()) {
                            wanted.push_back(MessageRequest::FileByFilename(dep.clone()));
                        }
                    }
                    requested.insert(file.name().to_owned());
                    files.insert(file.name().to_owned(), file);
                }
            }

            Ok(files.into_values().collect())
        }
    };
}

reflection_impl!(fetch_v1, tonic_reflection::pb::v1);
reflection_impl!(fetch_v1alpha, tonic_reflection::pb::v1alpha);

pub async fn load_pool(channel: Channel, metadata: &[KeyValue]) -> Result<DescriptorPool, String> {
    let files = match fetch_v1(channel.clone(), metadata).await {
        Ok(files) => files,
        Err(status) if status.code() == Code::Unimplemented => fetch_v1alpha(channel, metadata)
            .await
            .map_err(|s| describe_status("Server reflection failed", &s))?,
        Err(status) => return Err(describe_status("Server reflection failed", &status)),
    };

    let mut pool = DescriptorPool::new();
    pool.add_file_descriptor_protos(files)
        .map_err(|e| format!("Server returned incomplete descriptors: {e}"))?;
    Ok(pool)
}

fn describe_status(context: &str, status: &tonic::Status) -> String {
    if status.code() == Code::Unimplemented {
        return format!("{context}: the server does not support gRPC reflection. Import its .proto files instead.");
    }
    format!("{context}: {:?} — {}", status.code(), status.message())
}
