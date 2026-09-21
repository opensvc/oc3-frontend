import { useTranslation } from "react-i18next";
import { StorageSections } from "@/components/opensvc/StorageSections";
import { useNodeDisks, useNodeHbas } from "./queries";

export function NodeStorage({ nodeId, locale }: { nodeId: string; locale: string }) {
  const { t } = useTranslation();
  const disks = useNodeDisks(nodeId);
  const hbas = useNodeHbas(nodeId);
  const rows = disks.data ?? [];

  // Disks grouped by service: those a service uses, then those of the node alone.
  const services = [...new Set(rows.map((row) => row.svcname ?? ""))].sort((a, b) =>
    a === "" ? 1 : b === "" ? -1 : a.localeCompare(b),
  );

  return (
    <StorageSections
      locale={locale}
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
  );
}
