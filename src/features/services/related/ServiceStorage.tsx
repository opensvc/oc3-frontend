import { StorageSections } from "@/components/opensvc/StorageSections";
import { useServiceDisks, useServiceHbas } from "./queries";

/** Storage of a service: HBAs and disks grouped by node, one group per node. */
export function ServiceStorage({ svcId, locale }: { svcId: string; locale: string }) {
  const disks = useServiceDisks(svcId);
  const hbas = useServiceHbas(svcId);
  const rows = disks.data ?? [];
  const nodenames = [...new Set(rows.map((row) => row.nodename ?? ""))].sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <StorageSections
      locale={locale}
      hbas={{
        groups: (hbas.data ?? []).map((node) => ({
          key: node.nodename,
          label: node.nodename,
          rows: node.rows,
        })),
        isPending: hbas.isPending,
        errorMessage: hbas.isError ? hbas.error.message : null,
      }}
      disks={{
        groups: nodenames.map((nodename) => ({
          key: nodename,
          label: nodename,
          rows: rows.filter((row) => (row.nodename ?? "") === nodename),
        })),
        isPending: disks.isPending,
        errorMessage: disks.isError ? disks.error.message : null,
      }}
    />
  );
}
