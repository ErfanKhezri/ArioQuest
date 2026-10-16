import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  cloneItem,
  cloneRequest,
  newGrpcRequest,
  newHttpRequest,
  normalizeRequest,
} from "@/core/factory";
import { describeGrpc, schemaKey } from "@/core/grpc";
import { cancelRequest } from "@/core/http";
import type { ImportResult } from "@/core/importers";
import { executeRequest } from "@/core/runner";
import { defaultEditorSettings, type EditorSettings } from "@/components/editor/themes";
import type { VariableStore } from "@/core/script";
import { findItem, insertAfter, insertItem, mapItem, removeItem } from "@/core/tree";
import type {
  ApiRequest,
  Collection,
  CollectionItem,
  Environment,
  GrpcSchema,
  HistoryEntry,
  KeyValue,
  ProtoFile,
  ProtoSet,
  RunResult,
} from "@/core/types";
import type { GrpcSchemaSource } from "@/lib/tauri";
import { uid } from "@/lib/id";
import { workspaceStorage } from "@/lib/storage";
import { newKeyValue } from "@/core/factory";
import { seedWorkspace } from "./seed";

export type View = "home" | "workspace";
export type SidebarSection = "collections" | "history" | "environments" | "protos";

export interface Tab {
  id: string;
  request: ApiRequest;
  /** Where the request is saved; absent for unsaved drafts. */
  origin?: { collectionId: string; itemId: string };
  /** JSON of the request as last saved, to detect unsaved changes. */
  savedJson?: string;
}

export type Dialog =
  | { type: "import" }
  | { type: "environment"; environmentId: string | "globals" }
  | { type: "code"; tabId: string }
  | { type: "save"; tabId: string }
  | { type: "runner"; collectionId: string; folderId?: string }
  | { type: "palette" }
  | { type: "settings" }
  | { type: "protoSet"; protoSetId?: string; assignToTabId?: string };

export interface SchemaState {
  status: "loading" | "ready" | "error";
  schema?: GrpcSchema;
  error?: string;
}

const HISTORY_LIMIT = 150;

interface PersistedState {
  collections: Collection[];
  environments: Environment[];
  globals: KeyValue[];
  activeEnvironmentId: string | null;
  history: HistoryEntry[];
  protoSets: ProtoSet[];
  tabs: Tab[];
  activeTabId: string | null;
  sidebar: SidebarSection;
  seeded: boolean;
  editorSettings: EditorSettings;
}

interface UiState {
  hydrated: boolean;
  view: View;
  dialog: Dialog | null;
  results: Record<string, RunResult>;
  /** Tab id → backend request id of the call in flight. */
  running: Record<string, string>;
  schemas: Record<string, SchemaState>;
}

interface Actions {
  setView: (view: View) => void;
  showSection: (section: SidebarSection) => void;
  openDialog: (dialog: Dialog) => void;
  closeDialog: () => void;

  newTab: (kind?: "http" | "grpc", request?: ApiRequest) => string;
  openCollectionRequest: (collectionId: string, itemId: string) => void;
  openHistoryEntry: (entryId: string) => void;
  activateTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  closeOtherTabs: (tabId: string) => void;
  duplicateTab: (tabId: string) => void;
  updateRequest: (tabId: string, update: (request: ApiRequest) => ApiRequest) => void;
  saveTab: (tabId: string) => boolean;
  saveTabTo: (tabId: string, collectionId: string, folderId: string | null, name: string) => void;

  sendTab: (tabId: string) => Promise<void>;
  cancelTab: (tabId: string) => void;
  clearResult: (tabId: string) => void;

  createCollection: (name: string) => string;
  updateCollection: (id: string, patch: Partial<Omit<Collection, "id" | "items">>) => void;
  deleteCollection: (id: string) => void;
  duplicateCollection: (id: string) => void;
  addFolder: (collectionId: string, parentId: string | null, name: string) => string;
  addRequestTo: (collectionId: string, parentId: string | null, request: ApiRequest) => void;
  renameItem: (collectionId: string, itemId: string, name: string) => void;
  deleteItem: (collectionId: string, itemId: string) => void;
  duplicateItem: (collectionId: string, itemId: string) => void;

