/** Domain model for requests, collections, environments and results. */

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

export type HttpMethodName = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export const HTTP_METHODS: HttpMethodName[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

export interface FileData {
  name: string;
  base64: string;
  contentType?: string;
  size: number;
}

export interface FormField extends KeyValue {
  type: "text" | "file";
  file?: FileData;
}

export type BodyMode =
  "none" | "json" | "text" | "xml" | "html" | "urlencoded" | "formdata" | "graphql" | "binary";

export interface HttpBodyConfig {
  mode: BodyMode;
  /** Shared by json / text / xml / html. */
  raw: string;
  urlencoded: KeyValue[];
  formdata: FormField[];
  graphql: { query: string; variables: string };
  binary?: FileData;
}

export type AuthType = "none" | "bearer" | "basic" | "apikey";

export interface AuthConfig {
  type: AuthType;
  bearer: { token: string };
  basic: { username: string; password: string };
  apikey: { key: string; value: string; in: "header" | "query" };
}

export interface HttpSettings {
  timeoutMs: number;
  followRedirects: boolean;
  verifyTls: boolean;
}

export type AssertionSource =
  "status" | "header" | "jsonPath" | "body" | "responseTime" | "grpcStatus";

export type AssertionOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "exists"
  | "notExists"
  | "lessThan"
  | "greaterThan"
  | "matches";

export interface Assertion {
  id: string;
  enabled: boolean;
  source: AssertionSource;
  /** Header name or JSON path, depending on `source`. */
  property: string;
  operator: AssertionOperator;
  expected: string;
}

export type ExtractionSource = "jsonPath" | "header" | "status";

/** Copies a value from the response into a variable after each run. */
export interface Extraction {
  id: string;
  enabled: boolean;
  variable: string;
  source: ExtractionSource;
  path: string;
}

interface RequestBase {
  id: string;
  name: string;
  description?: string;
  preScript: string;
  testScript: string;
  assertions: Assertion[];
  extractions: Extraction[];
}

export interface HttpRequest extends RequestBase {
  kind: "http";
  method: HttpMethodName;
  url: string;
  params: KeyValue[];
  headers: KeyValue[];
  body: HttpBodyConfig;
  auth: AuthConfig;
  settings: HttpSettings;
}

export type GrpcSchemaSourceRef = { type: "reflection" } | { type: "protoSet"; protoSetId: string };

export interface GrpcRequest extends RequestBase {
  kind: "grpc";
  /** host:port, optionally prefixed with grpc:// or grpcs:// */
  target: string;
  tls: boolean;
  source: GrpcSchemaSourceRef;
  /** `package.Service/Method` */
  method: string;
  /** JSON object; a JSON array of objects for client-streaming methods. */
  message: string;
  metadata: KeyValue[];
  timeoutMs: number;
}

export type ApiRequest = HttpRequest | GrpcRequest;

export interface Folder {
  type: "folder";
  id: string;
  name: string;
  items: CollectionItem[];
}

export interface RequestItem {
  type: "request";
  id: string;
  request: ApiRequest;
}

export type CollectionItem = Folder | RequestItem;

export interface Collection {
  id: string;
  name: string;
  description?: string;
  items: CollectionItem[];
}

export interface Environment {
  id: string;
  name: string;
  variables: KeyValue[];
}

export interface ProtoFile {
  path: string;
  content: string;
}

export interface ProtoSet {
  id: string;
  name: string;
  files: ProtoFile[];
}

/* ---------- Backend payloads ---------- */

export interface HttpResponseData {
  status: number;
  statusText: string;
  httpVersion: string;
  url: string;
  headers: Array<{ key: string; value: string }>;
  body: string;
  bodyBase64: string | null;
  isBinary: boolean;
  size: number;
  timeMs: number;
}

export interface GrpcMethodInfo {
  name: string;
  path: string;
  inputType: string;
  outputType: string;
  clientStreaming: boolean;
  serverStreaming: boolean;
  inputTemplate: string;
}

export interface GrpcServiceInfo {
  name: string;
  methods: GrpcMethodInfo[];
}

export interface GrpcSchema {
  services: GrpcServiceInfo[];
}

export interface GrpcResponseData {
  ok: boolean;
  statusCode: number;
  statusName: string;
  statusMessage: string;
  messages: unknown[];
  headers: Array<{ key: string; value: string }>;
  trailers: Array<{ key: string; value: string }>;
  timeMs: number;
}

/* ---------- Results ---------- */

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface SentRequestInfo {
  method: string;
  url: string;
  headers: Array<{ key: string; value: string }>;
  body?: string;
}

export type RunOutcome =
  | { kind: "http"; response: HttpResponseData }
  | { kind: "grpc"; response: GrpcResponseData }
  | { kind: "error"; message: string };

export interface RunResult {
  outcome: RunOutcome;
  tests: TestResult[];
  logs: string[];
  sent?: SentRequestInfo;
  startedAt: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: ApiRequest;
  summary: {
    status: string;
    ok: boolean;
    timeMs?: number;
  };
}
