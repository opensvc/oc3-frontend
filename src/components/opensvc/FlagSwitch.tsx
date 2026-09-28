import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/Switch";

/**
 * A T/F flag of the collector in a list cell, as the toggle of its `boolean` cells:
 * a read-only switch whose state is also announced. Any other value, such as the
 * empty one of a row without the flagged record, shows nothing. `labelKey` names the
 * flag for assistive technologies.
 */
export function FlagSwitch({ value, labelKey }: { value: string | undefined; labelKey: string }) {
  const { t } = useTranslation();
  if (value !== "T" && value !== "F") return null;
  return (
    <Switch
      checked={value === "T"}
      label={t(labelKey)}
      stateLabel={t(value === "T" ? "detail.yes" : "detail.no")}
      disabled
    />
  );
}
