import { useEffect, useId, useRef, useState, type Ref } from "react";

export interface ComboboxOption {
  value: string;
  label: string;
}

/**
 * Liste déroulante filtrable au clavier, selon le motif « combobox » de l'ARIA
 * Authoring Practices : un champ de saisie qui filtre une liste d'options.
 *
 * Écrit ici plutôt qu'importé : quelques dizaines de lignes suffisent pour un
 * filtre par sous-chaîne, et un `<select>` natif ne se filtre pas au-delà de la
 * première lettre.
 *
 * Tant que rien n'est saisi, le champ affiche l'option choisie et la liste montre
 * tout ; prendre le focus sélectionne ce texte, pour que la première frappe filtre
 * plutôt que d'allonger la valeur. Taper filtre sans tenir compte de la casse et annule le choix courant, qui
 * n'est rétabli qu'en choisissant une option : à la souris, ou avec les flèches et
 * Entrée, qui ne fait que choisir. Échap referme la liste sans remonter au panneau
 * parent ; liste fermée, Entrée soumet le formulaire englobant comme dans tout champ.
 */
export function Combobox({
  options,
  value,
  onChange,
  label,
  placeholder,
  emptyText,
  className = "",
  inputRef,
}: {
  options: ComboboxOption[];
  /** Valeur de l'option choisie, "" si aucune. */
  value: string;
  onChange: (value: string) => void;
  /** Nom accessible du champ. */
  label: string;
  placeholder?: string;
  /** Affiché dans la liste quand le filtre n'y laisse rien. */
  emptyText: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  // null : rien de saisi depuis le dernier choix, le champ montre l'option choisie.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  const selectedLabel = options.find((option) => option.value === value)?.label ?? "";
  const needle = (query ?? "").trim().toLowerCase();
  const filtered =
    needle === ""
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(needle));
  const activeIndex = Math.min(active, filtered.length - 1);
  const activeOption = open && activeIndex >= 0 ? filtered[activeIndex] : undefined;

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function choose(option: ComboboxOption) {
    onChange(option.value);
    setQuery(null);
    setOpen(false);
  }

  function optionId(index: number) {
    return `${listId}-${String(index)}`;
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOption === undefined ? undefined : optionId(activeIndex)}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={query ?? selectedLabel}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
          if (value !== "") onChange("");
        }}
        onFocus={(event) => {
          // Le champ arrive rempli de l'option choisie : la sélectionner d'emblée
          // permet de filtrer en tapant, au lieu d'allonger la valeur existante.
          event.currentTarget.select();
          setOpen(true);
        }}
        onMouseUp={(event) => {
          // Le clic pose le curseur dans le texte et défait la sélection du focus :
          // sans cela, taper accolerait le filtre à l'option déjà choisie, et la
          // liste n'aurait plus rien à montrer. C'est au relâchement, une fois le
          // curseur posé, qu'il faut resélectionner.
          if (query === null) event.currentTarget.select();
        }}
        onClick={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
        onKeyDown={(event) => {
          switch (event.key) {
            case "ArrowDown":
            case "ArrowUp": {
              event.preventDefault();
              if (!open) {
                setOpen(true);
                return;
              }
              const step = event.key === "ArrowDown" ? 1 : -1;
              setActive((filtered.length + activeIndex + step) % Math.max(filtered.length, 1));
              return;
            }
            case "Enter":
              if (activeOption !== undefined) {
                // Ce premier Entrée choisit, et rien de plus : un formulaire autour
                // du champ ne doit pas le prendre pour une validation. Le suivant,
                // liste fermée, lui revient.
                event.preventDefault();
                event.stopPropagation();
                choose(activeOption);
              }
              return;
            case "Escape":
              if (open) {
                event.stopPropagation();
                setOpen(false);
              }
              return;
          }
        }}
        className="h-7 w-full rounded-(--radius-control) border border-line bg-surface px-2"
      />
      <ul
        ref={list}
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!open}
        className="absolute top-full right-0 left-0 z-10 mt-1 max-h-60 overflow-y-auto rounded-(--radius-control) border border-line bg-surface-raised py-1 shadow-lg"
      >
        {filtered.length === 0 ? (
          <li className="px-2 py-1 text-ink-muted">{emptyText}</li>
        ) : (
          filtered.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === value}
              // Avant le blur du champ, qui refermerait la liste sous le clic.
              onMouseDown={(event) => {
                event.preventDefault();
              }}
              onMouseEnter={() => {
                setActive(index);
              }}
              onClick={() => {
                choose(option);
              }}
              className={`cursor-pointer px-2 py-1 ${index === activeIndex ? "bg-accent-soft text-ink" : ""} ${option.value === value ? "font-semibold" : ""}`}
            >
              {option.label}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
