import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";
import type { ConfirmOptions } from "../hooks/useConfirm";

type ConfirmDialogProps = ConfirmOptions & {
  onConfirm: () => void;
  onCancel: () => void;
};

/** Themed replacement for window.confirm(), used for destructive actions. */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal onClose={onCancel} panelClassName="confirmPanel" ariaLabel={title}>
      <div className={`confirmIcon ${danger ? "confirmIconDanger" : ""}`}>
        <AlertTriangle size={22} strokeWidth={2.25} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="confirmActions">
        <button className="outlineButton" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button className={danger ? "dangerButton" : "primaryButton"} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
