import { useTranslation } from "react-i18next";
import { DetailPanel, type DetailGroup } from "@/components/opensvc/DetailPanel";
import { formatDateTime } from "@/lib/format";
import type { TagRow } from "./tag-row";

/**
 * Detail of a tag, read-only.
 *
 * Neither editing nor deletion: the matching endpoints are addressed by the integer
 * id of the tag, which the list does not return. See notes.md. The panel reads the
 * row already loaded by the list, for want of being able to read it again through
 * `GET /tags/{tag_id}`, which expects that same integer id.
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
