import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Button for an irreversible action: the first click arms it, the second confirms.
 * Two steps rather than a modal window, to stay on the keyboard and without a focus
 * trap. The confirm button takes the focus as soon as it is armed, which reads the
 * question out to screen readers.
 */
export function ConfirmButton({
  label,
  question,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  pending = false,
  icon,
  onConfirm,
}: {
  label: string;
  question: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  pending?: boolean;
  /** Visual placed before the label of the arming button. */
  icon?: ReactNode;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const confirm = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (armed) confirm.current?.focus();
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => {
          setArmed(true);
        }}
        className="flex h-8 items-center gap-2 rounded-(--radius-control) border border-line px-3 font-medium text-state-down"
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <div role="group" aria-label={question}>
      <p className="mb-2">{question}</p>
      <div className="flex gap-2">
        <button
          ref={confirm}
          type="button"
          disabled={pending}
          onClick={onConfirm}
          className="h-8 rounded-(--radius-control) bg-state-down px-3 font-medium text-surface-raised disabled:opacity-60"
        >
          {pending ? pendingLabel : confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            setArmed(false);
          }}
          className="h-8 rounded-(--radius-control) border border-line px-3"
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
