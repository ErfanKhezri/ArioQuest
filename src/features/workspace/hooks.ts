import { useCallback } from "react";
import type { ApiRequest, GrpcRequest, HttpRequest } from "@/core/types";
import { useWorkspace } from "@/store/workspace";

/** Returns an updater bound to one tab, narrowed to a request kind. */
export function useRequestUpdater<K extends ApiRequest["kind"]>(tabId: string, kind: K) {
  const updateRequest = useWorkspace((s) => s.updateRequest);
  type R = K extends "http" ? HttpRequest : GrpcRequest;
  return useCallback(
    (fn: (request: R) => R) =>
      updateRequest(tabId, (r) => (r.kind === kind ? (fn(r as R) as ApiRequest) : r)),
    [updateRequest, tabId, kind],
  );
}

export function useActiveTab() {
  return useWorkspace((s) => s.tabs.find((t) => t.id === s.activeTabId));
}
