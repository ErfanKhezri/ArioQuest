import type { IconName } from "@/components/ui/Icon";
import type { HttpMethod } from "@/components/ui/MethodBadge";

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  shortcut: string[];
  tint: string;
}

export interface RecentRequest {
  id: string;
  method: HttpMethod;
  name: string;
  url: string;
  collection: string;
  time: string;
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

export const navItems: Array<{ id: string; label: string; icon: IconName }> = [
  { id: "home", label: "Home", icon: "home" },
  { id: "collections", label: "Collections", icon: "folder" },
  { id: "history", label: "History", icon: "history" },
  { id: "environments", label: "Environments", icon: "globe" },
  { id: "mocks", label: "Mock servers", icon: "server" },
  { id: "flows", label: "Flows", icon: "flow" },
];

export const quickActions: QuickAction[] = [
  {
    id: "new-request",
    title: "New request",
    description: "HTTP, GraphQL, WebSocket or gRPC",
    icon: "send",
    shortcut: ["Ctrl", "N"],
    tint: "bg-brand-500/12 text-brand-600 dark:text-brand-300",
  },
  {
    id: "new-collection",
    title: "New collection",
    description: "Group, share and version requests",
    icon: "folder",
    shortcut: ["Ctrl", "Shift", "N"],
    tint: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  },
  {
    id: "import",
    title: "Import",
    description: "Postman, OpenAPI, cURL or HAR",
    icon: "import",
    shortcut: ["Ctrl", "O"],
    tint: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "environment",
    title: "Environment",
    description: "Variables and secrets per stage",
    icon: "globe",
    shortcut: ["Ctrl", "E"],
    tint: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  },
];

export const recentRequests: RecentRequest[] = [
  {
    id: "1",
    method: "GET",
    name: "Get user profile",
    url: "{{baseUrl}}/v1/users/me",
    collection: "Accounts API",
    time: "2m ago",
  },
  {
    id: "2",
    method: "POST",
    name: "Create order",
    url: "{{baseUrl}}/v1/orders",
    collection: "Checkout",
    time: "18m ago",
  },
  {
    id: "3",
    method: "GQL",
    name: "Product search",
    url: "{{gqlUrl}}/graphql",
    collection: "Storefront",
    time: "1h ago",
  },
  {
    id: "4",
    method: "PATCH",
    name: "Update shipping address",
    url: "{{baseUrl}}/v1/users/me/address",
    collection: "Accounts API",
    time: "3h ago",
  },
  {
    id: "5",
    method: "WS",
    name: "Live order events",
    url: "wss://events.example.com/stream",
    collection: "Realtime",
    time: "Yesterday",
  },
  {
    id: "6",
    method: "DELETE",
    name: "Revoke API token",
    url: "{{baseUrl}}/v1/tokens/:id",
    collection: "Auth",
    time: "2d ago",
  },
];

export const features: Feature[] = [
  {
    title: "Every protocol",
    description: "REST, GraphQL, WebSocket, gRPC and SSE side by side in one tabbed workspace.",
    icon: "layers",
  },
  {
    title: "Visual test flows",
    description: "Chain requests into flows, pass data between steps and assert on every hop.",
    icon: "flow",
  },
  {
    title: "Instant mock servers",
    description: "Spin up a local mock from any collection or OpenAPI spec in one click.",
    icon: "server",
  },
  {
    title: "AI copilot",
    description: "Generate requests, tests and docs from plain language or a failing response.",
    icon: "sparkles",
  },
  {
    title: "Encrypted vault",
    description: "Secrets live in the OS keychain, never in exported collections or git.",
    icon: "shield",
  },
  {
    title: "Git-native sync",
    description: "Collections are plain files — diff, branch and review them with your team.",
    icon: "users",
  },
];

export const shortcuts: Shortcut[] = [
  { label: "Command palette", keys: ["Ctrl", "K"] },
  { label: "Send request", keys: ["Ctrl", "Enter"] },
  { label: "Switch environment", keys: ["Ctrl", "E"] },
  { label: "Paste cURL as request", keys: ["Ctrl", "V"] },
];
