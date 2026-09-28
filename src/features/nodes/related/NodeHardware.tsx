import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { RelatedTable, type RelatedColumn } from "@/components/opensvc/RelatedTable";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useNodeHardware } from "./queries";

type NodeHardwareRow = components["schemas"]["NodeHardwareRow"];

/** Families in display order: memory, which is short, before the long PCI list. */
const TYPE_ORDER = ["mem", "cpu", "pci", "usb", "disk"];

export function NodeHardware({ nodeId, locale }: { nodeId: string; locale: string }) {
  const { t, i18n } = useTranslation();
  const hardware = useNodeHardware(nodeId);
  const rows = hardware.data ?? [];

  // Grouped by component family: this is how an inventory reads.
  const types = [...new Set(rows.map((row) => row.hw_type ?? ""))].sort(
    (a, b) =>
      (TYPE_ORDER.indexOf(a) + 1 || TYPE_ORDER.length + 1) -
        (TYPE_ORDER.indexOf(b) + 1 || TYPE_ORDER.length + 1) || a.localeCompare(b),
  );
  const groups = types.map((type) => ({
    key: type,
    label: i18n.exists(`nodes.hardware.types.${type}`)
      ? t(`nodes.hardware.types.${type}`)
      : type.toUpperCase(),
    rows: rows.filter((row) => (row.hw_type ?? "") === type),
  }));

  const columns: RelatedColumn<NodeHardwareRow>[] = [
    {
      key: "hw_path",
      label: t("nodes.hardware.fields.hw_path"),
      render: (row) => <code>{row.hw_path}</code>,
    },
    {
      key: "hw_class",
      label: t("nodes.hardware.fields.hw_class"),
      render: (row) => row.hw_class,
      wrap: true,
    },
    {
      key: "hw_description",
      label: t("nodes.hardware.fields.hw_description"),
      render: (row) => row.hw_description,
      grow: true,
    },
    {
      key: "hw_driver",
      label: t("nodes.hardware.fields.hw_driver"),
      render: (row) => row.hw_driver,
    },
  ];

  // The whole inventory is dated from the same push: it is said once.
  const updated = rows.reduce<string | undefined>(
    (latest, row) =>
      row.updated !== undefined && (latest === undefined || row.updated > latest)
        ? row.updated
        : latest,
    undefined,
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {updated !== undefined && (
          <p className="text-ink-muted">
            {t("nodes.hardware.reported")} <RelativeTime value={updated} locale={locale} />
          </p>
        )}
        {/* The whole list, with its column filters and sorts, on this node only. */}
        <Link
          to="/hardware"
          search={{ "f.node_id": `eq:${nodeId}` }}
          className="ml-auto text-accent hover:underline"
        >
          {t("nodes.hardware.openView")}
        </Link>
      </div>
      <RelatedTable
        columns={columns}
        groups={groups}
        rowKey={(row) => String(row.id ?? `${row.hw_type ?? ""}:${row.hw_path ?? ""}`)}
        isPending={hardware.isPending}
        errorMessage={hardware.isError ? hardware.error.message : null}
        empty={t("nodes.hardware.empty")}
        caption={t("nodes.related.hardware")}
      />
    </div>
  );
}
