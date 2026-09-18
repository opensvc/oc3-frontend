import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface RelatedColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
  /** Colonne qui absorbe la largeur restante, typiquement une description. */
  grow?: boolean;
  /** Texte long autorisé à passer à la ligne, sans prendre la largeur restante. */
  wrap?: boolean;
}

export interface RelatedGroup<T> {
  key: string;
  label: string;
  rows: T[];
}

/**
 * Liste compacte de données rattachées à un objet, dans un panneau de détail : pas
 * de pagination ni de sélecteur de colonnes, les volumes y restent modestes. Les
 * lignes peuvent être regroupées, chaque groupe sous son intitulé et son effectif,
 * pour qu'une liste longue reste lisible d'un coup d'œil.
 */
export function RelatedTable<T>({
  columns,
  groups,
  rowKey,
  isPending,
  errorMessage,
  empty,
  caption,
}: {
  columns: RelatedColumn<T>[];
  groups: RelatedGroup<T>[];
  rowKey: (row: T) => string;
  isPending: boolean;
  errorMessage: string | null;
  /** Texte affiché quand il n'y a aucune ligne. */
  empty: string;
  /** Nom accessible du tableau. */
  caption: string;
}) {
  const { t } = useTranslation();
  if (isPending) return <p className="text-ink-muted">{t("detail.loading")}</p>;
  if (errorMessage !== null)
    return (
      <p role="alert" className="text-state-down">
        ■ {t("detail.error", { message: errorMessage })}
      </p>
    );
  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  if (total === 0) return <p className="text-ink-muted">{empty}</p>;
  const grouped = groups.length > 1;

  return (
    <table className="w-full border-collapse text-data">
      <caption className="sr-only">{caption}</caption>
      <thead className="sticky -top-3 bg-surface-raised">
        <tr className="border-b border-line text-left text-ink-muted">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`px-2 py-1 font-medium ${column.numeric === true ? "text-right" : ""} ${column.grow === true ? "w-full" : "whitespace-nowrap"}`}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      {groups.map((group) =>
        group.rows.length === 0 ? null : (
          <tbody key={group.key}>
            {grouped && (
              <tr>
                <th
                  scope="colgroup"
                  colSpan={columns.length}
                  className="bg-surface px-2 pt-3 pb-1 text-left font-semibold text-ink-muted"
                >
                  {group.label}{" "}
                  <span className="font-normal tabular-nums">({group.rows.length})</span>
                </th>
              </tr>
            )}
            {group.rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line/60 align-top last:border-b-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-2 py-1 ${column.numeric === true ? "text-right tabular-nums" : ""} ${column.grow === true || column.wrap === true ? "" : "whitespace-nowrap"}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ),
      )}
    </table>
  );
}
