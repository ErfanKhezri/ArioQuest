/** Short random id, unique enough for client-side entities. */
export function uid(prefix = ""): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  const body = Array.from(bytes, (b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 14);
  return prefix ? `${prefix}_${body}` : body;
}

export function uuid(): string {
  return crypto.randomUUID();
}
