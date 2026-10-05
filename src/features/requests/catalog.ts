/**
 * The catalog of the forms users submit requests with, organised in folders as
 * the historical request page does (`init/static/js/osvc/requests.js`): a form
 * lives in the folder its form_folder names. The folders nest as a tree, each
 * one folded until opened, rather than browsed one level at a time.
 */

/** A form of the catalog, as GET /forms returns it. */
export interface CatalogForm {
  id: number;
  name: string;
  type: string;
  folder: string;
  definition: Record<string, unknown> | null;
}

/** An entry of the catalog: a form to fill, with the label and text it shows. */
export interface CatalogEntry {
  key: string;
  form: CatalogForm;
  label: string;
  desc: string;
  /** Legacy classes of the form (Css): the icon of its card. */
  css: string;
  /** Where its first output sends the data (Dest): "workflow", "db"… */
  dest: string;
}

/**
 * A folder of the catalog: its path, and what the "folder" form leading to it
 * says of it, if any (FolderLabel, FolderDesc, FolderCss for its icon).
 */
export interface CatalogFolder {
  folder: string;
  label: string;
  desc: string;
  css: string;
  entries: CatalogEntry[];
}

function text(v: unknown): string {
  return typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
}

/** A folder path, "/" alone for the root, without a trailing slash otherwise. */
export function normalizeFolder(path: string | undefined): string {
  const parts = (path ?? "").split("/").filter((p) => p !== "");
  return "/" + parts.join("/");
}

function formEntry(form: CatalogForm): CatalogEntry {
  const d = form.definition ?? {};
  return {
    key: `form-${String(form.id)}`,
    form,
    label: text(d.Label) || form.name,
    desc: text(d.Desc),
    css: text(d.Css),
    dest: Array.isArray(d.Outputs)
      ? text((d.Outputs[0] as Record<string, unknown> | undefined)?.Dest)
      : "",
  };
}

/**
 * The pattern of a search: a case insensitive regular expression, as in the
 * historical search, or the plain text when it is not a valid expression.
 */
function searchPattern(search: string): RegExp {
  try {
    return new RegExp(search, "i");
  } catch {
    return new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
}

/**
 * The forms to offer, grouped by folder, folders and forms sorted by name. An
 * empty search keeps every form; otherwise the pattern is tried on the name, the
 * Label and the Desc. The "folder" forms, which laid out the historical folder
 * navigation, are not offered: they name, describe and decorate the folder their
 * FolderName leads to.
 */
export function catalogGroups(forms: CatalogForm[], search: string): CatalogFolder[] {
  const re = search.trim() === "" ? null : searchPattern(search.trim());
  const groups = new Map<string, CatalogEntry[]>();
  for (const f of [...forms].sort((a, b) => a.name.localeCompare(b.name))) {
    if (f.type === "folder") continue;
    const entry = formEntry(f);
    if (re !== null && !re.test(f.name) && !re.test(entry.label) && !re.test(entry.desc)) {
      continue;
    }
    const folder = normalizeFolder(f.folder);
    groups.set(folder, [...(groups.get(folder) ?? []), entry]);
  }
  const folders = folderDefinitions(forms);
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, entries]) => ({
      folder,
      entries,
      ...(folders.get(folder) ?? { label: "", desc: "", css: "" }),
    }));
}

/**
 * A folder of the catalog tree: its forms, and its subfolders, which nest as the
 * historical folder navigation did (a folder "/a/b" lives in "/a"). `count` is the
 * number of forms in it and below.
 */
export interface CatalogNode {
  /** Full path, "/a/b". */
  path: string;
  /** Last part of the path, "b". */
  name: string;
  label: string;
  desc: string;
  css: string;
  entries: CatalogEntry[];
  children: CatalogNode[];
  count: number;
}

/**
 * The catalog as a tree of folders, from the groups of `catalogGroups` and the
 * folder definitions (`folderDefinitions`): a folder holding no form but a
 * subfolder that does is kept, to reach it, with its own definition. The forms of the
 * root folder come apart, at the top level. Folders sort by name at each level.
 */
export function catalogTree(
  groups: CatalogFolder[],
  definitions: Map<string, FolderDefinition>,
): { root: CatalogEntry[]; folders: CatalogNode[] } {
  const nodes = new Map<string, CatalogNode>();
  const top: CatalogNode[] = [];
  let root: CatalogEntry[] = [];

  function node(path: string): CatalogNode {
    const known = nodes.get(path);
    if (known !== undefined) return known;
    const parts = path.split("/").filter((p) => p !== "");
    // Label, description and icon of the "folder" form defining it, if any.
    const g = definitions.get(path);
    const created: CatalogNode = {
      path,
      name: parts[parts.length - 1] ?? "",
      label: g?.label ?? "",
      desc: g?.desc ?? "",
      css: g?.css ?? "",
      entries: [],
      children: [],
      count: 0,
    };
    nodes.set(path, created);
    if (parts.length === 1) top.push(created);
    else node("/" + parts.slice(0, -1).join("/")).children.push(created);
    return created;
  }

  for (const g of groups) {
    if (g.folder === "/") {
      root = g.entries;
      continue;
    }
    node(g.folder).entries = g.entries;
  }
  // Counts from the leaves up, and folders sorted by name at each level.
  function finish(n: CatalogNode): number {
    n.children.sort((a, b) => a.name.localeCompare(b.name));
    n.count = n.entries.length + n.children.reduce((sum, c) => sum + finish(c), 0);
    return n.count;
  }
  top.sort((a, b) => a.name.localeCompare(b.name));
  top.forEach(finish);
  return { root, folders: top };
}

/** What a "folder" form says of the folder it defines. */
export interface FolderDefinition {
  label: string;
  desc: string;
  /** Legacy classes of its icon (FolderCss); empty for the default folder icon. */
  css: string;
}

/**
 * The folders defined by the "folder" forms, by path: a "folder" form in folder F
 * with FolderName N defines F/N, as the historical folder navigation reads it.
 */
export function folderDefinitions(forms: CatalogForm[]): Map<string, FolderDefinition> {
  const folders = new Map<string, FolderDefinition>();
  for (const f of forms) {
    const d = f.definition ?? {};
    if (f.type !== "folder" || text(d.FolderName) === "") continue;
    folders.set(normalizeFolder(`${f.folder}/${text(d.FolderName)}`), {
      label: text(d.FolderLabel),
      desc: text(d.FolderDesc),
      css: text(d.FolderCss),
    });
  }
  return folders;
}

/** The lists of the catalog besides its folders. */
export type CatalogView = "favorites" | "recent" | "all";

/**
 * URL state of the request page: the form chosen, and what the catalog shows, a
 * folder or one of the views; neither, the favorites when the user has some, every
 * form otherwise.
 */
export interface RequestSearch {
  form?: string;
  folder?: string;
  view?: CatalogView;
}

/**
 * Reads the request page URL state. The form id may come as a number: the router
 * parses a bare numeric value, as a hand-written link carries it.
 */
export function parseRequestSearch(raw: Record<string, unknown>): RequestSearch {
  const form =
    typeof raw.form === "string" && raw.form !== ""
      ? raw.form
      : typeof raw.form === "number"
        ? String(raw.form)
        : undefined;
  const folder =
    typeof raw.folder === "string" && raw.folder !== "" ? normalizeFolder(raw.folder) : undefined;
  const view =
    raw.view === "favorites" || raw.view === "recent" || raw.view === "all" ? raw.view : undefined;
  return { form, folder, view };
}