  createEnvironment: (name: string) => string;
  updateEnvironment: (id: string, patch: Partial<Omit<Environment, "id">>) => void;
  deleteEnvironment: (id: string) => void;
  duplicateEnvironment: (id: string) => void;
  setActiveEnvironment: (id: string | null) => void;
  setGlobals: (globals: KeyValue[]) => void;

  deleteHistoryEntry: (id: string) => void;
  clearHistory: () => void;

  addProtoSet: (name: string, files: ProtoFile[]) => string;
  updateProtoSet: (id: string, patch: Partial<Omit<ProtoSet, "id">>) => void;
  deleteProtoSet: (id: string) => void;
  loadSchema: (source: GrpcSchemaSource) => Promise<SchemaState>;

  updateEditorSettings: (patch: Partial<EditorSettings>) => void;

  importData: (result: ImportResult) => void;
  variableStore: () => VariableStore;
  resolveVariable: (name: string) => { value: string; scope: string } | undefined;
}

export type WorkspaceState = PersistedState & UiState & Actions;

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

function upsert(list: KeyValue[], key: string, value: string): KeyValue[] {
  const index = list.findIndex((v) => v.key === key);
  if (index < 0) return [...list, newKeyValue(key, value)];
  return list.map((v, i) => (i === index ? { ...v, value, enabled: true } : v));
}

function historySummary(result: RunResult): HistoryEntry["summary"] {
  const { outcome } = result;
  if (outcome.kind === "http") {
    const { status, statusText, timeMs } = outcome.response;
    return { status: `${status} ${statusText}`.trim(), ok: status < 400, timeMs };
  }
  if (outcome.kind === "grpc") {
    const { statusName, ok, timeMs } = outcome.response;
    return { status: statusName, ok, timeMs };
  }
  return { status: "Error", ok: false };
}

const tabFor = (request: ApiRequest, origin?: Tab["origin"]): Tab => ({
  id: uid("tab"),
  request,
  origin,
  savedJson: origin ? JSON.stringify(request) : undefined,
});

