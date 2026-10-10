import type { FileData } from "@/core/types";
import { invokeCommand, isTauri } from "./tauri";

export async function readFileData(file: File): Promise<FileData> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buffer.length; i += chunk) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunk));
  }
  return {
    name: file.name,
    base64: btoa(binary),
    contentType: file.type || undefined,
    size: file.size,
  };
}

/** Opens a native file picker and resolves with the chosen files. */
export function pickFiles(
  options: { accept?: string; multiple?: boolean; directory?: boolean } = {},
): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (options.accept) input.accept = options.accept;
    input.multiple = options.multiple ?? false;
    if (options.directory) input.setAttribute("webkitdirectory", "");
    input.onchange = () => resolve(Array.from(input.files ?? []));
    input.oncancel = () => resolve([]);
    input.click();
  });
}

/** Saves text through the OS save dialog (desktop) or a download (browser). */
export async function saveTextFile(defaultName: string, contents: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!path) return false;
    await invokeCommand("write_text_file", { path, contents });
    return true;
  }
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export const formatDuration = (ms: number): string =>
  ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;

export const safeFileName = (name: string) =>
  name.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "export";
