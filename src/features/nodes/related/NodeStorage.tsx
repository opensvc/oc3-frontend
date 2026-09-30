import { useTranslation } from "react-i18next";
import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import { SanDiagram } from "@/components/opensvc/SanDiagram";
import { StorageSections } from "@/components/opensvc/StorageSections";
import { useNodeDisks, useNodeHbas, useNodeSan } from "./queries";

/**
 * Storage of a node: the diagram of its SAN wiring, then its host bus adapters and
 * its disks, in the order of the historical storage tab.
 */

export function NodeStorage({
  nodeId,
  locale,
  headerTop,
}: {
  nodeId: string;
  locale: string;
  /** Where the table headers stick, see `RelatedTable`. */
  headerTop?: string;
}) {
  const { t } = useTranslation();
  const disks = useNodeDisks(nodeId);
  const hbas = useNodeHbas(nodeId);
  const san = useNodeSan(nodeId);
  const rows = disks.data ?? [];

  // Disks grouped by service: those a service uses, then those of the node alone.
  const services = [...new Set(rows.map((row) => row.svcname ?? ""))].sort((a, b) =>
    a === "" ? 1 : b === "" ? -1 : a.localeCompare(b),
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 font-semibold text-ink-muted">
          <ColumnFamilyIcon family="network" />
          {t("storage.san.title")}
        </h3>
        {san.isPending ? (
          <p className="text-ink-muted">{t("storage.san.loading")}</p>
        ) : san.isError ? (
          <p role="alert" className="text-state-down">
            ■ {t("storage.san.error", { message: san.error.message })}
          </p>
        ) : (
          <SanDiagram topology={san.data} />
        )}
      </section>
      <StorageSections
        locale={locale}
        headerTop={headerTop}
        hbas={{
          groups: [{ key: "all", label: "", rows: hbas.data ?? [] }],
          isPending: hbas.isPending,
          errorMessage: hbas.isError ? hbas.error.message : null,
        }}
        disks={{
          groups: services.map((svcname) => ({
            key: svcname === "" ? "-" : svcname,
            label: svcname === "" ? t("storage.disks.unassigned") : svcname,
            rows: rows.filter((row) => (row.svcname ?? "") === svcname),
          })),
          isPending: disks.isPending,
          errorMessage: disks.isError ? disks.error.message : null,
        }}
      />
    </div>
  );
}
