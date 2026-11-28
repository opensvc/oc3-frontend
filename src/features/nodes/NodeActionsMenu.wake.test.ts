import { describe, expect, test } from "vitest";
import { actionLook } from "@/components/opensvc/action-looks";
import en from "@/i18n/locales/en.json";
import fr from "@/i18n/locales/fr.json";
import { ACTIONS } from "./NodeActionsMenu";

describe("the wake node action", () => {
  test("is offered first among the power actions", () => {
    const power = ACTIONS.filter((entry) => entry.group === "power").map((entry) => entry.action);
    expect(power[0]).toBe("wake");
  });

  test("has an icon and is not shown as disruptive", () => {
    const look = actionLook("wake");
    expect(look?.icon).toBeDefined();
    expect(look?.danger).toBeFalsy();
    expect(look?.impacts ?? []).toEqual([]);
  });

  test("is named and explained in every language", () => {
    for (const locale of [en, fr]) {
      expect(locale.nodes.actions.items.wake).toBeTruthy();
      expect(locale.nodes.actions.descriptions.wake).toBeTruthy();
    }
  });
});
