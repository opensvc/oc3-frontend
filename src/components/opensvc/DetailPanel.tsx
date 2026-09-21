import { useState, type KeyboardEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SlideOver } from "@/components/ui/SlideOver";
import { CheckIcon, CloseIcon, PencilIcon } from "@/components/ui/icons";
import { Switch } from "@/components/ui/Switch";
import { ObjectIcon, type ObjectKind } from "./ObjectIcon";
import { ColumnFamilyIcon, type ColumnFamily } from "./ColumnFamily";
import { readPropAsString } from "@/lib/row";
import { problemText } from "@/lib/api/problem";

export interface DetailField<T> {
  /** Nom du prop apicollector : sert de clé de libellé et de clé React. */
  prop: string;
  format: (row: T, locale: string) => string | undefined;
  /**
   * Vrai pour un attribut que l'utilisateur peut fixer. N'y figurent que ceux que la
   * remontée d'inventaire de l'agent n'écrase pas : modifier les autres ne tiendrait
   * que jusqu'à la remontée suivante.
   */
  editable?: boolean;
  /**
   * Nature de la saisie ; « text » par défaut. Elle détermine aussi le type envoyé :
   * le corps de l'API attend un entier pour `power_supply_nb` et un booléen pour
   * `notifications`, et refuse la chaîne équivalente.
   */
  input?: "text" | "date" | "number" | "boolean";
}

export interface DetailGroup<T> {
  key: string;
  /** Sujet du groupe, dans le vocabulaire des familles de colonnes. */
  family: ColumnFamily;
  fields: DetailField<T>[];
}

/**
 * Graphies booléennes du collector : « T » / « F » le plus souvent, 0 / 1 pour les
 * `tinyint` et certains `varchar(1)`. Une autre valeur s'affiche en texte : mieux vaut
 * la montrer telle quelle que la ranger d'office du côté « non ».
 */
const TRUE_SPELLINGS = new Set(["T", "1"]);
const FALSE_SPELLINGS = new Set(["F", "0"]);

function readBoolean(raw: string): boolean | undefined {
  if (TRUE_SPELLINGS.has(raw)) return true;
  if (FALSE_SPELLINGS.has(raw)) return false;
  return undefined;
}

/** Valeur envoyée à l'API, dans le type que son corps attend. */
function toPayload(input: DetailField<unknown>["input"], value: string): string | number | boolean {
  if (input === "boolean") return value === "true";
  if (input === "number") return value === "" ? 0 : Number(value);
  return value;
}

/**
 * Le collector stocke ses dates en « AAAA-MM-JJ hh:mm:ss » ; un champ de type date
 * n'accepte que la partie calendaire.
 */
function toDateInput(value: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : "";
}

interface DetailContentProps<T> {
  groups: DetailGroup<T>[];
  row: T | null | undefined;
  /** Espace de noms i18n des libellés de propriétés, ex. "services.fields". */
  labelPrefix: string;
  /** Espace de noms i18n des titres de groupes, ex. "services.detail.groups". */
  groupPrefix: string;
  isPending: boolean;
  errorMessage: string | null;
  /** Actions portant sur l'objet affiché, par exemple sa suppression. */
  actions?: ReactNode;
  /** Enregistre une propriété. Rejette pour signaler un refus du serveur. */
  onSave?: (changes: Record<string, string | number | boolean>) => Promise<void>;
  /**
   * Note affichée sous les propriétés quand la modification est possible. Par défaut,
   * celle des nodes, dont une partie des attributs vient de l'agent ; chaque objet
   * dont la règle diffère fournit la sienne.
   */
  editHint?: string;
}

/**
 * Propriétés d'un objet du collector, en groupes de listes de définitions, sans
 * cadre : le tiroir de `DetailPanel` et les pages pleines comme le profil les
 * posent chacun dans leur mise en page. Le chargement est fait par l'appelant, qui
 * seul connaît son endpoint.
 *
 * Quand `onSave` est fourni, les attributs marqués modifiables portent un crayon au
 * survol, qui bascule cette seule propriété en saisie.
 */
