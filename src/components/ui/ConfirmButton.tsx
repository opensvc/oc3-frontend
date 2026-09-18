import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Bouton d'action irréversible : le premier clic arme, le second confirme.
 * Deux étapes plutôt qu'une fenêtre modale, pour rester au clavier et sans
 * piège de focus. Le bouton de confirmation prend le focus dès l'armement,
 * ce qui énonce la question aux lecteurs d'écran.
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
  /** Visuel placé avant le libellé du bouton d'armement. */
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
