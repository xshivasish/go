import { useEffect, useRef, useState } from "react";
import type { Toast } from "../types";

const TOAST_DURATION_MS = 4500;

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const counter = useRef(0);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showSuccess(text: string) {
    counter.current += 1;
    setToast({ key: counter.current, type: "success", text });
  }

  function showError(text: string) {
    counter.current += 1;
    setToast({ key: counter.current, type: "error", text });
  }

  function dismissToast() {
    setToast(null);
  }

  return { toast, showSuccess, showError, dismissToast };
}
