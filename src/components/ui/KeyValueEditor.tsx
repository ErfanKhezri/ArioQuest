import { useState, type ReactNode } from "react";
import { newKeyValue } from "@/core/factory";
import type { KeyValue } from "@/core/types";
import { uid } from "@/lib/id";
import { cn } from "@/lib/cn";
import { Checkbox, IconButton } from "./controls";

interface KeyValueEditorProps<T extends KeyValue> {
  rows: T[];
  onChange: (rows: T[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  /** Creates a blank row; defaults to a plain key/value pair. */
  createRow?: (id: string) => T;
  /** Custom value cell (e.g. a file picker for form-data). */
  renderValue?: (row: T, update: (patch: Partial<T>) => void) => ReactNode | null;
  /** Extra cell after the value (e.g. a type selector). */
  renderExtra?: (row: T, update: (patch: Partial<T>) => void) => ReactNode;
  showDescription?: boolean;
  /** Mask values as password fields until revealed. */
  secret?: boolean;
  allowBulkEdit?: boolean;
  className?: string;
}

const cellInput =
  "h-8 w-full min-w-0 bg-transparent px-2.5 font-mono text-xs outline-none placeholder:text-subtle/70 focus:bg-panel-2/60";

function toBulk(rows: KeyValue[]): string {
  return rows
    .filter((r) => r.key || r.value)
    .map((r) => `${r.enabled ? "" : "// "}${r.key}: ${r.value}`)
    .join("\n");
}

function fromBulk<T extends KeyValue>(
  text: string,
  previous: T[],
  createRow: (id: string) => T,
): T[] {
  return text
    .split("\n")
    .filter((line) => line.trim())
    .map((line, i) => {
      const disabled = line.trimStart().startsWith("//");
      const body = disabled ? line.trimStart().slice(2).trimStart() : line;
      const colon = body.indexOf(":");
      const key = (colon >= 0 ? body.slice(0, colon) : body).trim();
      const value = colon >= 0 ? body.slice(colon + 1).trim() : "";
      const base = previous[i] ?? createRow(uid("kv"));
      return { ...base, key, value, enabled: !disabled };
    });
}

/** Editable key/value table with an always-present blank row for adding entries. */
export function KeyValueEditor<T extends KeyValue>({
  rows,
  onChange,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
  createRow = (id) => ({ ...newKeyValue(), id }) as T,
  renderValue,
  renderExtra,
  showDescription = false,
  secret = false,
  allowBulkEdit = true,
  className,
}: KeyValueEditorProps<T>) {
  // The blank row's id is reserved up front so the focused input survives
  // the moment it turns into a real row.
  const [ghostId, setGhostId] = useState(() => uid("kv"));
  const [bulk, setBulk] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const update = (id: string, patch: Partial<T>) => {
    if (id === ghostId) {
      onChange([...rows, { ...createRow(ghostId), ...patch }]);
      setGhostId(uid("kv"));
      return;
    }
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const ghost = createRow(ghostId);
  const allRows = [...rows, ghost];
  const enabledCount = rows.filter((r) => r.enabled && r.key).length;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between px-4 pt-2 pb-1.5 text-[11px] text-subtle">
        <span>{rows.length > 0 ? `${enabledCount} of ${rows.length} enabled` : " "}</span>
        <span className="flex items-center gap-2">
          {secret && (
            <button type="button" className="hover:text-fg" onClick={() => setRevealed(!revealed)}>
              {revealed ? "Hide values" : "Show values"}
            </button>
          )}
          {allowBulkEdit && (
            <button
              type="button"
              className="hover:text-fg"
              onClick={() => {
                if (bulk === null) setBulk(toBulk(rows));
                else {
                  onChange(fromBulk(bulk, rows, createRow));
                  setBulk(null);
                }
              }}
            >
              {bulk === null ? "Bulk edit" : "Key-value edit"}
            </button>
          )}
        </span>
      </div>

      {bulk !== null ? (
        <textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          onBlur={() => onChange(fromBulk(bulk, rows, createRow))}
          spellCheck={false}
          placeholder={"key: value\n// disabled-key: value"}
          className="mx-4 mb-4 min-h-40 flex-1 resize-none rounded-lg border border-line bg-panel p-3 font-mono text-xs outline-none focus:border-brand-500/60"
        />
      ) : (
        <div className="mx-4 mb-4 overflow-hidden rounded-lg border border-line">
          {allRows.map((row) => {
            const isGhost = row.id === ghostId;
            const set = (patch: Partial<T>) => update(row.id, patch);
            const customValue = renderValue?.(row, set);
            return (
              <div
                key={row.id}
                className={cn(
                  "group flex items-center border-b border-line last:border-b-0",
                  !row.enabled && !isGhost && "opacity-55",
                )}
              >
                <span className="flex w-8 shrink-0 justify-center">
                  {!isGhost && (
                    <Checkbox
                      checked={row.enabled}
                      onChange={(enabled) => set({ enabled } as Partial<T>)}
                      label="Enabled"
                    />
                  )}
                </span>
                <input
                  value={row.key}
                  onChange={(e) => set({ key: e.target.value } as Partial<T>)}
                  placeholder={keyPlaceholder}
                  spellCheck={false}
                  className={cn(cellInput, "flex-1 border-x border-line")}
                />
                {renderExtra && (
                  <span className="shrink-0 border-r border-line">{renderExtra(row, set)}</span>
                )}
                <span className="flex min-w-0 flex-[1.4]">
                  {customValue ?? (
                    <input
                      value={row.value}
                      onChange={(e) => set({ value: e.target.value } as Partial<T>)}
                      placeholder={valuePlaceholder}
                      spellCheck={false}
                      type={secret && !revealed ? "password" : "text"}
                      className={cellInput}
                    />
                  )}
                </span>
                {showDescription && (
                  <input
                    value={row.description ?? ""}
                    onChange={(e) => set({ description: e.target.value } as Partial<T>)}
                    placeholder="Description"
                    className={cn(
                      cellInput,
                      "hidden flex-1 border-l border-line font-sans xl:block",
                    )}
                  />
                )}
                <span className="flex w-8 shrink-0 justify-center">
                  {!isGhost && (
                    <IconButton
                      icon="trash"
                      label="Remove"
                      size={13}
                      tone="danger"
                      className="size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                    />
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
