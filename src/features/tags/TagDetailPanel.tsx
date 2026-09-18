import { useTranslation } from "react-i18next";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { formatDateTime } from "@/lib/format";
import type { TagRow } from "./tag-row";

/**
 * Détail d'un tag, en lecture seule.
 *
 * Ni modification ni suppression : les endpoints correspondants s'adressent par
 * l'identifiant entier du tag, que la liste ne renvoie pas. Voir notes.md.
 * Le panneau lit la ligne déjà chargée par la liste, faute de pouvoir la relire
 * par `GET /tags/{tag_id}`, qui attend le même identifiant entier.
 */
const GROUPS: DetailGroup<TagRow>[] = [
  {
    key: "identity",
    family: "team",
    fields: [
      { prop: "tag_name", format: (row) => row.tag_name },
      { prop: "tag_exclude", format: (row) => row.tag_exclude },
      { prop: "tag_data", format: (row) => row.tag_data },
      { prop: "tag_id", format: (row) => row.tag_id },
      {
        prop: "tag_created",
        format: (row, locale) => formatDateTime(row.tag_created, locale),
      },
    ],
  },
];

export function TagDetailPanel({ tag, onClose }: { tag: TagRow | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <DetailPanel
      kind="app"
      open={tag !== undefined}
      title={tag?.tag_name ?? t("tags.detail.title")}
      onClose={onClose}
      groups={GROUPS}
      row={tag ?? null}
      labelPrefix="tags.fields"
      groupPrefix="tags.detail.groups"
      isPending={false}
      errorMessage={null}
    />
  );
}
