use std::time::Duration;

use prost_reflect::DescriptorPool;
use serde::Deserialize;
use tauri::State;

use crate::grpc::invoke::{invoke, GrpcResponse, InvokeOptions};
use crate::grpc::protos::{self, ProtoFile};
use crate::grpc::schema::{describe, GrpcSchema};
use crate::grpc::{client, reflection};
use crate::state::AppState;
use crate::types::KeyValue;

/// Where the service definitions come from.
#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum SchemaSource {
    Protos {
        files: Vec<ProtoFile>,
    },
    Reflection {
        target: String,
        #[serde(default)]
        tls: bool,
        #[serde(default)]
        metadata: Vec<KeyValue>,
    },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcInvokePayload {
    request_id: String,
    target: String,
    #[serde(default)]
    tls: bool,
    source: SchemaSource,
    /// `package.Service/Method`
    method: String,
    #[serde(default)]
    body: String,
    #[serde(default)]
    metadata: Vec<KeyValue>,
    #[serde(default)]
    timeout_ms: u64,
}

/// Compiles proto files or queries server reflection and lists the services.
#[tauri::command]
pub async fn grpc_describe(
    state: State<'_, AppState>,
    source: SchemaSource,
) -> Result<GrpcSchema, String> {
    let pool = resolve_pool(&state, &source, true).await?;
    Ok(describe(&pool))
}

#[tauri::command]
pub async fn grpc_invoke(
    state: State<'_, AppState>,
    payload: GrpcInvokePayload,
) -> Result<GrpcResponse, String> {
    let id = payload.request_id.clone();
    let cancelled = state.register(&id);

    let run = async {
        let pool = resolve_pool(&state, &payload.source, false).await?;
        invoke(
            &pool,
            InvokeOptions {
                target: &payload.target,
                tls: payload.tls,
                method: &payload.method,
                body: &payload.body,
                metadata: &payload.metadata,
                timeout: (payload.timeout_ms > 0)
                    .then(|| Duration::from_millis(payload.timeout_ms)),
            },
        )
        .await
    };

    let result = tokio::select! {
        res = run => res,
        _ = cancelled => Err("Call cancelled".to_owned()),
    };
    state.finish(&id);
    result
}

async fn resolve_pool(
    state: &AppState,
    source: &SchemaSource,
    refresh: bool,
) -> Result<DescriptorPool, String> {
    match source {
        SchemaSource::Protos { files } => {
            let key = protos::cache_key(files);
            if let Some(pool) = state.cached_pool(&key) {
                return Ok(pool);
            }
            let files = files.clone();
            let pool = tokio::task::spawn_blocking(move || protos::compile(&files))
                .await
                .map_err(|e| format!("Proto compilation crashed: {e}"))??;
            state.cache_pool(key, pool.clone());
            Ok(pool)
        }
        SchemaSource::Reflection {
            target,
            tls,
            metadata,
        } => {
            let key = format!("reflection:{tls}:{}", target.trim());
            if !refresh {
                if let Some(pool) = state.cached_pool(&key) {
                    return Ok(pool);
                }
            }
            let channel = client::connect(target, *tls).await?;
            let pool = reflection::load_pool(channel, metadata).await?;
            state.cache_pool(key, pool.clone());
            Ok(pool)
        }
    }
}
