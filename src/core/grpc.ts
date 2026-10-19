import { t } from "@/i18n";
import { type GrpcSchemaSource, type WireKeyValue, invokeCommand, isTauri } from "@/lib/tauri";
import { type VariableResolver, interpolate } from "./variables";
import type {
  GrpcMethodInfo,
  GrpcRequest,
  GrpcResponseData,
  GrpcSchema,
  ProtoSet,
  SentRequestInfo,
} from "./types";

const requireDesktop = () => {
  if (!isTauri()) {
    throw new Error(t("errors.grpcNeedsDesktop"));
  }
};

export function schemaSourceFor(
  request: Pick<GrpcRequest, "source" | "target" | "tls">,
  protoSets: ProtoSet[],
  metadata: WireKeyValue[],
  resolve: VariableResolver,
): GrpcSchemaSource {
  if (request.source.type === "protoSet") {
    const { protoSetId } = request.source;
    const set = protoSets.find((p) => p.id === protoSetId);
    if (!set) throw new Error(t("errors.protoSetDeleted"));
    return { kind: "protos", files: set.files };
  }
  return {
    kind: "reflection",
    target: interpolate(request.target, resolve),
    tls: request.tls,
    metadata,
  };
}

export async function describeGrpc(source: GrpcSchemaSource): Promise<GrpcSchema> {
  requireDesktop();
  return invokeCommand("grpc_describe", { source });
}

export interface PreparedGrpcCall {
  payload: {
    requestId: string;
    target: string;
    tls: boolean;
    source: GrpcSchemaSource;
    method: string;
    body: string;
    metadata: WireKeyValue[];
    timeoutMs: number;
  };
  sent: SentRequestInfo;
}

export function prepareGrpcCall(
  request: GrpcRequest,
  protoSets: ProtoSet[],
  resolve: VariableResolver,
  requestId: string,
): PreparedGrpcCall {
  if (!request.method) throw new Error(t("errors.selectMethod"));
  const v = (s: string) => interpolate(s, resolve);
  const metadata = request.metadata
    .filter((m) => m.enabled && m.key.trim())
    .map((m) => ({ key: v(m.key).trim(), value: v(m.value) }));
  const target = v(request.target).trim();
  const body = v(request.message);

  return {
    payload: {
      requestId,
      target,
      tls: request.tls,
      source: schemaSourceFor(request, protoSets, metadata, resolve),
      method: request.method,
      body,
      metadata,
      timeoutMs: request.timeoutMs,
    },
    sent: {
      method: "gRPC",
      url: `${request.tls ? "grpcs" : "grpc"}://${target.replace(/^[a-z]+:\/\//i, "")}/${request.method}`,
      headers: metadata,
      body,
    },
  };
}

export async function invokeGrpc(payload: PreparedGrpcCall["payload"]): Promise<GrpcResponseData> {
  requireDesktop();
  return invokeCommand("grpc_invoke", { payload });
}

/** FNV-1a; only used to tell proto file sets apart in the UI cache. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Identifies a schema for caching in the UI. */
export function schemaKey(source: GrpcSchemaSource): string {
  return source.kind === "protos"
    ? `protos:${hash(source.files.map((f) => `${f.path}\0${f.content}`).join("\0"))}`
    : `reflection:${source.tls}:${source.target}`;
}

export function streamingLabel(m: Pick<GrpcMethodInfo, "clientStreaming" | "serverStreaming">) {
  if (m.clientStreaming && m.serverStreaming) return "Bidirectional streaming";
  if (m.clientStreaming) return "Client streaming";
  if (m.serverStreaming) return "Server streaming";
  return "Unary";
}
