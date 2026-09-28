/**
 * The catalog of the forms users submit requests with, organised in folders as
 * the historical request page does (`init/static/js/osvc/requests.js`): a form
 * lives in the folder its form_folder names. All the forms are listed at once,
 * grouped by folder, rather than browsed folder by folder.
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
  const folders = new Map<string, Omit<CatalogFolder, "folder" | "entries">>();
  for (const f of forms) {
    const d = f.definition ?? {};
    if (f.type !== "folder" || text(d.FolderName) === "") continue;
    folders.set(normalizeFolder(`${f.folder}/${text(d.FolderName)}`), {
      label: text(d.FolderLabel),
      desc: text(d.FolderDesc),
      css: text(d.FolderCss),
    });
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, entries]) => ({
      folder,
      entries,
      ...(folders.get(folder) ?? { label: "", desc: "", css: "" }),
    }));
}

/** URL state of the request page: the form chosen. */
export interface RequestSearch {
  form?: string;
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
  return { form };
}
