import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { CloseIcon, ColumnsIcon, FilterIcon, ResetIcon, SearchIcon } from "@/components/ui/icons";
import { EnumFilter } from "@/components/ui/EnumFilter";
import { TextFilter } from "@/components/ui/TextFilter";
import { ColumnFamilyIcon, type ColumnFamily } from "./ColumnFamily";
import { toEnumValues, toTextDraft, withFilter } from "@/lib/column-filters";
import { PAGE_SIZES, visibleProps, type ResolvedListSearch } from "@/lib/list-search";
import { readProp } from "@/lib/row";

export interface ListColumn<T> {
  /** Name of the apicollector prop: used for sorting and for picking the requested columns. */
  prop: string;
  labelKey: string;
  numeric?: boolean;
  /** Subject of the column, to place it at a glance in the picker. */
  family: ColumnFamily;
  /**
   * False for a column apicollector cannot sort, for instance a joined prop: `orderby`
   * only accepts the columns of the main table.
   */
  sortable?: boolean;
  /**
   * How the column is filtered, in a list that offers filters: a text field by
   * default, a list of values for a column holding a known set, or nothing.
   */
  filter?: ColumnFilterSpec;
  render: (row: T, locale: string) => ReactNode;
}

export type ColumnFilterSpec =
  { kind: "text" } | { kind: "enum"; options: ColumnFilterOption[] } | { kind: "none" };

/**
 * Value offered by an enumerated filter. `labelKey` names it for the summary and for
 * assistive technologies; without it, the value is its own label, as for statuses
 * whose code is what the cells show.
 */
export interface ColumnFilterOption {
  value: string;
  labelKey?: string;
  /** Rendering in the list, as the cells show the value. */
  render?: ReactNode;
}

/** Metadata carried by each TanStack column, beyond what it knows itself. */
interface ColumnMeta<T> {
  column: ListColumn<T>;
}

/** The URL `sort` ("-mem_bytes,nodename") to the TanStack sorting state. */
function toSortingState(sort: string[]): SortingState {
  return sort.map((key) =>
    key.startsWith("-") ? { id: key.slice(1), desc: true } : { id: key, desc: false },
  );
}

/** And back. */
function fromSortingState(sorting: SortingState): string[] {
  return sorting.map((entry) => (entry.desc ? `-${entry.id}` : entry.id));
}

/** TanStack passes either a value or an updater function. */
function resolveUpdater<S>(updater: S | ((old: S) => S), current: S): S {
  return typeof updater === "function" ? (updater as (old: S) => S)(current) : updater;
}

/**
 * Table of a collector list, built on TanStack Table.
 *
 * Sorting, pagination and column visibility are in "manual" mode: apicollector sorts
 * and paginates, the table only carries the state. That state lives in the URL, so
 * every change goes through `onChange` rather than through a state internal to the
 * table.
 *
 * Column filters are server-side too, through apicollector's `filter` parameter: a
 * filter on a paginated list must apply to every page, not to the rows on display.
 * They live in `search.filters` rather than in TanStack's `columnFilters`, which
 * would only restate the same state. A filter on a hidden column stays active: the
 * bar above the table lists every active filter, hidden columns included, with a
 * way to clear each.
 *
 * The API does not return the total of a selection, hence an unknown `pageCount` and
 * a pagination without a page number.
 */
