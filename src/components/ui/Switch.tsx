/**
 * Interrupteur pour une valeur booléenne.
 *
 * L'état se lit à la position du curseur autant qu'à la couleur, et `role="switch"`
 * avec `aria-checked` le restitue aux technologies d'assistance : il ne repose donc
 * pas sur la seule couleur. Désactivé, il reste lisible et sert d'affichage.
 */
export function Switch({
  checked,
  label,
  stateLabel,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  /** Nom de la propriété, pour l'étiquette accessible. */
  label: string;
  /** Libellé de l'état courant, annoncé et affiché en infobulle. */
  stateLabel: string;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label} : ${stateLabel}`}
      title={stateLabel}
      disabled={disabled}
      onClick={() => {
        onChange?.(!checked);
      }}
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:opacity-60 ${
        checked ? "border-accent bg-accent" : "border-line bg-surface-sunken"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-3.5 w-3.5 rounded-full transition-transform ${
          checked
            ? "translate-x-[1.125rem] bg-accent-ink"
            : "translate-x-[0.1875rem] bg-line-strong"
        }`}
      />
    </button>
  );
}
