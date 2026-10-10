use std::time::{Duration, Instant};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, CONTENT_TYPE};
use reqwest::multipart;
use reqwest::redirect::Policy;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::state::AppState;
use crate::types::KeyValue;

/// Bodies larger than this are not echoed back as base64 for binary previews.
const MAX_BINARY_PREVIEW: usize = 10 * 1024 * 1024;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpRequestPayload {
    request_id: String,
    method: String,
    url: String,
    #[serde(default)]
    headers: Vec<KeyValue>,
    #[serde(default)]
    body: Option<HttpBody>,
    #[serde(default)]
    settings: HttpSettings,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
enum HttpBody {
    Text { content: String },
    UrlEncoded { fields: Vec<KeyValue> },
    Multipart { fields: Vec<MultipartField> },
    Binary { base64: String },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MultipartField {
    key: String,
    #[serde(default)]
    value: String,
    /// When set, `value` is ignored and this file is attached instead.
    file: Option<MultipartFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MultipartFile {
    name: String,
    base64: String,
    content_type: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", default)]
struct HttpSettings {
    timeout_ms: u64,
    follow_redirects: bool,
    verify_tls: bool,
}

impl Default for HttpSettings {
    fn default() -> Self {
        Self {
            timeout_ms: 30_000,
            follow_redirects: true,
            verify_tls: true,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HttpResponsePayload {
    status: u16,
    status_text: String,
    http_version: String,
    url: String,
    headers: Vec<KeyValue>,
    body: String,
    body_base64: Option<String>,
    is_binary: bool,
    size: usize,
    time_ms: f64,
}

#[tauri::command]
pub async fn send_http_request(
    state: State<'_, AppState>,
    payload: HttpRequestPayload,
) -> Result<HttpResponsePayload, String> {
    let id = payload.request_id.clone();
    let cancelled = state.register(&id);
    let jar = state.cookie_jar();

    let result = tokio::select! {
        res = execute(payload, jar) => res,
        _ = cancelled => Err("Request cancelled".to_owned()),
    };

    state.finish(&id);
    result
}

#[tauri::command]
pub fn cancel_request(state: State<'_, AppState>, request_id: String) -> bool {
    state.cancel(&request_id)
}

#[tauri::command]
pub fn clear_cookies(state: State<'_, AppState>) {
    state.clear_cookies();
}

async fn execute(
    payload: HttpRequestPayload,
    jar: std::sync::Arc<reqwest::cookie::Jar>,
) -> Result<HttpResponsePayload, String> {
    let settings = &payload.settings;
    let mut builder = reqwest::Client::builder()
        .cookie_provider(jar)
        .danger_accept_invalid_certs(!settings.verify_tls)
        .redirect(if settings.follow_redirects {
            Policy::limited(10)
        } else {
            Policy::none()
        })
        .user_agent(concat!("ArioQuest/", env!("CARGO_PKG_VERSION")));
    if settings.timeout_ms > 0 {
        builder = builder.timeout(Duration::from_millis(settings.timeout_ms));
    }
    let client = builder
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {e}"))?;

    let method = reqwest::Method::from_bytes(payload.method.trim().to_uppercase().as_bytes())
        .map_err(|_| format!("Invalid HTTP method: {}", payload.method))?;
    let url = normalize_url(&payload.url)?;

    let mut headers = HeaderMap::new();
    for h in &payload.headers {
        if h.key.trim().is_empty() {
            continue;
        }
        let name = HeaderName::from_bytes(h.key.trim().as_bytes())
            .map_err(|_| format!("Invalid header name: {}", h.key))?;
        let value = HeaderValue::from_str(&h.value)
            .map_err(|_| format!("Invalid value for header {}", h.key))?;
        headers.append(name, value);
    }

    let mut request = client.request(method, url);
    request = match payload.body {
        None => request,
        Some(HttpBody::Text { content }) => request.body(content),
        Some(HttpBody::Binary { base64 }) => request.body(decode_base64(&base64)?),
        Some(HttpBody::UrlEncoded { fields }) => {
            if !headers.contains_key(CONTENT_TYPE) {
                headers.insert(
                    CONTENT_TYPE,
                    HeaderValue::from_static("application/x-www-form-urlencoded"),
                );
            }
            request.body(encode_form(&fields))
        }
        Some(HttpBody::Multipart { fields }) => {
            // reqwest sets the multipart boundary itself; a user-supplied
            // Content-Type would lack it and break the request.
            headers.remove(CONTENT_TYPE);
            request.multipart(build_multipart(fields)?)
        }
    };

    let started = Instant::now();
    let response = request
        .headers(headers)
        .send()
        .await
        .map_err(describe_error)?;

    let status = response.status();
    let http_version = format!("{:?}", response.version());
    let final_url = response.url().to_string();
    let response_headers: Vec<KeyValue> = response
        .headers()
        .iter()
        .map(|(k, v)| KeyValue {
            key: k.as_str().to_owned(),
            value: String::from_utf8_lossy(v.as_bytes()).into_owned(),
        })
        .collect();
    let content_type = response
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or_default()
        .to_lowercase();

    let bytes = response.bytes().await.map_err(describe_error)?;
    let time_ms = started.elapsed().as_secs_f64() * 1000.0;

    let is_binary = looks_binary(&content_type, &bytes);
    let (body, body_base64) = if is_binary {
        let preview = (bytes.len() <= MAX_BINARY_PREVIEW).then(|| BASE64.encode(&bytes));
        (String::new(), preview)
    } else {
        (String::from_utf8_lossy(&bytes).into_owned(), None)
    };

    Ok(HttpResponsePayload {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or_default().to_owned(),
        http_version,
        url: final_url,
        headers: response_headers,
        body,
        body_base64,
        is_binary,
        size: bytes.len(),
        time_ms,
    })
}

/// Accepts `example.com/path` and `localhost:3000` by defaulting to http(s).
fn normalize_url(raw: &str) -> Result<reqwest::Url, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err("URL is empty".to_owned());
    }
    let with_scheme = if trimmed.contains("://") {
        trimmed.to_owned()
    } else if trimmed.starts_with("localhost") || trimmed.starts_with("127.") {
        format!("http://{trimmed}")
    } else {
        format!("https://{trimmed}")
    };
    reqwest::Url::parse(&with_scheme).map_err(|e| format!("Invalid URL \"{trimmed}\": {e}"))
}

fn encode_form(fields: &[KeyValue]) -> String {
    let mut serializer = reqwest::Url::parse("http://x").expect("static url");
    {
        let mut pairs = serializer.query_pairs_mut();
        for f in fields.iter().filter(|f| !f.key.is_empty()) {
            pairs.append_pair(&f.key, &f.value);
        }
    }
    serializer.query().unwrap_or_default().to_owned()
}

fn build_multipart(fields: Vec<MultipartField>) -> Result<multipart::Form, String> {
    let mut form = multipart::Form::new();
    for field in fields.into_iter().filter(|f| !f.key.is_empty()) {
        form = match field.file {
            Some(file) => {
                let mut part =
                    multipart::Part::bytes(decode_base64(&file.base64)?).file_name(file.name);
                if let Some(ct) = file.content_type.filter(|ct| !ct.is_empty()) {
                    part = part
                        .mime_str(&ct)
                        .map_err(|e| format!("Invalid content type: {e}"))?;
                }
                form.part(field.key, part)
            }
            None => form.text(field.key, field.value),
        };
    }
    Ok(form)
}

fn decode_base64(data: &str) -> Result<Vec<u8>, String> {
    BASE64
        .decode(data.trim())
        .map_err(|e| format!("Invalid base64 data: {e}"))
}

fn looks_binary(content_type: &str, bytes: &[u8]) -> bool {
    const TEXTUAL: [&str; 7] = [
        "text/",
        "json",
        "xml",
        "javascript",
        "html",
        "yaml",
        "x-www-form",
    ];
    if TEXTUAL.iter().any(|t| content_type.contains(t)) {
        return false;
    }
    if content_type.starts_with("image/")
        || content_type.starts_with("audio/")
        || content_type.starts_with("video/")
        || content_type.contains("octet-stream")
        || content_type.contains("pdf")
        || content_type.contains("zip")
        || content_type.contains("protobuf")
        || content_type.contains("grpc")
    {
        return true;
    }
    std::str::from_utf8(bytes).is_err()
}

fn describe_error(err: reqwest::Error) -> String {
    use std::error::Error as _;

    let kind = if err.is_timeout() {
        "Request timed out"
    } else if err.is_connect() {
        "Could not connect"
    } else if err.is_redirect() {
        "Too many redirects"
    } else if err.is_body() || err.is_decode() {
        "Failed to read response body"
    } else {
        "Request failed"
    };

    let mut detail = err.to_string();
    let mut source = err.source();
    while let Some(cause) = source {
        let text = cause.to_string();
        if !detail.contains(&text) {
            detail.push_str(": ");
            detail.push_str(&text);
        }
        source = cause.source();
    }
    format!("{kind} — {detail}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_urls_without_scheme() {
        assert_eq!(
            normalize_url("localhost:3000/a").unwrap().as_str(),
            "http://localhost:3000/a"
        );
        assert_eq!(
            normalize_url("example.com").unwrap().as_str(),
            "https://example.com/"
        );
        assert_eq!(
            normalize_url("http://x.io/p?q=1").unwrap().as_str(),
            "http://x.io/p?q=1"
        );
        assert!(normalize_url("  ").is_err());
    }

    #[test]
    fn encodes_form_fields() {
        let fields = vec![
            KeyValue {
                key: "a b".into(),
                value: "1&2".into(),
            },
            KeyValue {
                key: "".into(),
                value: "skip".into(),
            },
            KeyValue {
                key: "c".into(),
                value: "ü".into(),
            },
        ];
        assert_eq!(encode_form(&fields), "a+b=1%262&c=%C3%BC");
    }

    #[test]
    fn detects_binary_bodies() {
        assert!(!looks_binary("application/json; charset=utf-8", b"{}"));
        assert!(looks_binary("image/png", b"abc"));
        assert!(looks_binary("", &[0xff, 0xfe, 0x00]));
        assert!(!looks_binary("", b"plain text"));
    }
}
