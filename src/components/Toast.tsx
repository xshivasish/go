import { CheckCircle2, X, XCircle } from "lucide-react";
import type { Toast as ToastData } from "../types";

type ToastProps = {
  toast: ToastData | null;
  onDismiss: () => void;
};

/** Floating, auto-dismissing notification. Replaces the old static message banner. */
export function ToastViewport({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  return (
    <div className="toastViewport">
      <div
        key={toast.key}
        className={`toastCard ${toast.type === "success" ? "toastSuccess" : "toastError"}`}
        role="status"
      >
        {toast.type === "success" ? (
          <CheckCircle2 size={18} strokeWidth={2.25} />
        ) : (
          <XCircle size={18} strokeWidth={2.25} />
        )}
        <span>{toast.text}</span>
        <button aria-label="Dismiss" onClick={onDismiss}>
          <X size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
