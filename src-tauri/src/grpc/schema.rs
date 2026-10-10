//! Describes services in a descriptor pool and builds example request JSON.

use prost_reflect::{
    DescriptorPool, DynamicMessage, FieldDescriptor, Kind, MessageDescriptor, SerializeOptions,
};
use serde::Serialize;
use serde_json::{json, Map, Value};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcSchema {
    pub services: Vec<GrpcService>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcService {
    pub name: String,
    pub methods: Vec<GrpcMethod>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcMethod {
    pub name: String,
    /// `/package.Service/Method`, the HTTP/2 path used on the wire.
    pub path: String,
    pub input_type: String,
    pub output_type: String,
    pub client_streaming: bool,
    pub server_streaming: bool,
    /// Pretty JSON skeleton of the input message with every field present.
    pub input_template: String,
}

/// Services every reflection-enabled server exposes; not useful to call.
const INTERNAL_SERVICES: [&str; 3] = [
    "grpc.reflection.v1.ServerReflection",
    "grpc.reflection.v1alpha.ServerReflection",
    "grpc.health.v1.Health",
];

pub fn describe(pool: &DescriptorPool) -> GrpcSchema {
    let mut services: Vec<GrpcService> = pool
        .services()
        .filter(|s| !INTERNAL_SERVICES[..2].contains(&s.full_name()))
        .map(|service| GrpcService {
            name: service.full_name().to_owned(),
            methods: service
                .methods()
                .map(|m| GrpcMethod {
                    name: m.name().to_owned(),
                    path: format!("/{}/{}", service.full_name(), m.name()),
                    input_type: m.input().full_name().to_owned(),
                    output_type: m.output().full_name().to_owned(),
                    client_streaming: m.is_client_streaming(),
                    server_streaming: m.is_server_streaming(),
                    input_template: serde_json::to_string_pretty(&template(&m.input()))
                        .unwrap_or_else(|_| "{}".to_owned()),
                })
                .collect(),
        })
        .collect();
    // Health checks are useful but noisy; keep them last.
    services.sort_by_key(|s| (s.name == INTERNAL_SERVICES[2], s.name.clone()));
    GrpcSchema { services }
}

pub fn serialize_options() -> SerializeOptions {
    SerializeOptions::new()
        .use_proto_field_name(true)
        .skip_default_fields(false)
}

pub fn to_json(message: &DynamicMessage) -> Value {
    message
        .serialize_with_options(serde_json::value::Serializer, &serialize_options())
        .unwrap_or_else(|e| json!({ "$error": e.to_string() }))
}

/// Builds a JSON object containing every field of `desc` with a placeholder
/// value, so users can fill in a request instead of typing it from scratch.
pub fn template(desc: &MessageDescriptor) -> Value {
    message_template(desc, &mut Vec::new())
}

const MAX_DEPTH: usize = 6;

fn message_template(desc: &MessageDescriptor, stack: &mut Vec<String>) -> Value {
    if let Some(wkt) = well_known(desc) {
        return wkt;
    }
    // Stop at recursive types (e.g. tree nodes) and very deep nesting.
    if stack.len() >= MAX_DEPTH || stack.iter().any(|n| n == desc.full_name()) {
        return json!({});
    }
    stack.push(desc.full_name().to_owned());

    let mut seen_oneofs = Vec::new();
    let mut out = Map::new();
    for field in desc.fields() {
        // Only one member of a real oneof may be set; show the first.
        if let Some(oneof) = field.containing_oneof().filter(|o| !o.is_synthetic()) {
            if seen_oneofs.contains(&oneof.full_name().to_owned()) {
                continue;
            }
            seen_oneofs.push(oneof.full_name().to_owned());
        }
        out.insert(field.name().to_owned(), field_template(&field, stack));
    }

    stack.pop();
    Value::Object(out)
}

fn field_template(field: &FieldDescriptor, stack: &mut Vec<String>) -> Value {
    if field.is_map() {
        let Kind::Message(entry) = field.kind() else {
            return json!({});
        };
        let value = kind_template(&entry.map_entry_value_field().kind(), stack);
        return json!({ "key": value });
    }
    let value = kind_template(&field.kind(), stack);
    if field.is_list() {
        json!([value])
    } else {
        value
    }
}

fn kind_template(kind: &Kind, stack: &mut Vec<String>) -> Value {
    match kind {
        Kind::Double | Kind::Float => json!(0.0),
        Kind::Int32 | Kind::Sint32 | Kind::Sfixed32 | Kind::Uint32 | Kind::Fixed32 => json!(0),
        // The proto3 JSON mapping encodes 64-bit integers as strings.
        Kind::Int64 | Kind::Sint64 | Kind::Sfixed64 | Kind::Uint64 | Kind::Fixed64 => json!("0"),
        Kind::Bool => json!(false),
        Kind::String => json!(""),
        Kind::Bytes => json!(""),
        Kind::Enum(e) => e.values().next().map_or(json!(0), |v| json!(v.name())),
        Kind::Message(m) => message_template(m, stack),
    }
}

fn well_known(desc: &MessageDescriptor) -> Option<Value> {
    let value = match desc.full_name() {
        "google.protobuf.Timestamp" => json!("1970-01-01T00:00:00Z"),
        "google.protobuf.Duration" => json!("0s"),
        "google.protobuf.FieldMask" => json!(""),
        "google.protobuf.Struct" | "google.protobuf.Empty" => json!({}),
        "google.protobuf.ListValue" => json!([]),
        "google.protobuf.Value" => Value::Null,
        "google.protobuf.Any" => json!({ "@type": "" }),
        "google.protobuf.StringValue" | "google.protobuf.BytesValue" => json!(""),
        "google.protobuf.BoolValue" => json!(false),
        "google.protobuf.Int64Value" | "google.protobuf.UInt64Value" => json!("0"),
        "google.protobuf.Int32Value" | "google.protobuf.UInt32Value" => json!(0),
        "google.protobuf.DoubleValue" | "google.protobuf.FloatValue" => json!(0.0),
        _ => return None,
    };
    Some(value)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::grpc::protos::{compile, ProtoFile};

    #[test]
    fn builds_templates_for_every_field_kind() {
        let pool = compile(&[ProtoFile {
            path: "t.proto".into(),
            content: r#"
syntax = "proto3";
package t;
import "google/protobuf/timestamp.proto";
enum Color { COLOR_UNSPECIFIED = 0; RED = 1; }
message Node { string id = 1; repeated Node children = 2; }
message Req {
  int32 a = 1;
  int64 b = 2;
  repeated string tags = 3;
  map<string, int32> counts = 4;
  Color color = 5;
  google.protobuf.Timestamp at = 6;
  Node root = 7;
  oneof choice { string x = 8; int32 y = 9; }
  optional bool flag = 10;
}
service S { rpc Call(Req) returns (Req); rpc Watch(stream Req) returns (stream Req); }
"#
            .into(),
        }])
        .unwrap();

        let desc = pool.get_message_by_name("t.Req").unwrap();
        let t = template(&desc);
        assert_eq!(t["a"], json!(0));
        assert_eq!(t["b"], json!("0"));
        assert_eq!(t["tags"], json!([""]));
        assert_eq!(t["counts"], json!({ "key": 0 }));
        assert_eq!(t["color"], json!("COLOR_UNSPECIFIED"));
        assert_eq!(t["at"], json!("1970-01-01T00:00:00Z"));
        assert_eq!(t["root"]["children"], json!([{}]));
        assert!(t.get("x").is_some() && t.get("y").is_none());
        assert_eq!(t["flag"], json!(false));

        // The template must be accepted back as a valid request message.
        DynamicMessage::deserialize(desc, t).expect("template round-trips");

        let schema = describe(&pool);
        let methods = &schema.services[0].methods;
        assert_eq!(methods[0].path, "/t.S/Call");
        assert!(methods[1].client_streaming && methods[1].server_streaming);
    }
}
