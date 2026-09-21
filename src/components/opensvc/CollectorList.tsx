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
import { ColumnsIcon, ResetIcon, SearchIcon } from "@/components/ui/icons";
import { ColumnFamilyIcon, type ColumnFamily } from "./ColumnFamily";
import { PAGE_SIZES, visibleProps, type ResolvedListSearch } from "@/lib/list-search";
import { readProp } from "@/lib/row";

export interface ListColumn<T> {
  /** Nom du prop apicollector : sert au tri et à la sélection des colonnes demandées. */
  prop: string;
  labelKey: string;
  numeric?: boolean;
  /** Sujet de la colonne, pour la situer d'un coup d'œil dans le sélecteur. */
  family: ColumnFamily;
  /**
   * Faux pour une colonne qu'apicollector ne sait pas trier, par exemple un prop
   * joint : `orderby` n'accepte que les colonnes de la table principale.
   */
  sortable?: boolean;
  render: (row: T, locale: string) => ReactNode;
}

/** Métadonnées portées par chaque colonne TanStack, au-delà de ce qu'elle connaît. */
interface ColumnMeta<T> {
  column: ListColumn<T>;
}

/** `sort` de l'URL (« -mem_bytes,nodename ») vers l'état de tri de TanStack. */
function toSortingState(sort: string[]): SortingState {
  return sort.map((key) =>
    key.startsWith("-") ? { id: key.slice(1), desc: true } : { id: key, desc: false },
  );
}

/** Et retour. */
function fromSortingState(sorting: SortingState): string[] {
  return sorting.map((entry) => (entry.desc ? `-${entry.id}` : entry.id));
}

/** TanStack passe soit une valeur, soit une fonction de mise à jour. */
function resolveUpdater<S>(updater: S | ((old: S) => S), current: S): S {
  return typeof updater === "function" ? (updater as (old: S) => S)(current) : updater;
}

/**
 * Table d'une liste du collector, bâtie sur TanStack Table.
 *
 * Tri, pagination et visibilité des colonnes sont en mode « manuel » : c'est
 * apicollector qui trie et pagine, la table ne fait que porter l'état. Cet état vit
 * dans l'URL, donc chaque changement repasse par `onChange` plutôt que par un état
 * interne à la table.
 *
 * Deux limites viennent de l'API et non de la table : elle ne renvoie pas le total
 * d'une sélection, d'où un `pageCount` inconnu et une pagination sans numéro de page ;
 * et elle n'accepte aucun filtre ad hoc, donc le filtrage de TanStack reste inutilisé.
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
}: {
  columns: ListColumn<T>[];
  /** Props affichés tant que l'utilisateur n'a pas choisi ses colonnes. */
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
   * Lignes cochées, à chaque changement. La sélection est tenue ici et survit au
   * changement de page : `getRowId` la garde indexée par identifiant de ligne, pas
   * par position.
   */
  onSelectionChange?: (ids: string[]) => void;
  /**
   * Marque placée en tête de ligne, quelles que soient les colonnes affichées : le
   * gel d'un objet, par exemple, que masquer sa colonne ne doit pas cacher.
   */
  rowLead?: (row: T) => ReactNode;
  /**
   * Identifiants de toutes les lignes de la sélection courante, pages suivantes
   * comprises. Seule la vue sait interroger son endpoint ; elle renvoie ici la même
   * sélection sans pagination. Sans cette fonction, la case d'en-tête ne coche que
   * la page affichée.
   */
  selectAllMatching?: () => Promise<string[]>;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [columnFilter, setColumnFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  // Vrai quand la sélection couvre toutes les pages et non la seule page affichée.
  const [allMatching, setAllMatching] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const picker = useRef<HTMLDetailsElement>(null);

  /**
   * Échap referme le sélecteur de colonnes et rend le focus à son bouton.
   *
   * `<details>` ne le fait pas de lui-même. L'écoute est posée sur le `<details>`
   * plutôt que sur le document : la touche n'agit que si le focus est dans le menu,
   * et la propagation est arrêtée pour que le panneau latéral, qui écoute Échap au
   * niveau du document, ne se referme pas en même temps.
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
        // Sans accesseur, TanStack classe la colonne en « display » et
        // `getCanSort()` répond faux : l'en-tête ne trierait plus rien. La valeur
        // n'est pas utilisée pour trier — le serveur s'en charge — mais elle fait
        // de la colonne une colonne de données.
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
    // Prévenir sans passer par un effet : la vue reçoit la sélection à l'instant
    // où elle change, sans risque de boucle sur l'identité du rappel.
    onSelectionChange?.(Object.keys(next).filter((id) => next[id]));
  };

  /** Coche toutes les lignes de la sélection, pages suivantes comprises. */
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

  const onColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    const next = resolveUpdater(updater, columnVisibility);
    const kept = allProps.filter((prop) => next[prop] !== false);
    if (kept.length === 0) return; // la dernière colonne visible ne se décoche pas
    // Masquer une colonne retire aussi sa clé de tri : l'en-tête est la seule
    // indication du tri, une clé invisible n'aurait plus de moyen d'être annulée.
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
    // Le serveur trie et pagine ; la table ne fait que refléter l'état.
    manualSorting: true,
    manualPagination: true,
    // Par défaut TanStack part en descendant sur les colonnes dont la première
    // valeur est un nombre : le premier clic n'aurait pas le même sens selon la
    // colonne. On garde l'ordre d'avant la migration, ascendant puis descendant.
    sortDescFirst: false,
    // apicollector ne renvoie pas le total d'une sélection : le nombre de pages est inconnu.
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
  // Proposer d'étendre la sélection n'a de sens que s'il reste des pages à couvrir.
  const canSelectEverything =
    selectAllMatching !== undefined && pageFullySelected && !allMatching && hasMore;

  /**
   * La case d'en-tête parcourt trois états : la page, puis toute la sélection quand
   * il reste des pages, puis plus rien.
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
              // Le filtre change la population : ce qui était coché n'en fait plus
              // forcément partie, et « toutes pages » ne parlerait plus du même tout.
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
            {/* Une vue peut proposer des dizaines de colonnes : sans filtre, la liste
                devient impraticable. */}
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
                        // La dernière colonne visible ne peut pas être décochée.
                        disabled={checked && shown.length === 1}
                        onChange={column.getToggleVisibilityHandler()}
                      />
                      <ColumnFamilyIcon family={meta.family} />
                      {t(meta.labelKey)}
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
              // Un second clic sur la case d'en-tête fait la même chose, mais rien ne
              // l'annonce : ce bouton rend l'extension visible.
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
            // `pageCount` étant inconnu, c'est la ligne d'avance demandée au serveur
            // qui dit s'il reste une page, pas la table.
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

      {!isPending && errorMessage === null && rows.length === 0 && (
        <p className="text-ink-muted">{t("list.empty")}</p>
      )}

      {rows.length > 0 && (
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
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => {
                const id = rowId(row.original);
                const selected = id !== undefined && id === search.sel;
                return (
                  <tr
                    key={row.id}
                    // La ligne porte l'ouverture du panneau, au clic comme au clavier :
                    // une cellule peut contenir ses propres boutons, et un bouton dans
                    // un bouton ne serait ni valide ni utilisable au clavier.
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
                      // Cocher ne doit pas ouvrir le panneau de détail.
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

/** Récupère les métadonnées d'une colonne, que TanStack type en `unknown`. */
function getMeta<T>(columnDef: ColumnDef<T>): ColumnMeta<T> {
  return columnDef.meta as ColumnMeta<T>;
}
