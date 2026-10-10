//! Types shared by several commands.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct KeyValue {
    pub key: String,
    pub value: String,
}