export function CollectorList<T>({
  columns,
  defaultCols,
  rows,
  rowId,
  search,
  onChange,
  filtersets,
  isPending,
  isFetching,
  errorMessage,
  hasMore,
  onSelectionChange,
  rowLead,
  selectAllMatching,
  filterable = false,
}: {
  columns: ListColumn<T>[];
  /** Props shown as long as the user has not chosen their columns. */
  defaultCols: string[];
  rows: T[];
  rowId: (row: T) => string | undefined;
  search: ResolvedListSearch;
  onChange: (next: Partial<ResolvedListSearch>) => void;
  filtersets: string[];
  isPending: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  hasMore: boolean;
  /**
   * Ticked rows, on every change. The selection is kept here and survives a page
   * change: `getRowId` keeps it indexed by row id, not by position.
   */
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Mark placed at the head of a row, whatever the columns on display: the freezing
   * of an object, for instance, which hiding its column must not hide.
   */
  rowLead?: (row: T) => ReactNode;
  /**
   * Ids of every row of the current selection, following pages included. Only the
   * view knows how to query its endpoint; it returns here the same selection without
   * pagination. Without this function, the header checkbox only ticks the page on
   * display.
   */
  selectAllMatching?: () => Promise<string[]>;
  /**
   * Offers a filter row under the headers. Only for views whose endpoint accepts
   * `filter` and whose page forwards `search.filters` to it.
   */
  filterable?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [columnFilter, setColumnFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // True when the selection covers every page and not just the page on display.
  const [allMatching, setAllMatching] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const picker = useRef<HTMLDetailsElement>(null);

  /**
   * Escape closes the column picker and gives the focus back to its button.
   *
   * `<details>` does not do it by itself. The listener sits on the `<details>` rather
   * than on the document: the key only acts when the focus is in the menu, and
   * propagation is stopped so that the side panel, which listens for Escape at the
   * document level, does not close at the same time.
   */
  function onPickerKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
    const element = picker.current;
    if (event.key !== "Escape" || element === null || !element.open) return;
    event.stopPropagation();
    element.open = false;
    element.querySelector<HTMLElement>("summary")?.focus();
  }

  const allProps = useMemo(() => columns.map((column) => column.prop), [columns]);
  const shown = visibleProps(search.cols, defaultCols, allProps);

  const columnDefs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => ({
        id: column.prop,
        // Without an accessor, TanStack files the column as "display" and
        // `getCanSort()` answers false: the header would no longer sort anything. The
        // value is not used for sorting — the server takes care of that — but it makes
        // the column a data column.
        accessorFn: (row) => readProp(row, column.prop),
        header: () => t(column.labelKey),
        cell: (context) => column.render(context.row.original, locale),
        enableSorting: column.sortable !== false,
        meta: { column } satisfies ColumnMeta<T>,
      })),
    [columns, t, locale],
  );

  const sorting = useMemo(() => toSortingState(search.sort), [search.sort]);
  const columnVisibility = useMemo(
    () => Object.fromEntries(allProps.map((prop) => [prop, shown.includes(prop)])),
    [allProps, shown],
  );
  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: Math.floor(search.offset / search.limit), pageSize: search.limit }),
    [search.offset, search.limit],
  );

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    onChange({ sort: fromSortingState(resolveUpdater(updater, sorting)), offset: 0 });
  };

  const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = resolveUpdater(updater, pagination);
    onChange({ offset: next.pageIndex * next.pageSize, limit: next.pageSize });
  };

  const onRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const next = resolveUpdater(updater, rowSelection);
    setRowSelection(next);
    setAllMatching(false);
    // Telling without going through an effect: the view receives the selection the
    // moment it changes, with no risk of looping on the identity of the callback.
    onSelectionChange?.(Object.keys(next).filter((id) => next[id]));
  };

  /** Ticks every row of the selection, following pages included. */
  async function selectEverything() {
    if (selectAllMatching === undefined) return;
    setSelectingAll(true);
    setSelectionError(null);
    try {
      const ids = await selectAllMatching();
      const next = Object.fromEntries(ids.map((id) => [id, true]));
      setRowSelection(next);
      setAllMatching(true);
      onSelectionChange?.(ids);
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : String(error));
    } finally {
      setSelectingAll(false);
    }
  }

  /** Sets or clears the filter of a column; the population changes, as with a filterset. */
  function setFilter(prop: string, expr: string | undefined) {
    table.resetRowSelection();
    onChange({ filters: withFilter(search.filters, prop, expr), offset: 0 });
  }

  // Every active filter, those of hidden columns included, and those a hand-made link
  // puts on a prop the view does not know: the API refuses them, and the bar is where
  // they can be cleared.
  const activeFilters = Object.entries(search.filters).map(([prop, expr]) => ({
    prop,
    expr,
    column: columns.find((column) => column.prop === prop),
  }));

  const onColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    const next = resolveUpdater(updater, columnVisibility);
    const kept = allProps.filter((prop) => next[prop] !== false);
    if (kept.length === 0) return; // the last visible column cannot be unticked
    // Hiding a column also removes its sort key: the header is the only indication of
    // the sort, and an invisible key would have no way left of being cancelled.
    const sortable = columns
      .filter((column) => column.sortable !== false && kept.includes(column.prop))
      .map((column) => column.prop);
    const sort = search.sort.filter((key) => sortable.includes(key.replace(/^-/, "")));
    onChange({
      cols: kept,
      sort: sort.length === 0 ? undefined : sort,
      offset: 0,
    });
  };

  const table = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting, columnVisibility, pagination, rowSelection },
    getRowId: (row, index) => rowId(row) ?? String(index),
    getCoreRowModel: getCoreRowModel(),
    // The server sorts and paginates; the table only reflects the state.
    manualSorting: true,
    manualPagination: true,
    // By default TanStack starts descending on columns whose first value is a number:
    // the first click would not have the same meaning from one column to the next. We
    // keep the order from before the migration, ascending then descending.
    sortDescFirst: false,
    // apicollector does not return the total of a selection: the number of pages is unknown.
    pageCount: -1,
    enableRowSelection: true,
    onSortingChange,
    onPaginationChange,
    onColumnVisibilityChange,
    onRowSelectionChange,
  });

  const from = rows.length === 0 ? 0 : search.offset + 1;
  const to = search.offset + rows.length;
  const needle = columnFilter.trim().toLowerCase();
  const pickerColumns = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        needle === "" ||
        t(getMeta(column.columnDef).column.labelKey).toLowerCase().includes(needle),
    );
  const sortableSomewhere = columns.some((column) => column.sortable !== false);
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;
  const pageFullySelected = rows.length > 0 && table.getIsAllPageRowsSelected();
  // Offering to extend the selection only makes sense while pages remain to cover.
  const canSelectEverything =
    selectAllMatching !== undefined && pageFullySelected && !allMatching && hasMore;

  /**
   * The header checkbox walks through three states: the page, then the whole
   * selection while pages remain, then nothing.
   */
  function onToggleAll() {
    if (!pageFullySelected) {
      table.toggleAllPageRowsSelected(true);
    } else if (canSelectEverything) {
      void selectEverything();
    } else {
      table.resetRowSelection();
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-ink-muted" htmlFor="list-filterset">
          {t("list.filterset")}
          <select
            id="list-filterset"
            value={search.fset}
            onChange={(event) => {
              // The filter changes the population: what was ticked is not necessarily
              // part of it any more, and "every page" would no longer speak of the same
              // whole.
              table.resetRowSelection();
              onChange({ fset: event.target.value, offset: 0, sel: undefined });
            }}
            className="h-7 rounded-(--radius-control) border border-line bg-surface px-1 text-ink"
          >
            <option value="">{t("list.noFilterset")}</option>
            {filtersets.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1 text-ink-muted" htmlFor="list-page-size">
          {t("list.perPage")}
          <select
            id="list-page-size"
            value={search.limit}
            onChange={(event) => {
              table.setPageSize(Number(event.target.value));
            }}
            className="h-7 rounded-(--radius-control) border border-line bg-surface px-1 text-ink"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <details ref={picker} onKeyDown={onPickerKeyDown} className="relative">
          <summary className="flex h-7 cursor-pointer list-none items-center gap-1.5 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink">
            <ColumnsIcon />
            {t("list.columns", { shown: shown.length, total: columns.length })}
          </summary>
          <div className="absolute z-20 mt-1 w-72 rounded-(--radius-panel) border border-line bg-surface-raised p-2 shadow-lg">
            {/* A view may offer dozens of columns: without a filter, the list
                becomes impractical. */}
            <div className="mb-2 flex h-7 items-center gap-1.5 rounded-(--radius-control) border border-line bg-surface px-2 text-ink-muted">
              <SearchIcon />
              <input
                type="search"
                value={columnFilter}
                onChange={(event) => {
                  setColumnFilter(event.target.value);
                }}
                placeholder={t("list.filterColumns")}
                aria-label={t("list.filterColumns")}
                className="w-full bg-transparent text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {pickerColumns.map((column) => {
                const meta = getMeta(column.columnDef).column;
                const checked = column.getIsVisible();
                return (
                  <li key={column.id}>
                    <label className="flex items-center gap-2 py-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        // The last visible column cannot be unticked.
                        disabled={checked && shown.length === 1}
                        onChange={column.getToggleVisibilityHandler()}
                      />
                      <ColumnFamilyIcon family={meta.family} />
                      {t(meta.labelKey)}
                      {search.filters[meta.prop] !== undefined && (
                        <span title={t("list.filters.active")} className="ml-auto text-accent">
                          <FilterIcon className="h-3 w-3" />
                          <span className="sr-only">{t("list.filters.active")}</span>
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() => {
                onChange({ cols: undefined });
              }}
              className="mt-2 flex h-7 w-full items-center justify-center gap-1.5 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink"
            >
              <ResetIcon />
              {t("list.resetColumns")}
            </button>
          </div>
        </details>

        {selectedCount > 0 && (
          <span className="flex items-center gap-2 text-ink">
            {allMatching
              ? t("list.selectedEverywhere", { count: selectedCount })
              : t("list.selected", { count: selectedCount })}
            {canSelectEverything && (
              // A second click on the header checkbox does the same, but nothing
              // announces it: this button makes the extension visible.
              <button
                type="button"
                disabled={selectingAll}
                onClick={() => {
                  void selectEverything();
                }}
                className="h-7 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink disabled:opacity-60"
              >
                {selectingAll ? t("list.selectingEverything") : t("list.selectEverything")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                table.resetRowSelection();
              }}
              className="h-7 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink"
            >
              {t("list.clearSelection")}
            </button>
          </span>
        )}

        <span aria-live="polite" className="ml-auto text-ink-muted">
          {isFetching ? t("list.loading") : t("list.range", { from, to })}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
            }}
            className="h-7 rounded-(--radius-control) border border-line px-2 disabled:opacity-40"
          >
            {t("list.previous")}
          </button>
          <button
            type="button"
            // `pageCount` being unknown, it is the extra row asked of the server that
            // says whether a page remains, not the table.
            disabled={!hasMore}
            onClick={() => {
              table.nextPage();
            }}
            className="h-7 rounded-(--radius-control) border border-line px-2 disabled:opacity-40"
          >
            {t("list.next")}
          </button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-ink-muted">
            <FilterIcon className="h-3.5 w-3.5" />
            {t("list.filters.title")}
          </span>
          <ul className="contents">
            {activeFilters.map(({ prop, expr, column }) => {
              const hidden = !shown.includes(prop);
              const label = column === undefined ? prop : t(column.labelKey);
              return (
                <li
                  key={prop}
                  className={`flex h-6 items-center gap-1 rounded-(--radius-control) border bg-surface-raised pl-1.5 ${
                    hidden ? "border-dashed border-line-strong" : "border-line"
                  }`}
                >
                  {column !== undefined && <ColumnFamilyIcon family={column.family} />}
                  <span className="text-ink-muted">{label}</span>
                  {column?.filter?.kind === "enum" ? (
                    <span className="text-ink">{describeFilter(column, expr, t)}</span>
                  ) : (
                    <code className="text-data text-ink">{describeFilter(column, expr, t)}</code>
                  )}
                  {hidden && (
                    <span className="text-ink-muted italic">
                      {column === undefined ? t("list.filters.unknown") : t("list.filters.hidden")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setFilter(prop, undefined);
                    }}
                    aria-label={t("list.filters.clearOne", { column: label })}
                    title={t("list.filters.clearOne", { column: label })}
                    className="flex h-full items-center px-1 text-ink-muted hover:text-ink"
                  >
                    <CloseIcon className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              table.resetRowSelection();
              onChange({ filters: {}, offset: 0 });
            }}
            className="flex h-6 items-center gap-1 rounded-(--radius-control) border border-line px-2 text-ink-muted hover:text-ink"
          >
            <ResetIcon className="h-3.5 w-3.5" />
            {t("list.filters.clearAll", { count: activeFilters.length })}
          </button>
        </div>
      )}

      {selectionError !== null && (
        <p role="alert" className="mb-2 text-state-down">
          ■ {selectionError}
        </p>
      )}

      {sortableSomewhere && <p className="mb-2 text-ink-muted">{t("list.sortHint")}</p>}

      {errorMessage !== null && (
        <p role="alert" className="text-state-down">
          ■ {t("list.error", { message: errorMessage })}
        </p>
      )}

      {isPending && <p className="text-ink-muted">{t("list.loading")}</p>}

      {!filterable && !isPending && errorMessage === null && rows.length === 0 && (
        <p className="text-ink-muted">{t("list.empty")}</p>
      )}

      {/* A filterable list keeps its table when nothing matches: the filter row is
          where the filter that emptied it gets changed. */}
      {(rows.length > 0 || (filterable && !isPending)) && (
        <div className="overflow-x-auto rounded-(--radius-panel) border border-line bg-surface-raised">
          <table className="w-full border-collapse text-data">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-line text-left text-ink-muted">
                  <th scope="col" className="w-8 px-2">
                    <input
                      type="checkbox"
                      checked={table.getIsAllPageRowsSelected()}
                      ref={(element) => {
                        if (element !== null) {
                          element.indeterminate = table.getIsSomePageRowsSelected();
                        }
                      }}
                      aria-label={
                        canSelectEverything ? t("list.selectEverything") : t("list.selectAll")
                      }
                      title={canSelectEverything ? t("list.selectEverything") : t("list.selectAll")}
                      onChange={onToggleAll}
                    />
                  </th>
                  {headerGroup.headers.map((header) => {
                    const meta = getMeta(header.column.columnDef).column;
                    const sorted = header.column.getIsSorted();
                    const label = flexRender(header.column.columnDef.header, header.getContext());
                    if (!header.column.getCanSort()) {
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          className={`px-2 py-1.5 font-medium ${meta.numeric === true ? "text-right" : ""}`}
                        >
                          {label}
                        </th>
                      );
                    }
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={
                          sorted === false ? "none" : sorted === "asc" ? "ascending" : "descending"
                        }
                        className={meta.numeric === true ? "text-right" : undefined}
                      >
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="w-full px-2 py-1.5 text-left font-medium hover:text-ink"
                        >
                          {label}
                          {sorted !== false && (
                            <span aria-hidden="true">
                              {sorted === "asc" ? " ▲" : " ▼"}
                              {sorting.length > 1 && header.column.getSortIndex() + 1}
                            </span>
                          )}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              ))}
              {filterable && (
                <tr className="border-b border-line text-left">
                  <td className="w-8 px-2">
                    <span className="sr-only">{t("list.filters.title")}</span>
                  </td>
                  {table.getVisibleLeafColumns().map((column) => {
                    const meta = getMeta(column.columnDef).column;
                    return (
                      <td key={column.id} className="px-2 pb-1.5">
                        <ColumnFilterControl
                          column={meta}
                          value={search.filters[meta.prop]}
                          onChange={(expr) => {
                            setFilter(meta.prop, expr);
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              )}
            </thead>
            <tbody>
              {rows.length === 0 && errorMessage === null && (
                <tr>
                  <td colSpan={shown.length + 1} className="px-2 py-3 text-ink-muted">
                    {activeFilters.length > 0 ? t("list.filters.noMatch") : t("list.empty")}
                  </td>
                </tr>
              )}
              {table.getRowModel().rows.map((row) => {
                const id = rowId(row.original);
                const selected = id !== undefined && id === search.sel;
                return (
                  <tr
                    key={row.id}
                    // The row carries the opening of the panel, by click as by keyboard:
                    // a cell may hold its own buttons, and a button inside a button
                    // would be neither valid nor usable from the keyboard.
                    tabIndex={0}
                    aria-haspopup="dialog"
                    onClick={() => {
                      onChange({ sel: id });
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onChange({ sel: id });
                    }}
                    aria-current={selected ? "true" : undefined}
                    className={`h-(--row-height) cursor-pointer border-b border-line last:border-b-0 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-ring) ${
                      selected ? "bg-accent-soft" : ""
                    }`}
                  >
                    <td
                      className="w-8 px-2"
                      // Ticking must not open the detail panel.
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={row.getIsSelected()}
                        disabled={!row.getCanSelect()}
                        aria-label={t("list.selectRow")}
                        onChange={row.getToggleSelectedHandler()}
                      />
                    </td>
                    {row.getVisibleCells().map((cell, index) => {
                      const meta = getMeta(cell.column.columnDef).column;
                      const content = flexRender(cell.column.columnDef.cell, cell.getContext());
                      return index === 0 ? (
                        <th key={cell.id} scope="row" className="px-2 text-left font-medium">
                          <span className="inline-flex items-center gap-1.5">
                            {rowLead?.(row.original)}
                            {content}
                          </span>
                        </th>
                      ) : (
                        <td
                          key={cell.id}
                          className={meta.numeric === true ? "px-2 text-right" : "px-2"}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Reads the metadata of a column, which TanStack types as `unknown`. */
function getMeta<T>(columnDef: ColumnDef<T>): ColumnMeta<T> {
  return columnDef.meta as ColumnMeta<T>;
}

/** Filter control of a column, according to what the column declares. */
function ColumnFilterControl<T>({
  column,
  value,
  onChange,
}: {
  column: ListColumn<T>;
  value: string | undefined;
  onChange: (expr: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const label = t("list.filters.label", { column: t(column.labelKey) });
  const spec = column.filter ?? { kind: "text" };
  if (spec.kind === "none") return null;
  if (spec.kind === "enum")
    return (
      <EnumFilter
        value={value}
        onChange={onChange}
        options={spec.options.map((option) => ({
          value: option.value,
          label: optionLabel(option, t),
          render: option.render,
        }))}
        label={label}
        allLabel={t("list.filters.all")}
      />
    );
  return (
    <TextFilter
      value={value}
      onChange={onChange}
      label={label}
      regexLabel={t("list.filters.regex")}
      clearLabel={t("list.filters.clearOne", { column: t(column.labelKey) })}
      invalidLabel={(reason) => t("list.filters.invalidRegex", { reason })}
      placeholder={column.numeric === true ? t("list.filters.numberHint") : undefined}
    />
  );
}

function optionLabel(option: ColumnFilterOption, t: TFunction): string {
  return option.labelKey === undefined ? option.value : t(option.labelKey);
}

/** A filter as the bar of active filters shows it: as it was typed or chosen. */
function describeFilter<T>(column: ListColumn<T> | undefined, expr: string, t: TFunction): string {
  if (column === undefined) return expr;
  const spec = column.filter;
  if (spec?.kind === "enum") {
    const values = toEnumValues(expr);
    if (values.length > 0)
      return values
        .map((value) => {
          const option = spec.options.find((candidate) => candidate.value === value);
          return option === undefined ? value : optionLabel(option, t);
        })
        .join(", ");
  }
  const draft = toTextDraft(expr);
  return draft.regex ? `/${draft.text}/` : draft.text;
}
