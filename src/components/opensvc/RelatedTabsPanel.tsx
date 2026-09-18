import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SlideOver } from "@/components/ui/SlideOver";
import { TabList, type TabItem } from "@/components/ui/Tabs";
import { tabPanelProps, useTabsId } from "@/components/ui/tabs-ids";
import { ColumnFamilyIcon, type ColumnFamily } from "./ColumnFamily";
import { ObjectIcon, type ObjectKind } from "./ObjectIcon";
import { RelatedCount } from "./RelatedCount";
import { PROPERTIES_TAB, type RelatedTab } from "./related-tabs";

/**
 * Panneau de détail à onglets : les propriétés de l'objet, puis ses données rattachées,
 * un onglet chacune avec son effectif. L'onglet ouvert est tenu par la vue, dans l'URL
 * (`tab`), pour qu'un lien, un rechargement ou le bouton Précédent le rouvrent.
 */
export function RelatedTabsPanel({
  open,
  title,
  kind,
  onClose,
  objectId,
  tabs,
  tab,
  onTabChange,
  propertiesFamily,
  label,
  children,
}: {
  open: boolean;
  title: string;
  kind: ObjectKind;
  onClose: () => void;
  /** Identifiant passé aux onglets ; absent tant que rien n'est sélectionné. */
  objectId: string | undefined;
  tabs: RelatedTab[];
  tab: string | undefined;
  onTabChange: (tab: string | undefined) => void;
  /** Icône de l'onglet des propriétés. */
  propertiesFamily: ColumnFamily;
  /** Nom accessible de la barre d'onglets. */
  label: string;
  /** Contenu de l'onglet des propriétés. */
  children: ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const tabsId = useTabsId();
  // Un onglet inconnu, venu d'une URL ancienne ou d'un autre type d'objet, retombe sur
  // les propriétés.
  const related = tabs.find((entry) => entry.key === tab);
  const active = related?.key ?? PROPERTIES_TAB;
  const items: TabItem[] = [
    {
      key: PROPERTIES_TAB,
      label: t("related.properties"),
      icon: <ColumnFamilyIcon family={propertiesFamily} />,
    },
    ...tabs.map((entry) => ({
      key: entry.key,
      label: t(entry.labelKey),
      icon: entry.icon,
      badge: <RelatedCount tab={entry} id={objectId} />,
    })),
  ];

  return (
    <SlideOver
      open={open}
      wide
      title={title}
      onClose={onClose}
      closeLabel={t("detail.close")}
      leading={<ObjectIcon kind={kind} />}
      subheader={
        <TabList
          tabs={items}
          active={active}
          onChange={(key) => {
            onTabChange(key === PROPERTIES_TAB ? undefined : key);
          }}
          label={label}
          idPrefix={tabsId}
        />
      }
    >
      <div {...tabPanelProps(tabsId, active)} className="outline-none">
        {related === undefined || objectId === undefined
          ? children
          : related.render(objectId, i18n.language)}
      </div>
    </SlideOver>
  );
}
