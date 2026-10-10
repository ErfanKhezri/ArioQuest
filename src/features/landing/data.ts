import type { IconName } from "@/components/ui/Icon";

export type QuickActionId = "new-request" | "new-grpc" | "import" | "environment";

export interface QuickAction {
  id: QuickActionId;
  title: string;
  description: string;
  icon: IconName;
  shortcut: string[];
  tint: string;
}

export interface Feature {
  title: string;
  description: string;
  icon: IconName;
}

export interface Shortcut {
  label: string;
  keys: string[];
}

export const quickActions: QuickAction[] = [
  {
    id: "new-request",
    title: "New request",
    description: "REST, JSON, forms, files or GraphQL",
    icon: "send",
    shortcut: ["Ctrl", "N"],
    tint: "bg-brand-500/12 text-brand-600 dark:text-brand-300",
  },
  {
    id: "new-grpc",
    title: "gRPC from .proto",
    description: "Import proto files or use reflection",
    icon: "server",
    shortcut: [],
    tint: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400",
  },
  {
    id: "import",
    title: "Import",
    description: "Postman collections, environments or cURL",
    icon: "import",
    shortcut: ["Ctrl", "O"],
    tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "environment",
    title: "Environments",
    description: "Variables per stage, used as {{name}}",
    icon: "globe",
    shortcut: ["Ctrl", "E"],
    tint: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  },
];

export const features: Feature[] = [
  {
    title: "HTTP, GraphQL & gRPC",
    description:
      "Every method, JSON/XML/form/multipart/binary bodies, auth helpers and GraphQL — side by side in tabs.",
    icon: "layers",
  },
  {
    title: "gRPC without codegen",
    description:
      "Load .proto files (imports and well-known types included) or server reflection; unary and streaming calls.",
    icon: "server",
  },
  {
    title: "Tests & assertions",
    description: "No-code assertions plus JavaScript tests with a Postman-compatible pm/aq API.",
    icon: "beaker",
  },
  {
    title: "Collection runner",
    description:
      "Run a collection or folder in order, over several iterations, and see every test result.",
    icon: "play",
  },
  {
    title: "Variables & chaining",
    description:
      "Environments, globals and dynamic values; extract response values to feed the next request.",
    icon: "flow",
  },
  {
    title: "Import & export",
    description:
      "Bring Postman collections and cURL commands in; export to Postman v2.1 or ArioQuest JSON.",
    icon: "import",
  },
];

export const shortcuts: Shortcut[] = [
  { label: "Command palette", keys: ["Ctrl", "K"] },
  { label: "Send request", keys: ["Ctrl", "Enter"] },
  { label: "Save request", keys: ["Ctrl", "S"] },
  { label: "Switch environment", keys: ["Ctrl", "E"] },
  { label: "Paste cURL into the URL bar", keys: ["Ctrl", "V"] },
];
