/**
 * État d'URL commun aux vues « liste du collector » : tri, pagination, filterset,
 * colonnes visibles et ligne sélectionnée. La grille « définition de terminé »
 * demande que ces états soient partageables par simple lien.
 *
 * Deux formes coexistent volontairement :
 *
 * - `ListSearch` est ce qui transite par l'URL. Uniquement des scalaires : le
 *   routeur sérialise toute valeur non primitive en JSON, ce qui donnerait des
 *   liens comme `?sort=%5B%22-mem_bytes%22%5D`. Les listes sont donc écrites en
 *   clair, séparées par des virgules.
 * - `ResolvedListSearch` est ce que manipulent les composants, avec de vraies
 *   listes.
 *
 * `parseListSearch` et `toSearchParams` font la conversion aux deux frontières.
 */
export interface ListSearch {
  /** Clés de tri séparées par des virgules, préfixées de - pour l'ordre descendant. */
  sort?: string;
  offset?: number;
  limit?: number;
  /** Nom du filterset appliqué, absent pour la liste complète. */
  fset?: string;
  /** Identifiant de la ligne dont le panneau de détail est ouvert. */
  sel?: string;
  /** Props des colonnes visibles ; absent signifie « toutes les colonnes de la vue ». */
  cols?: string;
  /**
   * Onglet ouvert dans le panneau de détail. Dans l'URL pour qu'un lien, un
   * rechargement ou le bouton Précédent rouvrent le même onglet.
   */
  tab?: string;
  /**
   * Objet d'une autre vue regardé sans quitter celle-ci, sous la forme
   * `kind:identifiant` : la puce d'une cellule ouvre ainsi sa fiche à la place du
   * panneau de la ligne. Dans l'URL comme le reste, pour qu'un lien la rouvre.
   */
  peek?: string;
  /** Onglet ouvert dans ce panneau-là, quand l'objet regardé en a. */
  peektab?: string;
}

export interface ResolvedListSearch {
  sort: string[];
  offset: number;
  limit: number;
  fset: string;
  sel?: string;
  cols?: string[];
  tab?: string;
  peek?: string;
  peektab?: string;
}

export const PAGE_SIZES = [25, 50, 100] as const;

const DEFAULT_LIMIT = 50;

function toPositiveInt(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.floor(parsed);
}

function toNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/**
 * Accepte aussi bien "a,b" qu'un vrai tableau : un lien partagé avant que cet
 * état passe en chaînes contient encore un tableau sérialisé en JSON, que le
 * routeur nous rend tel quel.
 */
function toCommaList(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === "string" && item !== "");
    return items.length === 0 ? undefined : items.join(",");
  }
  return toNonEmptyString(value);
}

export function parseListSearch(raw: Record<string, unknown>): ListSearch {
  const limit = toPositiveInt(raw.limit);
  return {
    sort: toCommaList(raw.sort),
    offset: toPositiveInt(raw.offset),
    limit: PAGE_SIZES.some((size) => size === limit) ? limit : undefined,
    fset: toNonEmptyString(raw.fset),
    sel: toNonEmptyString(raw.sel),
    cols: toCommaList(raw.cols),
    tab: toNonEmptyString(raw.tab),
    peek: toNonEmptyString(raw.peek),
    peektab: toNonEmptyString(raw.peektab),
  };
}

export function resolveListSearch(search: ListSearch, defaultSort: string[]): ResolvedListSearch {
  return {
    sort: search.sort?.split(",") ?? defaultSort,
    offset: search.offset ?? 0,
    limit: search.limit ?? DEFAULT_LIMIT,
    fset: search.fset ?? "",
    sel: search.sel,
    cols: search.cols?.split(","),
    tab: search.tab,
    peek: search.peek,
    peektab: search.peektab,
  };
}

/**
 * Traduit une mise à jour venue d'un composant vers la forme d'URL. Une clé absente
 * laisse la valeur précédente ; une clé à `undefined` l'efface. Les valeurs par
 * défaut sont effacées plutôt qu'écrites, pour que l'URL ne porte que ce qui
 * s'écarte de la vue de base.
 */
export function toSearchParams(next: Partial<ResolvedListSearch>): Partial<ListSearch> {
  const out: Partial<ListSearch> = {};
  if ("sort" in next)
    out.sort = next.sort === undefined || next.sort.length === 0 ? undefined : next.sort.join(",");
  if ("cols" in next)
    out.cols = next.cols === undefined || next.cols.length === 0 ? undefined : next.cols.join(",");
  if ("offset" in next) out.offset = next.offset === 0 ? undefined : next.offset;
  if ("limit" in next) out.limit = next.limit === DEFAULT_LIMIT ? undefined : next.limit;
  if ("fset" in next) out.fset = next.fset === "" ? undefined : next.fset;
  // Un seul tiroir à la fois : ouvrir le panneau d'une ligne referme la fiche qu'une
  // puce avait ouverte, comme la puce referme le panneau de la ligne.
  if ("sel" in next) {
    out.sel = next.sel;
    out.peek = undefined;
    out.peektab = undefined;
  }
  if ("tab" in next) out.tab = next.tab;
  if ("peek" in next) out.peek = next.peek;
  if ("peektab" in next) out.peektab = next.peektab;
  return out;
}

/**
 * Colonnes visibles, dans l'ordre déclaré par la vue.
 *
 * Sans sélection dans l'URL, ce sont les colonnes par défaut de la vue et non
 * toutes ses colonnes : une vue peut en proposer des dizaines sans les imposer.
 * Les props inconnus d'une URL ancienne ou bricolée sont ignorés, et une sélection
 * vide retombe sur les colonnes par défaut, une table sans colonne n'ayant rien à
 * montrer.
 */
export function visibleProps(
  cols: string[] | undefined,
  defaultCols: string[],
  allProps: string[],
): string[] {
  if (cols === undefined) return defaultCols;
  const kept = allProps.filter((prop) => cols.includes(prop));
  return kept.length === 0 ? defaultCols : kept;
}

/**
 * États qui ne remplacent pas les lignes affichées : panneau de détail ouvert, son
 * onglet, colonnes visibles.
 */
const IN_PLACE_KEYS = new Set<keyof ResolvedListSearch>(["sel", "tab", "cols", "peek", "peektab"]);

/**
 * Faut-il remonter en haut de page après cette mise à jour de l'URL ?
 *
 * Le routeur le fait par défaut à chaque navigation. C'est voulu quand la page, le
 * tri ou le filterset changent les lignes affichées, mais pas quand on ouvre le
 * détail d'une ligne atteinte en faisant défiler : la liste sauterait sous le
 * panneau et on perdrait sa place en le refermant.
 */
export function resetsScroll(next: Partial<ResolvedListSearch>): boolean {
  return Object.keys(next).some((key) => !IN_PLACE_KEYS.has(key as keyof ResolvedListSearch));
}
