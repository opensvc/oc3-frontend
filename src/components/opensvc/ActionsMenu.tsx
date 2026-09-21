import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { MenuButton, type MenuItem } from "@/components/ui/MenuButton";

/** Une entrée du menu : l'action posée dans la file, et son groupe. */
export interface ActionEntry {
  action: string;
  /** Trait de séparation avant cette entrée, pour marquer un groupe. */
  separatorBefore?: boolean;
}

/** Objet sur lequel poser l'action : son identifiant, et son nom pour les refus. */
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
 * Menu des actions d'agent d'un ou plusieurs objets (nodes, services, instances).
 * L'action choisie est confirmée puis posée dans la file d'attente du collector,
 * d'où l'agent la retire : rien ne s'exécute pendant la requête, le menu annonce
 * donc une mise en file et non un résultat.
 *
 * Les droits sont vérifiés par l'API pour chaque objet : privilège NodeExec et
 * responsabilité. En sélection multiple, un refus ne vaut que pour son objet et le
 * compte rendu le nomme.
 *
 * Les libellés viennent de `<prefix>.items.<action>`, et les textes du menu de
 * `<prefix>.open`, `.question`, `.confirm`, `.queueing`, `.queued` et `.failure` :
 * chaque type d'objet garde ses propres formulations.
 */
export function ActionsMenu({
  targets,
  actions,
  prefix,
  queue: queueOne,
}: {
  targets: ActionTarget[];
  actions: readonly ActionEntry[];
  /** Préfixe des clés de traduction, par exemple `nodes.actions`. */
  prefix: string;
  /** Pose l'action sur un objet ; le message d'erreur de l'API, ou null. */
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

  const items: MenuItem[] = actions.map((entry) => ({
    key: entry.action,
    label: t(`${prefix}.items.${entry.action}`),
    separatorBefore: entry.separatorBefore === true,
    disabled: queue.isPending,
    onSelect: () => {
      setOutcome(null);
      setPending(entry.action);
    },
  }));

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
