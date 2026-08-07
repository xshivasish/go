import { useState } from "react";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmState = ConfirmOptions & { resolve: (value: boolean) => void };

/** Imperative replacement for window.confirm() that renders through <ConfirmDialog />. */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  function confirm(options: ConfirmOptions) {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  return { confirmState: state, confirm, handleConfirm, handleCancel };
}
