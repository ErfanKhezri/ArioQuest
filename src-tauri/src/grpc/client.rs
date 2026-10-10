//! Channel setup and request metadata helpers.

use std::time::Duration;

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use tonic::metadata::{AsciiMetadataValue, BinaryMetadataValue, MetadataKey, MetadataMap};
use tonic::transport::{Channel, ClientTlsConfig, Endpoint};
use tonic::Request;

use crate::types::KeyValue;

const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Turns `host:port`, `grpc://host`, `grpcs://host` or `https://host` into
/// an endpoint URI and whether TLS should be used.
pub fn resolve_target(target: &str, tls: bool) -> Result<(String, bool), String> {
    let trimmed = target.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("Server address is empty".to_owned());
    }
    let (rest, tls) = match trimmed.split_once("://") {
        Some(("grpcs" | "https", rest)) => (rest, true),
        Some(("grpc" | "http", rest)) => (rest, tls),
        Some((scheme, _)) => return Err(format!("Unsupported scheme \"{scheme}\"")),
        None => (trimmed, tls),
    };
    let scheme = if tls { "https" } else { "http" };
    Ok((format!("{scheme}://{rest}"), tls))
}

pub async fn connect(target: &str, tls: bool) -> Result<Channel, String> {
    let (uri, tls) = resolve_target(target, tls)?;
    let mut endpoint = Endpoint::from_shared(uri.clone())
        .map_err(|e| format!("Invalid server address \"{target}\": {e}"))?
        .connect_timeout(CONNECT_TIMEOUT)
        .tcp_nodelay(true);
    if tls {
        endpoint = endpoint
            .tls_config(ClientTlsConfig::new().with_enabled_roots())
            .map_err(|e| format!("TLS configuration failed: {e}"))?;
    }
    endpoint.connect().await.map_err(|e| {
        use std::error::Error as _;
        let mut msg = format!("Could not connect to {uri}: {e}");
        let mut source = e.source();
        while let Some(cause) = source {
            let text = cause.to_string();
            if !msg.contains(&text) {
                msg.push_str(": ");
                msg.push_str(&text);
            }
            source = cause.source();
        }
        msg
    })
}

/// Copies user metadata onto a request. Keys ending in `-bin` carry base64.
pub fn apply_metadata<T>(request: &mut Request<T>, metadata: &[KeyValue]) -> Result<(), String> {
    let map = request.metadata_mut();
    for entry in metadata {
        let key = entry.key.trim().to_lowercase();
        if key.is_empty() {
            continue;
        }
        if key.ends_with("-bin") {
            let key = MetadataKey::from_bytes(key.as_bytes())
                .map_err(|_| format!("Invalid metadata key: {key}"))?;
            let bytes = BASE64
                .decode(entry.value.trim())
                .map_err(|_| format!("Metadata {key} must be base64 encoded"))?;
            map.append_bin(key, BinaryMetadataValue::from_bytes(&bytes));
        } else {
            let key = MetadataKey::from_bytes(key.as_bytes())
                .map_err(|_| format!("Invalid metadata key: {key}"))?;
            let value = AsciiMetadataValue::try_from(entry.value.as_str())
                .map_err(|_| format!("Invalid value for metadata {key}"))?;
            map.append(key, value);
        }
    }
    Ok(())
}

pub fn metadata_to_vec(map: &MetadataMap) -> Vec<KeyValue> {
    map.iter()
        .map(|entry| match entry {
            tonic::metadata::KeyAndValueRef::Ascii(k, v) => KeyValue {
                key: k.as_str().to_owned(),
                value: String::from_utf8_lossy(v.as_encoded_bytes()).into_owned(),
            },
            tonic::metadata::KeyAndValueRef::Binary(k, v) => KeyValue {
                key: k.as_str().to_owned(),
                value: String::from_utf8_lossy(v.as_encoded_bytes()).into_owned(),
            },
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_targets() {
        assert_eq!(
            resolve_target("localhost:50051", false).unwrap(),
            ("http://localhost:50051".into(), false)
        );
        assert_eq!(
            resolve_target("api.example.com:443", true).unwrap(),
            ("https://api.example.com:443".into(), true)
        );
        assert_eq!(
            resolve_target("grpcs://api.example.com/", false).unwrap(),
            ("https://api.example.com".into(), true)
        );
        assert!(resolve_target("ftp://x", false).is_err());
    }

    #[test]
    fn applies_ascii_and_binary_metadata() {
        let mut req = Request::new(());
        apply_metadata(
            &mut req,
            &[
                KeyValue {
                    key: "Authorization".into(),
                    value: "Bearer t".into(),
                },
                KeyValue {
                    key: "trace-bin".into(),
                    value: "AQI=".into(),
                },
            ],
        )
        .unwrap();
        assert_eq!(req.metadata().get("authorization").unwrap(), "Bearer t");
        assert_eq!(
            req.metadata()
                .get_bin("trace-bin")
                .unwrap()
                .to_bytes()
                .unwrap()
                .as_ref(),
            &[1, 2]
        );
    }
}
