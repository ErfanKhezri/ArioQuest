//! Calls a method described only by a descriptor pool.

use std::time::{Duration, Instant};

use prost_reflect::{DescriptorPool, DynamicMessage, MethodDescriptor};
use serde::Serialize;
use serde_json::Value;
use tonic::codegen::http::uri::PathAndQuery;
use tonic::{Code, Request, Status};

use super::client::{apply_metadata, connect, metadata_to_vec};
use super::codec::DynamicCodec;
use super::schema::to_json;
use crate::types::KeyValue;

pub struct InvokeOptions<'a> {
    pub target: &'a str,
    pub tls: bool,
    pub method: &'a str,
    pub body: &'a str,
    pub metadata: &'a [KeyValue],
    pub timeout: Option<Duration>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcResponse {
    pub ok: bool,
    pub status_code: i32,
    pub status_name: &'static str,
    pub status_message: String,
    /// One entry per response message (several for server streaming).
    pub messages: Vec<Value>,
    pub headers: Vec<KeyValue>,
    pub trailers: Vec<KeyValue>,
    pub time_ms: f64,
}

pub fn find_method(pool: &DescriptorPool, path: &str) -> Result<MethodDescriptor, String> {
    let trimmed = path.trim().trim_start_matches('/');
    let (service, method) = trimmed
        .rsplit_once('/')
        .or_else(|| trimmed.rsplit_once('.'))
        .ok_or_else(|| format!("Method must look like package.Service/Method, got \"{path}\""))?;
    let svc = pool
        .get_service_by_name(service)
        .ok_or_else(|| format!("Service \"{service}\" not found in the loaded schema"))?;
    let found = svc.methods().find(|m| m.name() == method);
    found.ok_or_else(|| format!("Method \"{method}\" not found on {service}"))
}

/// Parses the request editor contents into one or more input messages.
pub fn parse_messages(
    method: &MethodDescriptor,
    body: &str,
) -> Result<Vec<DynamicMessage>, String> {
    let value: Value = if body.trim().is_empty() {
        Value::Object(Default::default())
    } else {
        serde_json::from_str(body).map_err(|e| format!("Request body is not valid JSON: {e}"))?
    };

    let values = match value {
        Value::Array(items) if method.is_client_streaming() => items,
        Value::Array(_) => {
            return Err("Only client-streaming methods accept a JSON array of messages".to_owned())
        }
        other => vec![other],
    };

    let input = method.input();
    values
        .into_iter()
        .enumerate()
        .map(|(i, v)| {
            DynamicMessage::deserialize(input.clone(), v).map_err(|e| {
                let at = if method.is_client_streaming() {
                    format!(" (message {})", i + 1)
                } else {
                    String::new()
                };
                format!("Request does not match {}{at}: {e}", input.full_name())
            })
        })
        .collect()
}

pub async fn invoke(
    pool: &DescriptorPool,
    opts: InvokeOptions<'_>,
) -> Result<GrpcResponse, String> {
    let method = find_method(pool, opts.method)?;
    let mut messages = parse_messages(&method, opts.body)?;

    let started = Instant::now();
    let channel = connect(opts.target, opts.tls).await?;
    let mut grpc = tonic::client::Grpc::new(channel);
    grpc.ready()
        .await
        .map_err(|e| format!("Connection not ready: {e}"))?;

    let path = PathAndQuery::try_from(format!(
        "/{}/{}",
        method.parent_service().full_name(),
        method.name()
    ))
    .map_err(|e| format!("Invalid method path: {e}"))?;
    let codec = DynamicCodec::new(method.output());

    let mut out = Collected::default();
    let call = async {
        match (method.is_client_streaming(), method.is_server_streaming()) {
            (false, false) => {
                let req = build_request(messages.remove(0), &opts)?;
                match grpc.unary(req, path, codec).await {
                    Ok(resp) => {
                        out.headers = metadata_to_vec(resp.metadata());
                        out.messages.push(to_json(resp.get_ref()));
                    }
                    Err(status) => out.status = Some(status),
                }
            }
            (false, true) => {
                let req = build_request(messages.remove(0), &opts)?;
                let result = grpc.server_streaming(req, path, codec).await;
                out.drain(result).await;
            }
            (true, false) => {
                let req = build_request(tokio_stream::iter(messages), &opts)?;
                match grpc.client_streaming(req, path, codec).await {
                    Ok(resp) => {
                        out.headers = metadata_to_vec(resp.metadata());
                        out.messages.push(to_json(resp.get_ref()));
                    }
                    Err(status) => out.status = Some(status),
                }
            }
            (true, true) => {
                let req = build_request(tokio_stream::iter(messages), &opts)?;
                let result = grpc.streaming(req, path, codec).await;
                out.drain(result).await;
            }
        }
        Ok::<_, String>(())
    };

    match opts.timeout {
        Some(limit) => tokio::time::timeout(limit, call)
            .await
            .map_err(|_| format!("Call timed out after {} ms", limit.as_millis()))??,
        None => call.await?,
    }

    Ok(out.finish(started))
}

