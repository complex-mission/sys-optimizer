import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import "./ConfirmDialog.css";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
}

export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmDialogOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    resolveRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setRequest(options);
    });
  }, []);

  useEffect(
    () => () => {
      resolveRef.current?.(false);
      resolveRef.current = null;
    },
    []
  );

  const dialog = request
    ? createPortal(
        <ConfirmDialogView options={request} onClose={close} />,
        document.body
      )
    : null;

  return { confirm, dialog };
}

function ConfirmDialogView({
  options,
  onClose,
}: {
  options: ConfirmDialogOptions;
  onClose: (value: boolean) => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(false);
      if (event.key === "Tab") {
        const first = cancelRef.current;
        const last = confirmRef.current;
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="confirm-scrim" role="presentation" onMouseDown={() => onClose(false)}>
      <div
        className="confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`confirm-icon ${options.danger ? "danger" : "warning"}`}>
          <Icon name="info" size={22} />
        </div>
        <div className="confirm-content">
          <h2 id="confirm-dialog-title">{options.title}</h2>
          <p id="confirm-dialog-message">{options.message}</p>
        </div>
        <div className="confirm-actions">
          <button ref={cancelRef} className="btn-text" onClick={() => onClose(false)}>
            {options.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`btn-filled ${options.danger ? "confirm-danger" : ""}`}
            onClick={() => onClose(true)}
          >
            {options.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
