import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ColumnFamilyIcon } from "@/components/opensvc/ColumnFamily";
import { CategoryCount, CategoryTabs, type CategoryTab } from "@/components/ui/CategoryTabs";
import { NodeHardware } from "./NodeHardware";
import { NodeNetworks } from "./NodeNetworks";
import { NodePackages } from "./NodePackages";
import { NodeStorage } from "./NodeStorage";
import { useNodeDisks, useNodeHardware, useNodeIps, useNodePackageCount } from "./queries";

type CategoryKey = "hardware" | "networks" | "storage" | "packages";

const CATEGORY_KEYS: readonly CategoryKey[] = ["hardware", "networks", "storage", "packages"];

const CATEGORY_ICONS: Record<CategoryKey, ReactNode> = {
  hardware: <ColumnFamilyIcon family="cpu" />,
  networks: <ColumnFamilyIcon family="network" />,
  storage: <ColumnFamilyIcon family="disk" />,
  packages: <ColumnFamilyIcon family="package" />,
};

/**
 * What the agent inventories on a node, in one tab: its hardware components, its
 * network addresses, its storage — host bus adapters then disks, each under its heading — and its
 * installed packages. One category at a
 * time, chosen in a strip of chips as in the "Nodes differences" tab of a service
 * (`CategoryTabs`): each chip says how many entries its category holds, the disks
 * for the storage. The strip
 * stays in view while the list scrolls. The category chosen lives in the URL
 * (`diff`, the parameter of the tabs made of several lists); hardware by default.
 */
export function NodeInventory({ nodeId, locale }: { nodeId: string; locale: string }) {
  const { t } = useTranslation();
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();
  const hardware = useNodeHardware(nodeId);
  const ips = useNodeIps(nodeId);
  const disks = useNodeDisks(nodeId);
  // Counted apart: the list itself, a couple of thousand rows, loads with its category.
  const packages = useNodePackageCount(nodeId);

  // The strip sticks at the top of the panel: the table headers stick under it.
  const strip = useRef<HTMLDivElement>(null);
  const [stripHeight, setStripHeight] = useState(0);
  useEffect(() => {
    const el = strip.current;
    if (el === null) return;
    const observer = new ResizeObserver(() => {
      setStripHeight(el.offsetHeight);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);
  // The panel body has a 0.75rem padding the sticky elements cover.
  const headerTop = `calc(${String(stripHeight)}px - 0.75rem)`;

  const loads: Record<CategoryKey, { count: number | undefined; failed: boolean }> = {
    hardware: { count: hardware.data?.length, failed: hardware.isError },
    networks: { count: ips.data?.length, failed: ips.isError },
    storage: { count: disks.data?.length, failed: disks.isError },
    packages: { count: packages.data, failed: packages.isError },
  };
  const tabs = CATEGORY_KEYS.map((key): CategoryTab<CategoryKey> => {
    const { count, failed } = loads[key];
    return {
      key,
      label: t(`nodes.inventory.categories.${key}`),
      icon: CATEGORY_ICONS[key],
      tone: failed ? "error" : count !== undefined && count > 0 ? "strong" : "muted",
      description: failed
        ? t("nodes.inventory.chip.error")
        : count === undefined
          ? t("nodes.inventory.chip.pending")
          : t("nodes.inventory.chip.count", { count }),
      mark: failed ? (
        <span aria-hidden="true">■</span>
      ) : count === undefined ? (
        <span aria-hidden="true">…</span>
      ) : (
        <CategoryCount count={count} />
      ),
    };
  });

  const active = CATEGORY_KEYS.find((key) => key === search.diff) ?? "hardware";

  function select(key: CategoryKey) {
    void navigate({
      to: ".",
      search: (previous) => ({ ...(previous as Record<string, unknown>), diff: key }),
      resetScroll: false,
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={strip}
        // Covers the panel padding, so that the rows scrolling under it stay hidden.
        className="sticky -top-3 z-10 -mx-3 -mt-3 border-b border-line bg-surface-raised px-3 pt-3 pb-2"
      >
        <CategoryTabs
          label={t("nodes.inventory.categoriesLabel")}
          idPrefix="inventory"
          tabs={tabs}
          active={active}
          onSelect={select}
        />
      </div>
      <div
        role="tabpanel"
        id={`inventory-panel-${active}`}
        aria-labelledby={`inventory-tab-${active}`}
      >
        {active === "hardware" && (
          <NodeHardware nodeId={nodeId} locale={locale} headerTop={headerTop} />
        )}
        {active === "networks" && <NodeNetworks nodeId={nodeId} headerTop={headerTop} />}
        {active === "storage" && (
          <NodeStorage nodeId={nodeId} locale={locale} headerTop={headerTop} />
        )}
        {active === "packages" && (
          <NodePackages nodeId={nodeId} locale={locale} headerTop={headerTop} />
        )}
      </div>
    </div>
  );
}
