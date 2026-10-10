import type { ApiRequest, CollectionItem, Folder, RequestItem } from "./types";

/** Immutable helpers for the folder/request tree inside a collection. */

export function findItem(items: CollectionItem[], id: string): CollectionItem | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.type === "folder") {
      const found = findItem(item.items, id);
      if (found) return found;
    }
  }
  return undefined;
}

export function mapItem(
  items: CollectionItem[],
  id: string,
  fn: (item: CollectionItem) => CollectionItem,
): CollectionItem[] {
  return items.map((item) => {
    if (item.id === id) return fn(item);
    if (item.type === "folder") return { ...item, items: mapItem(item.items, id, fn) };
    return item;
  });
}

export function removeItem(items: CollectionItem[], id: string): CollectionItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) =>
      item.type === "folder" ? { ...item, items: removeItem(item.items, id) } : item,
    );
}

/** Inserts at the end of `parentId` (a folder) or at the root when null. */
export function insertItem(
  items: CollectionItem[],
  parentId: string | null,
  newItem: CollectionItem,
): CollectionItem[] {
  if (parentId === null) return [...items, newItem];
  return mapItem(items, parentId, (parent) =>
    parent.type === "folder" ? { ...parent, items: [...parent.items, newItem] } : parent,
  );
}

/** Inserts `newItem` right after the item with id `afterId`, at the same level. */
export function insertAfter(
  items: CollectionItem[],
  afterId: string,
  newItem: CollectionItem,
): CollectionItem[] {
  const index = items.findIndex((i) => i.id === afterId);
  if (index >= 0) return [...items.slice(0, index + 1), newItem, ...items.slice(index + 1)];
  return items.map((item) =>
    item.type === "folder" ? { ...item, items: insertAfter(item.items, afterId, newItem) } : item,
  );
}

export interface FlatRequest {
  item: RequestItem;
  path: string[];
}

/** Depth-first list of requests, in display order. */
export function flattenRequests(items: CollectionItem[], path: string[] = []): FlatRequest[] {
  return items.flatMap((item) =>
    item.type === "request" ? [{ item, path }] : flattenRequests(item.items, [...path, item.name]),
  );
}

export function countRequests(items: CollectionItem[]): number {
  return flattenRequests(items).length;
}

export function findRequestItemByRequestId(
  items: CollectionItem[],
  requestId: string,
): RequestItem | undefined {
  return flattenRequests(items).find((f) => f.item.request.id === requestId)?.item;
}

export const isFolder = (item: CollectionItem): item is Folder => item.type === "folder";

export const requestLabel = (request: ApiRequest) =>
  request.kind === "http" ? request.method : "GRPC";

/** URL for HTTP requests, `target/Service/Method` for gRPC. */
export const requestTarget = (request: ApiRequest) =>
  request.kind === "http" ? request.url : `${request.target}/${request.method}`;
