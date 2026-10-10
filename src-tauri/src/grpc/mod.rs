//! Dynamic gRPC client: schemas come from `.proto` sources or server
//! reflection at runtime, so no code generation is involved.

pub mod client;
pub mod codec;
pub mod invoke;
pub mod protos;
pub mod reflection;
pub mod schema;
