//! Compiles user-supplied `.proto` sources held in memory (no protoc needed).

use std::collections::{HashMap, HashSet};

use miette::Diagnostic;
use prost_reflect::DescriptorPool;
use protox::file::{ChainFileResolver, File, FileResolver, GoogleFileResolver};
use serde::Deserialize;
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Deserialize)]
pub struct ProtoFile {
    /// Path as picked by the user, e.g. `api/protos/user/v1/user.proto`.
    pub path: String,
    pub content: String,
}

/// Stable cache key for a set of proto sources.
pub fn cache_key(files: &[ProtoFile]) -> String {
    let mut sorted: Vec<&ProtoFile> = files.iter().collect();
    sorted.sort_by(|a, b| a.path.cmp(&b.path));
    let mut hasher = Sha256::new();
    for f in sorted {
        hasher.update(f.path.as_bytes());
        hasher.update([0]);
        hasher.update(f.content.as_bytes());
        hasher.update([0]);
    }
    format!("protos:{}", hex::encode(hasher.finalize()))
}

pub fn compile(files: &[ProtoFile]) -> Result<DescriptorPool, String> {
    if files.is_empty() {
        return Err("No .proto files were provided".to_owned());
    }

    let sources = canonicalize(files);
    let mut roots: Vec<String> = sources.keys().cloned().collect();
    roots.sort();

    let mut resolver = ChainFileResolver::new();
    resolver.add(MemoryResolver {
        files: sources.clone(),
    });
    resolver.add(GoogleFileResolver::new());

    let mut compiler = protox::Compiler::with_file_resolver(resolver);
    compiler.include_imports(true);
    for root in &roots {
        compiler
            .open_file(root)
            .map_err(|e| describe_error(&e, &sources))?;
    }

    Ok(compiler.descriptor_pool())
}

/// Formats a compile error as `file:line:col: message`.
fn describe_error(err: &protox::Error, sources: &HashMap<String, String>) -> String {
    let message = err.to_string();
    let Some(file) = err.file() else {
        return message;
    };

    let offset = err
        .labels()
        .and_then(|mut labels| labels.next())
        .map(|label| label.offset());
    let position = offset.zip(sources.get(file)).map(|(offset, source)| {
        let before = &source[..offset.min(source.len())];
        let line = before.matches('\n').count() + 1;
        let col = before.len() - before.rfind('\n').map_or(0, |i| i + 1) + 1;
        format!(":{line}:{col}")
    });

    if message.contains(file) {
        message
    } else {
        format!("{file}{}: {message}", position.unwrap_or_default())
    }
}

/// Picks the name each file is known by. A file imported as `foo/bar.proto`
/// but uploaded as `my/repo/foo/bar.proto` must be compiled under the import
/// name, otherwise protox would load it twice and report duplicate symbols.
fn canonicalize(files: &[ProtoFile]) -> HashMap<String, String> {
    let imports: HashSet<String> = files
        .iter()
        .flat_map(|f| parse_imports(&f.content))
        .collect();

    let mut out = HashMap::new();
    for file in files {
        let path = normalize_path(&file.path);
        let name = imports
            .iter()
            .filter(|imp| path == **imp || path.ends_with(&format!("/{imp}")))
            .max_by_key(|imp| imp.len())
            .cloned()
            .unwrap_or(path);
        out.insert(name, file.content.clone());
    }
    out
}

fn normalize_path(path: &str) -> String {
    let p = path.replace('\\', "/");
    p.trim_start_matches("./")
        .trim_start_matches('/')
        .to_owned()
}

/// Extracts `import "x.proto";` targets (including `public`/`weak` imports).
fn parse_imports(source: &str) -> Vec<String> {
    source
        .lines()
        .map(str::trim)
        .filter(|line| line.starts_with("import"))
        .filter_map(|line| {
            let start = line.find('"')? + 1;
            let end = start + line[start..].find('"')?;
            Some(line[start..end].to_owned())
        })
        .collect()
}

struct MemoryResolver {
    files: HashMap<String, String>,
}

impl FileResolver for MemoryResolver {
    fn open_file(&self, name: &str) -> Result<File, protox::Error> {
        let source = self.files.get(name).or_else(|| {
            // Fall back to a suffix match so imports relative to a nested
            // root still resolve when the user picked a parent directory.
            let suffix = format!("/{name}");
            let mut matches = self
                .files
                .iter()
                .filter(|(path, _)| path.ends_with(&suffix));
            match (matches.next(), matches.next()) {
                (Some((_, content)), None) => Some(content),
                _ => None,
            }
        });
        match source {
            Some(content) => File::from_source(name, content),
            None => Err(protox::Error::file_not_found(name)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn file(path: &str, content: &str) -> ProtoFile {
        ProtoFile {
            path: path.into(),
            content: content.into(),
        }
    }

    #[test]
    fn compiles_files_with_nested_imports_and_well_known_types() {
        let files = vec![
            file(
                "repo/protos/common/v1/money.proto",
                r#"syntax = "proto3"; package common.v1; message Money { string currency = 1; int64 units = 2; }"#,
            ),
            file(
                "repo\\protos\\shop\\v1\\shop.proto",
                r#"syntax = "proto3";
package shop.v1;
import "common/v1/money.proto";
import "google/protobuf/timestamp.proto";
service Shop { rpc GetPrice(GetPriceRequest) returns (common.v1.Money); }
message GetPriceRequest { string sku = 1; google.protobuf.Timestamp at = 2; }"#,
            ),
        ];

        let pool = compile(&files).expect("compiles");
        let service = pool
            .get_service_by_name("shop.v1.Shop")
            .expect("service exists");
        let method = service.methods().next().unwrap();
        assert_eq!(method.output().full_name(), "common.v1.Money");
    }

    #[test]
    fn reports_syntax_errors() {
        let err = compile(&[file("bad.proto", "syntax = \"proto3\";\nmessage {")]).unwrap_err();
        assert!(err.starts_with("bad.proto:2:"), "{err}");
    }

    #[test]
    fn cache_key_ignores_order() {
        let a = file("a.proto", "x");
        let b = file("b.proto", "y");
        assert_eq!(cache_key(&[a.clone(), b.clone()]), cache_key(&[b, a]));
    }
}
