import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MenuButton, type MenuItem } from "@/components/ui/MenuButton";

/** An entry of the menu: the action posted to the queue, and its group. */
export interface ActionEntry {
  action: string;
  /** Separator line before this entry, to mark a group. */
  separatorBefore?: boolean;
  /**
   * The submenu the entry goes in, labelled `<prefix>.groups.<group>`: the entries
   * of a group follow each other in it, the submenu standing where its first entry
   * is in the list.
   */
  group?: string;
}

/** Object to queue the action on: its id, and its name for refusal messages. */
export interface ActionTarget {
  id: string;
  name: string;
}

interface Outcome {
  action: string;
  queued: number;
  failures: string[];
}

/**
 * Agent actions menu for one or several objects (nodes, services, instances).
 * The chosen action is confirmed then posted to the collector queue, from which the
 * agent takes it: nothing runs during the request, so the menu announces a queuing
 * and not a result.
 *
 * Rights are checked by the API for each object: NodeExec privilege and
 * responsibility. In a multiple selection, a refusal applies to its object only and
 * the report names it.
 *
 * Labels come from `<prefix>.items.<action>`, and the menu texts from
 * `<prefix>.open`, `.question`, `.confirm`, `.queueing`, `.queued` and `.failure`:
 * each kind of object keeps its own wording.
 */
export function ActionsMenu({
  targets,
  actions,
  prefix,
  queue: queueOne,
}: {
  targets: ActionTarget[];
  actions: readonly ActionEntry[];
  /** Prefix of the translation keys, for example `nodes.actions`. */
  prefix: string;
  /** Queues the action on one object; returns the API error message, or null. */
  queue: (target: ActionTarget, action: string) => Promise<string | null>;
}) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const queue = useMutation({
    mutationFn: async (action: string) => {
      const results = await Promise.all(
        targets.map(async (target) => ({ target, message: await queueOne(target, action) })),
      );
      const failures = results
        .filter((result) => result.message !== null)
        .map((result) =>
          t(`${prefix}.failure`, { name: result.target.name, message: result.message }),
        );
      return { action, queued: results.length - failures.length, failures };
    },
    onSuccess: (result) => {
      setOutcome(result);
    },
  });

  if (targets.length === 0) return null;

  const itemOf = (entry: ActionEntry): MenuItem => ({
    key: entry.action,
    label: t(`${prefix}.items.${entry.action}`),
    separatorBefore: entry.separatorBefore === true,
    disabled: queue.isPending,
    onSelect: () => {
      setOutcome(null);
      setPending(entry.action);
    },
  });
  const items: MenuItem[] = [];
  const submenus = new Map<string, MenuItem>();
  for (const entry of actions) {
    if (entry.group === undefined) {
      items.push(itemOf(entry));
      continue;
    }
    let submenu = submenus.get(entry.group);
    if (submenu === undefined) {
      submenu = {
        key: `group:${entry.group}`,
        label: t(`${prefix}.groups.${entry.group}`),
        separatorBefore: entry.separatorBefore === true,
        items: [],
      };
      submenus.set(entry.group, submenu);
      items.push(submenu);
    }
    submenu.items?.push({ ...itemOf(entry), separatorBefore: false });
  }

  const label = pending === null ? "" : t(`${prefix}.items.${pending}`);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MenuButton label={t(`${prefix}.open`)} items={items} disabled={queue.isPending} />

      {pending !== null && (
        <div
          role="group"
          aria-label={t(`${prefix}.question`, { action: label, count: targets.length })}
          className="flex flex-wrap items-center gap-2"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setPending(null);
            }
          }}
        >
          <p>{t(`${prefix}.question`, { action: label, count: targets.length })}</p>
          <button
            type="button"
            autoFocus
            disabled={queue.isPending}
            onClick={() => {
              queue.mutate(pending, {
                onSettled: () => {
                  setPending(null);
                },
              });
            }}
            className="h-7 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
          >
            {queue.isPending ? t(`${prefix}.queueing`) : t(`${prefix}.confirm`)}
          </button>
          <button
            type="button"
            onClick={() => {
              setPending(null);
            }}
            className="h-7 rounded-(--radius-control) border border-line px-3"
          >
            {t("detail.cancel")}
          </button>
        </div>
      )}

      {outcome !== null && outcome.queued > 0 && (
        <span role="status" className="text-ink-muted">
          {t(`${prefix}.queued`, {
            action: t(`${prefix}.items.${outcome.action}`),
            count: outcome.queued,
          })}
        </span>
      )}
      {outcome !== null && outcome.failures.length > 0 && (
        <ul role="alert" className="text-state-down">
          {outcome.failures.map((failure) => (
            <li key={failure}>■ {failure}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
