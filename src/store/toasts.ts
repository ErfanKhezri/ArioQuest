import { create } from "zustand";
import { uid } from "@/lib/id";

export interface Toast {
  id: string;
  kind: "info" | "success" | "error";
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: Toast["kind"], message: string) => void;
  dismiss: (id: string) => void;
}

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (kind, message) => {
    const id = uid("t");
    set({ toasts: [...get().toasts, { id, kind, message }].slice(-4) });
    setTimeout(() => get().dismiss(id), kind === "error" ? 7000 : 3500);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const notify = {
  info: (message: string) => useToasts.getState().push("info", message),
  success: (message: string) => useToasts.getState().push("success", message),
  error: (message: string) => useToasts.getState().push("error", message),
};