fn build_request<T>(message: T, opts: &InvokeOptions<'_>) -> Result<Request<T>, String> {
    let mut req = Request::new(message);
    apply_metadata(&mut req, opts.metadata)?;
    if let Some(limit) = opts.timeout {
        req.set_timeout(limit);
    }
    Ok(req)
}

#[derive(Default)]
struct Collected {
    messages: Vec<Value>,
    headers: Vec<KeyValue>,
    trailers: Vec<KeyValue>,
    status: Option<Status>,
}

impl Collected {
    async fn drain(
        &mut self,
        result: Result<tonic::Response<tonic::Streaming<DynamicMessage>>, Status>,
    ) {
        let mut stream = match result {
            Ok(resp) => {
                self.headers = metadata_to_vec(resp.metadata());
                resp.into_inner()
            }
            Err(status) => {
                self.status = Some(status);
                return;
            }
        };
        loop {
            match stream.message().await {
                Ok(Some(msg)) => self.messages.push(to_json(&msg)),
                Ok(None) => break,
                Err(status) => {
                    self.status = Some(status);
                    return;
                }
            }
        }
        match stream.trailers().await {
            Ok(Some(trailers)) => self.trailers = metadata_to_vec(&trailers),
            Ok(None) => {}
            Err(status) => self.status = Some(status),
        }
    }

    fn finish(self, started: Instant) -> GrpcResponse {
        let time_ms = started.elapsed().as_secs_f64() * 1000.0;
        match self.status {
            None => GrpcResponse {
                ok: true,
                status_code: 0,
                status_name: code_name(Code::Ok),
                status_message: String::new(),
                messages: self.messages,
                headers: self.headers,
                trailers: self.trailers,
                time_ms,
            },
            Some(status) => GrpcResponse {
                ok: false,
                status_code: status.code() as i32,
                status_name: code_name(status.code()),
                status_message: status.message().to_owned(),
                messages: self.messages,
                headers: self.headers,
                // A failed call's status metadata holds its trailers.
                trailers: metadata_to_vec(status.metadata()),
                time_ms,
            },
        }
    }
}

pub fn code_name(code: Code) -> &'static str {
    match code {
        Code::Ok => "OK",
        Code::Cancelled => "CANCELLED",
        Code::Unknown => "UNKNOWN",
        Code::InvalidArgument => "INVALID_ARGUMENT",
        Code::DeadlineExceeded => "DEADLINE_EXCEEDED",
        Code::NotFound => "NOT_FOUND",
        Code::AlreadyExists => "ALREADY_EXISTS",
        Code::PermissionDenied => "PERMISSION_DENIED",
        Code::ResourceExhausted => "RESOURCE_EXHAUSTED",
        Code::FailedPrecondition => "FAILED_PRECONDITION",
        Code::Aborted => "ABORTED",
        Code::OutOfRange => "OUT_OF_RANGE",
        Code::Unimplemented => "UNIMPLEMENTED",
        Code::Internal => "INTERNAL",
        Code::Unavailable => "UNAVAILABLE",
        Code::DataLoss => "DATA_LOSS",
        Code::Unauthenticated => "UNAUTHENTICATED",
    }
}
