import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  ariaLabel: string;
};

/** Shared overlay: backdrop blur, ESC-to-close, click-outside-to-close, body scroll lock. */
export function Modal({ onClose, children, panelClassName = "", ariaLabel }: ModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`modalPanel ${panelClassName}`}>
        <button className="modalCloseButton" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2.25} />
        </button>
        {children}
      </div>
    </div>
  );
}
