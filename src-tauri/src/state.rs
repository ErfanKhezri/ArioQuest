//! Shared backend state managed by Tauri.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use prost_reflect::DescriptorPool;
use reqwest::cookie::Jar;
use tokio::sync::oneshot;

#[derive(Default)]
pub struct AppState {
    /// Cancel handles for in-flight HTTP/gRPC calls, keyed by the frontend request id.
    inflight: Mutex<HashMap<String, oneshot::Sender<()>>>,
    /// Compiled descriptor pools, keyed by a hash of their source (proto files or reflection target).
    pools: Mutex<HashMap<String, DescriptorPool>>,
    /// Session cookie jar shared by every HTTP request (like a browser).
    cookies: Mutex<Arc<Jar>>,
}

impl AppState {
    /// Registers a cancellable call and returns the receiver that fires on cancel.
    pub fn register(&self, id: &str) -> oneshot::Receiver<()> {
        let (tx, rx) = oneshot::channel();
        self.inflight.lock().unwrap().insert(id.to_owned(), tx);
        rx
    }

    pub fn finish(&self, id: &str) {
        self.inflight.lock().unwrap().remove(id);
    }

    /// Returns true if a matching in-flight call was found and signalled.
    pub fn cancel(&self, id: &str) -> bool {
        match self.inflight.lock().unwrap().remove(id) {
            Some(tx) => tx.send(()).is_ok(),
            None => false,
        }
    }

    pub fn cached_pool(&self, key: &str) -> Option<DescriptorPool> {
        self.pools.lock().unwrap().get(key).cloned()
    }

    pub fn cache_pool(&self, key: String, pool: DescriptorPool) {
        self.pools.lock().unwrap().insert(key, pool);
    }

    pub fn cookie_jar(&self) -> Arc<Jar> {
        self.cookies.lock().unwrap().clone()
    }

    pub fn clear_cookies(&self) {
        *self.cookies.lock().unwrap() = Arc::new(Jar::default());
    }
}