export function DetailContent<T>({
  groups,
  row,
  labelPrefix,
  groupPrefix,
  isPending,
  errorMessage,
  actions,
  onSave,
  editHint,
}: DetailContentProps<T>) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canEdit = onSave !== undefined && row !== null && row !== undefined;

  function startEditing(field: DetailField<T>) {
    if (row === null || row === undefined) return;
    const raw = readPropAsString(row, field.prop);
    setSaveError(null);
    setEditing(field.prop);
    setValue(field.input === "date" ? toDateInput(raw) : raw);
  }

  function cancel() {
    setEditing(null);
    setSaveError(null);
  }

  /** Bascule immédiate d'un booléen : l'interrupteur est déjà la commande. */
  async function toggleBoolean(field: DetailField<T>, next: boolean) {
    if (onSave === undefined) return;
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ [field.prop]: next });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : problemText(error));
    } finally {
      setSaving(false);
    }
  }

  async function commit(field: DetailField<T>) {
    if (row === null || row === undefined || onSave === undefined) return;
    const before =
      field.input === "date"
        ? toDateInput(readPropAsString(row, field.prop))
        : readPropAsString(row, field.prop);
    if (value === before) {
      cancel();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave({ [field.prop]: toPayload(field.input, value) });
      setEditing(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : problemText(error));
    } finally {
      setSaving(false);
    }
  }

  function onFieldKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    field: DetailField<T>,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void commit(field);
    } else if (event.key === "Escape") {
      // Le panneau écoute Échap au niveau du document : sans cela, annuler une
      // saisie refermerait aussi le panneau.
      event.stopPropagation();
      cancel();
    }
  }

  return (
    <>
      {isPending && <p className="text-ink-muted">{t("detail.loading")}</p>}

      {errorMessage !== null && (
        <p role="alert" className="text-state-down">
          ■ {t("detail.error", { message: errorMessage })}
        </p>
      )}

      {row === null && !isPending && <p className="text-ink-muted">{t("detail.missing")}</p>}

      {row !== null && row !== undefined && (
        <div className="flex flex-col gap-4">
          {groups.map((group) => {
            // Les colonnes vides du collector sont légion : on ne montre que ce qui est
            // renseigné. Un attribut modifiable reste visible même vide, sans quoi il
            // n'y aurait rien à survoler pour le remplir.
            const entries = group.fields
              .map((field) => ({ field, value: field.format(row, locale) }))
              .filter(
                (entry) =>
                  (canEdit && entry.field.editable === true) ||
                  (entry.value !== undefined && entry.value !== ""),
              );
            if (entries.length === 0) return null;
            return (
              <section key={group.key}>
                <h3 className="mb-1 flex items-center gap-2 font-semibold text-ink-muted">
                  <ColumnFamilyIcon family={group.family} />
                  {t(`${groupPrefix}.${group.key}`)}
                </h3>
                <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-3 gap-y-1 text-data">
                  {entries.map(({ field, value: shown }) => {
                    const label = t(`${labelPrefix}.${field.prop}`);
                    const isEditing = editing === field.prop;
                    const state =
                      field.input !== "boolean"
                        ? undefined
                        : readBoolean(readPropAsString(row, field.prop));
                    // Un booléen modifiable garde son interrupteur même vide : l'absence
                    // de valeur vaut « non », et c'est l'interrupteur qui permet de la fixer.
                    const isBoolean =
                      field.input === "boolean" && (state !== undefined || field.editable === true);
                    const checked = state === true;
                    return (
                      <div key={field.prop} className="group contents">
                        <dt className="text-ink-muted">{label}</dt>
                        <dd className="flex min-w-0 items-center gap-1 break-words">
                          {isBoolean ? (
                            <Switch
                              checked={checked}
                              label={label}
                              stateLabel={checked ? t("detail.yes") : t("detail.no")}
                              disabled={saving || !canEdit || field.editable !== true}
                              onChange={(next) => {
                                void toggleBoolean(field, next);
                              }}
                            />
                          ) : isEditing ? (
                            <>
                              {field.input === "boolean" ? (
                                <select
                                  autoFocus
                                  value={value}
                                  aria-label={label}
                                  disabled={saving}
                                  onChange={(event) => {
                                    setValue(event.target.value);
                                  }}
                                  onKeyDown={(event) => {
                                    onFieldKeyDown(event, field);
                                  }}
                                  className="h-7 min-w-0 flex-1 rounded-(--radius-control) border border-line bg-surface px-2"
                                >
                                  <option value="true">{t("detail.yes")}</option>
                                  <option value="false">{t("detail.no")}</option>
                                </select>
                              ) : (
                                <input
                                  autoFocus
                                  type={
                                    field.input === "date"
                                      ? "date"
                                      : field.input === "number"
                                        ? "number"
                                        : "text"
                                  }
                                  value={value}
                                  aria-label={label}
                                  disabled={saving}
                                  onChange={(event) => {
                                    setValue(event.target.value);
                                  }}
                                  onKeyDown={(event) => {
                                    onFieldKeyDown(event, field);
                                  }}
                                  className="h-7 min-w-0 flex-1 rounded-(--radius-control) border border-line bg-surface px-2"
                                />
                              )}
                              <button
                                type="button"
                                disabled={saving}
                                title={t("detail.save")}
                                onClick={() => {
                                  void commit(field);
                                }}
                                className="text-ink-muted hover:text-ink disabled:opacity-60"
                              >
                                <CheckIcon />
                                <span className="sr-only">{t("detail.save")}</span>
                              </button>
                              <button
                                type="button"
                                title={t("detail.cancel")}
                                onClick={cancel}
                                className="text-ink-muted hover:text-ink"
                              >
                                <CloseIcon />
                                <span className="sr-only">{t("detail.cancel")}</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="min-w-0 flex-1">
                                {shown === undefined || shown === "" ? (
                                  <span className="text-ink-muted">—</span>
                                ) : (
                                  shown
                                )}
                              </span>
                              {canEdit && field.editable === true && (
                                // Invisible au repos mais présent et focusable : le
                                // crayon reste atteignable au clavier.
                                <button
                                  type="button"
                                  title={t("detail.editField", { field: label })}
                                  onClick={() => {
                                    startEditing(field);
                                  }}
                                  className="text-ink-muted opacity-0 group-hover:opacity-100 hover:text-ink focus-visible:opacity-100"
                                >
                                  <PencilIcon />
                                  <span className="sr-only">
                                    {t("detail.editField", { field: label })}
                                  </span>
                                </button>
                              )}
                            </>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </section>
            );
          })}

          {saveError !== null && (
            <p role="alert" className="text-state-down">
              ■ {saveError}
            </p>
          )}

          {canEdit && <p className="text-ink-muted">{editHint ?? t("detail.editHint")}</p>}
        </div>
      )}

      {actions !== undefined && row !== null && row !== undefined && (
        <div className="mt-4 border-t border-line pt-3">{actions}</div>
      )}
    </>
  );
}

/**
 * Panneau de détail d'un objet du collector : ses propriétés dans un tiroir latéral.
 */
export function DetailPanel<T>({
  open,
  title,
  onClose,
  kind,
  isPending,
  before,
  ...content
}: DetailContentProps<T> & {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Type d'objet, pour rappeler en tête de panneau d'où vient la ligne. */
  kind: ObjectKind;
  /** Contenu placé avant les propriétés, comme les tags de l'objet. */
  before?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <SlideOver
      open={open}
      title={title}
      onClose={onClose}
      closeLabel={t("detail.close")}
      leading={<ObjectIcon kind={kind} />}
    >
      {before}
      {/* Une requête désactivée reste « en attente » : panneau fermé, rien à charger. */}
      <DetailContent {...content} isPending={open && isPending} />
    </SlideOver>
  );
}