export const isTabDirty = (tab: Tab) =>
  tab.savedJson === undefined ? true : tab.savedJson !== JSON.stringify(tab.request);

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => {
      const updateCollections = (fn: (collections: Collection[]) => Collection[]) =>
        set({ collections: fn(get().collections) });
      const updateItems = (
        collectionId: string,
        fn: (items: CollectionItem[]) => CollectionItem[],
      ) =>
        updateCollections((cols) =>
          cols.map((c) => (c.id === collectionId ? { ...c, items: fn(c.items) } : c)),
        );
      const activeEnvironment = () =>
        get().environments.find((e) => e.id === get().activeEnvironmentId);
      /** Tabs pointing at deleted items become unsaved drafts. */
      const detachTabs = (isGone: (origin: NonNullable<Tab["origin"]>) => boolean) =>
        set({
          tabs: get().tabs.map((t) =>
            t.origin && isGone(t.origin) ? { ...t, origin: undefined, savedJson: undefined } : t,
          ),
        });

      return {
        collections: [],
        environments: [],
        globals: [],
        activeEnvironmentId: null,
        history: [],
        protoSets: [],
        tabs: [],
        activeTabId: null,
        sidebar: "collections",
        seeded: false,
        editorSettings: defaultEditorSettings,

        hydrated: false,
        view: "home",
        dialog: null,
        results: {},
        running: {},
        schemas: {},

        setView: (view) => set({ view }),
        showSection: (sidebar) => set({ sidebar, view: "workspace" }),
        openDialog: (dialog) => set({ dialog }),
        closeDialog: () => set({ dialog: null }),

        newTab: (kind = "http", request) => {
          const tab = tabFor(request ?? (kind === "grpc" ? newGrpcRequest() : newHttpRequest()));
          set({ tabs: [...get().tabs, tab], activeTabId: tab.id, view: "workspace" });
          return tab.id;
        },

        openCollectionRequest: (collectionId, itemId) => {
          const existing = get().tabs.find((t) => t.origin?.itemId === itemId);
          if (existing) {
            set({ activeTabId: existing.id, view: "workspace" });
            return;
          }
          const collection = get().collections.find((c) => c.id === collectionId);
          const item = collection && findItem(collection.items, itemId);
          if (item?.type !== "request") return;
          const tab = tabFor(structuredClone(item.request), { collectionId, itemId });
          set({ tabs: [...get().tabs, tab], activeTabId: tab.id, view: "workspace" });
        },

        openHistoryEntry: (entryId) => {
          const entry = get().history.find((h) => h.id === entryId);
          if (!entry) return;
          get().newTab(entry.request.kind, cloneRequest(normalizeRequest(entry.request)));
        },

        activateTab: (tabId) => set({ activeTabId: tabId, view: "workspace" }),

        closeTab: (tabId) => {
          const { tabs, activeTabId, results, running } = get();
          const index = tabs.findIndex((t) => t.id === tabId);
          if (index < 0) return;
          if (running[tabId]) get().cancelTab(tabId);
          const next = tabs.filter((t) => t.id !== tabId);
          const nextActive =
            activeTabId === tabId
              ? (next[Math.min(index, next.length - 1)]?.id ?? null)
              : activeTabId;
          const { [tabId]: _removed, ...rest } = results;
          void _removed;
          set({ tabs: next, activeTabId: nextActive, results: rest });
        },

        closeOtherTabs: (tabId) => {
          const keep = get().tabs.filter((t) => t.id === tabId);
          set({ tabs: keep, activeTabId: keep[0]?.id ?? null });
        },

        duplicateTab: (tabId) => {
          const tab = get().tabs.find((t) => t.id === tabId);
          if (tab)
            get().newTab(tab.request.kind, cloneRequest(tab.request, `${tab.request.name} copy`));
        },

        updateRequest: (tabId, update) =>
          set({
            tabs: get().tabs.map((t) =>
              t.id === tabId ? { ...t, request: update(t.request) } : t,
            ),
          }),

        saveTab: (tabId) => {
          const tab = get().tabs.find((t) => t.id === tabId);
          if (!tab) return false;
          const origin = tab.origin;
          const collection = origin && get().collections.find((c) => c.id === origin.collectionId);
          if (!origin || !collection || !findItem(collection.items, origin.itemId)) {
            set({ dialog: { type: "save", tabId } });
            return false;
          }
          updateItems(origin.collectionId, (items) =>
            mapItem(
              items,
              origin.itemId,
              (item) => ({ ...item, request: structuredClone(tab.request) }) as CollectionItem,
            ),
          );
          set({
            tabs: get().tabs.map((t) =>
              t.id === tabId ? { ...t, savedJson: JSON.stringify(t.request) } : t,
            ),
          });
          return true;
        },

        saveTabTo: (tabId, collectionId, folderId, name) => {
          const tab = get().tabs.find((t) => t.id === tabId);
          if (!tab) return;
          const request = { ...structuredClone(tab.request), name };
          const itemId = uid("item");
          updateItems(collectionId, (items) =>
            insertItem(items, folderId, { type: "request", id: itemId, request }),
          );
          set({
            tabs: get().tabs.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    request,
                    origin: { collectionId, itemId },
                    savedJson: JSON.stringify(request),
                  }
                : t,
            ),
            dialog: null,
          });
        },

        sendTab: async (tabId) => {
          const tab = get().tabs.find((t) => t.id === tabId);
          if (!tab || get().running[tabId]) return;
          const requestId = uid("run");
          set({ running: { ...get().running, [tabId]: requestId } });

          const result = await executeRequest(tab.request, {
            store: get().variableStore(),
            protoSets: get().protoSets,
            requestId,
          });

          const { [tabId]: current, ...running } = get().running;
          if (current !== requestId) return;
          const entry: HistoryEntry = {
            id: uid("h"),
            timestamp: result.startedAt,
            request: structuredClone(tab.request),
            summary: historySummary(result),
          };
          set({
            running,
            results: { ...get().results, [tabId]: result },
            history: [entry, ...get().history].slice(0, HISTORY_LIMIT),
          });
        },

        cancelTab: (tabId) => {
          const requestId = get().running[tabId];
          if (requestId) void cancelRequest(requestId);
        },

        clearResult: (tabId) => {
          const { [tabId]: _removed, ...rest } = get().results;
          void _removed;
          set({ results: rest });
        },

        createCollection: (name) => {
          const collection: Collection = { id: uid("col"), name, items: [] };
          set({ collections: [...get().collections, collection] });
          return collection.id;
        },

        updateCollection: (id, patch) =>
          updateCollections((cols) => cols.map((c) => (c.id === id ? { ...c, ...patch } : c))),

        deleteCollection: (id) => {
          updateCollections((cols) => cols.filter((c) => c.id !== id));
          detachTabs((o) => o.collectionId === id);
        },

        duplicateCollection: (id) => {
          const source = get().collections.find((c) => c.id === id);
          if (!source) return;
          const copy: Collection = {
            ...source,
            id: uid("col"),
            name: `${source.name} copy`,
            items: source.items.map(cloneItem),
          };
          set({ collections: [...get().collections, copy] });
        },

        addFolder: (collectionId, parentId, name) => {
          const id = uid("fld");
          updateItems(collectionId, (items) =>
            insertItem(items, parentId, { type: "folder", id, name, items: [] }),
          );
          return id;
        },

        addRequestTo: (collectionId, parentId, request) => {
          const itemId = uid("item");
          updateItems(collectionId, (items) =>
            insertItem(items, parentId, { type: "request", id: itemId, request }),
          );
          get().openCollectionRequest(collectionId, itemId);
        },

        renameItem: (collectionId, itemId, name) => {
          updateItems(collectionId, (items) =>
            mapItem(items, itemId, (item) =>
              item.type === "folder"
                ? { ...item, name }
                : { ...item, request: { ...item.request, name } },
            ),
          );
          set({
            tabs: get().tabs.map((t) => {
              if (t.origin?.itemId !== itemId) return t;
              const saved = t.savedJson
                ? { ...(JSON.parse(t.savedJson) as ApiRequest), name }
                : undefined;
              return {
                ...t,
                request: { ...t.request, name },
                savedJson: saved && JSON.stringify(saved),
              };
            }),
          });
        },

        deleteItem: (collectionId, itemId) => {
          const collection = get().collections.find((c) => c.id === collectionId);
          const item = collection && findItem(collection.items, itemId);
          if (!item) return;
          const gone = new Set<string>();
          const collect = (i: CollectionItem) => {
            gone.add(i.id);
            if (i.type === "folder") i.items.forEach(collect);
          };
          collect(item);
          updateItems(collectionId, (items) => removeItem(items, itemId));
          detachTabs((o) => o.collectionId === collectionId && gone.has(o.itemId));
        },

        duplicateItem: (collectionId, itemId) => {
          const collection = get().collections.find((c) => c.id === collectionId);
          const item = collection && findItem(collection.items, itemId);
          if (!item) return;
          const copy = cloneItem(item);
          if (copy.type === "folder") copy.name = `${copy.name} copy`;
          else copy.request.name = `${copy.request.name} copy`;
          updateItems(collectionId, (items) => insertAfter(items, itemId, copy));
        },

        createEnvironment: (name) => {
          const env: Environment = { id: uid("env"), name, variables: [] };
          set({ environments: [...get().environments, env] });
          return env.id;
        },

        updateEnvironment: (id, patch) =>
          set({
            environments: get().environments.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          }),

        deleteEnvironment: (id) =>
          set({
            environments: get().environments.filter((e) => e.id !== id),
            activeEnvironmentId:
              get().activeEnvironmentId === id ? null : get().activeEnvironmentId,
          }),

        duplicateEnvironment: (id) => {
          const env = get().environments.find((e) => e.id === id);
          if (!env) return;
          const copy: Environment = {
            id: uid("env"),
            name: `${env.name} copy`,
            variables: env.variables.map((v) => ({ ...v, id: uid("kv") })),
          };
          set({ environments: [...get().environments, copy] });
        },

        setActiveEnvironment: (activeEnvironmentId) => set({ activeEnvironmentId }),
        setGlobals: (globals) => set({ globals }),

        deleteHistoryEntry: (id) => set({ history: get().history.filter((h) => h.id !== id) }),
        clearHistory: () => set({ history: [] }),

        addProtoSet: (name, files) => {
          const id = uid("proto");
          set({ protoSets: [...get().protoSets, { id, name, files }] });
          return id;
        },

        updateProtoSet: (id, patch) =>
          set({ protoSets: get().protoSets.map((p) => (p.id === id ? { ...p, ...patch } : p)) }),

        deleteProtoSet: (id) => set({ protoSets: get().protoSets.filter((p) => p.id !== id) }),

        loadSchema: async (source) => {
          const key = schemaKey(source);
          set({
            schemas: {
              ...get().schemas,
              [key]: { status: "loading", schema: get().schemas[key]?.schema },
            },
          });
          let state: SchemaState;
          try {
            state = { status: "ready", schema: await describeGrpc(source) };
          } catch (err) {
            state = { status: "error", error: errorText(err) };
          }
          set({ schemas: { ...get().schemas, [key]: state } });
          return state;
        },

        updateEditorSettings: (patch) =>
          set({ editorSettings: { ...get().editorSettings, ...patch } }),

        importData: (result) => {
          const existingProtoIds = new Set(get().protoSets.map((p) => p.id));
          set({
            collections: [...get().collections, ...result.collections],
            environments: [...get().environments, ...result.environments],
            protoSets: [
              ...get().protoSets,
              ...result.protoSets.filter((p) => !existingProtoIds.has(p.id)),
            ],
            globals: result.globals
              ? result.globals.reduce((acc, g) => upsert(acc, g.key, g.value), get().globals)
              : get().globals,
          });
        },

        variableStore: () => ({
          hasEnvironment: () => activeEnvironment() !== undefined,
          get: (scope, name) => {
            const list = scope === "environment" ? activeEnvironment()?.variables : get().globals;
            return list?.find((v) => v.enabled && v.key === name)?.value;
          },
          set: (scope, name, value) => {
            const env = scope === "environment" ? activeEnvironment() : undefined;
            if (env)
              get().updateEnvironment(env.id, { variables: upsert(env.variables, name, value) });
            else set({ globals: upsert(get().globals, name, value) });
          },
          unset: (scope, name) => {
            const env = scope === "environment" ? activeEnvironment() : undefined;
            if (env)
              get().updateEnvironment(env.id, {
                variables: env.variables.filter((v) => v.key !== name),
              });
            else set({ globals: get().globals.filter((v) => v.key !== name) });
          },
        }),

        resolveVariable: (name) => {
          const env = activeEnvironment();
          const fromEnv = env?.variables.find((v) => v.enabled && v.key === name);
          if (fromEnv && env) return { value: fromEnv.value, scope: env.name };
          const fromGlobals = get().globals.find((v) => v.enabled && v.key === name);
          return fromGlobals ? { value: fromGlobals.value, scope: "Globals" } : undefined;
        },
      };
    },
    {
      name: "workspace",
      version: 1,
      storage: createJSONStorage(() => workspaceStorage),
      partialize: (s): PersistedState => ({
        collections: s.collections,
        environments: s.environments,
        globals: s.globals,
        activeEnvironmentId: s.activeEnvironmentId,
        history: s.history,
        protoSets: s.protoSets,
        tabs: s.tabs,
        activeTabId: s.activeTabId,
        sidebar: s.sidebar,
        seeded: s.seeded,
        editorSettings: s.editorSettings,
      }),
      // Fill settings added after the workspace was first saved.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          ...saved,
          editorSettings: { ...defaultEditorSettings, ...saved.editorSettings },
        };
      },
      onRehydrateStorage: () => (state) => {
        const store = useWorkspace;
        if (state && !state.seeded) {
          const { collection, environment } = seedWorkspace();
          store.setState({
            collections: [...state.collections, collection],
            environments: [...state.environments, environment],
            activeEnvironmentId: state.activeEnvironmentId ?? environment.id,
            seeded: true,
          });
        }
        store.setState({
          hydrated: true,
          tabs: store.getState().tabs.map((t) => ({ ...t, request: normalizeRequest(t.request) })),
        });
      },
    },
  ),
);
