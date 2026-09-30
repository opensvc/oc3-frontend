import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FlashRow } from "./Flash";

export interface RelatedColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  numeric?: boolean;
  /** Column that takes the remaining width, typically a description. */
  grow?: boolean;
  /** Long text allowed to wrap, without taking the remaining width. */
  wrap?: boolean;
}

export interface RelatedGroup<T> {
  key: string;
  label: string;
  rows: T[];
}

/**
 * Compact list of data attached to an object, in a detail panel: no pagination nor
 * column picker, the volumes stay modest there. Rows may be grouped, each group under
 * its heading and its count, so that a long list stays readable at a glance.
 */
export function RelatedTable<T>({
  columns,
  groups,
  rowKey,
  isPending,
  errorMessage,
  empty,
  caption,
  headerTop,
}: {
  columns: RelatedColumn<T>[];
  groups: RelatedGroup<T>[];
  rowKey: (row: T) => string;
  isPending: boolean;
  errorMessage: string | null;
  /** Text shown when there is no row. */
  empty: string;
  /** Accessible name of the table. */
  caption: string;
  /**
   * Offset of the sticky header row, a CSS length, when something else sticks
   * above the table in the panel.
   */
  headerTop?: string;
}) {
  const { t } = useTranslation();
  // True once the table has shown its rows: a row mounted afterwards is one the
  // collector gained, not the first display.
  const shownOnce = useRef(false);
  useEffect(() => {
    if (!isPending) shownOnce.current = true;
  }, [isPending]);
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
      <thead
        className="sticky -top-3 bg-surface-raised"
        style={headerTop === undefined ? undefined : { top: headerTop }}
      >
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
              // A live update changing the row, or bringing it, flashes it.
              <FlashRow
                key={rowKey(row)}
                signature={JSON.stringify(row)}
                appear={shownOnce.current}
                className="border-b border-line/60 align-top last:border-b-0"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-2 py-1 ${column.numeric === true ? "text-right tabular-nums" : ""} ${column.grow === true || column.wrap === true ? "" : "whitespace-nowrap"}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </FlashRow>
            ))}
          </tbody>
        ),
      )}
    </table>
  );
}
