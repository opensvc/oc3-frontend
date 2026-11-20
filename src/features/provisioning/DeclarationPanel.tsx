import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { DateTime } from "@/components/ui/DateTime";
import { SlideOver } from "@/components/ui/SlideOver";
import { useReportDirty } from "@/components/ui/use-report-dirty";
import { TrashIcon } from "@/components/ui/icons";
import { copyText } from "@/lib/clipboard";
import {
  DECLARATIONS_KEY,
  HEARTBEAT_TYPES,
  declarationKey,
  declareCluster,
  declareNode,
  deleteDeclaration,
  heartbeatOf,
  issueBootstrapToken,
  keywordsText,
  nodeStage,
  updateDeclaration,
  useDeclarationNodes,
  useEnrollments,
  type ClusterDeclarationNode,
  type ClusterDeclarationSummary,
  type ClusterEnrollment,
  type ClusterHeartbeat,
  type NodeBootstrapToken,
  type NodeStage,
} from "./provisioning-api";

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2";
const AREA = "w-full rounded-(--radius-control) border border-line bg-surface px-2 py-1 font-mono";
const FIELDSET = "flex flex-col gap-3 rounded-(--radius-panel) border border-line p-3";
const BUTTON =
  "inline-flex h-7 items-center gap-1.5 rounded-(--radius-control) border border-line bg-surface px-2.5 hover:border-line-strong disabled:opacity-40";
const PRIMARY =
  "inline-flex h-7 items-center gap-1.5 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60";

/** The lifetimes offered for a bootstrap token, in minutes. */
const TOKEN_TTLS = [60, 240, 1440] as const;

/** Where the collector URL the commands name is remembered, per browser. */
const COLLECTOR_URL_KEY = "oc3.provisioning.collectorUrl";

function rememberedCollectorUrl(): string {
  try {
    return window.localStorage.getItem(COLLECTOR_URL_KEY) ?? window.location.origin;
  } catch {
    return window.location.origin;
  }
}

/** A labelled field of the form, its hint under it. */
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block font-medium" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint !== undefined && <p className="mt-1 text-ink-muted">{hint}</p>}
    </div>
  );
}

/** A heartbeat as the editor holds it: its type and its keyword lines. */
interface HeartbeatDraft {
  type: string;
  keywords: string;
}

function draftsOf(hbs: ClusterHeartbeat[]): HeartbeatDraft[] {
  return hbs.map((hb) => ({ type: hb.type, keywords: keywordsText(hb) }));
}

/** The heartbeats of the drafts, or the first error. */
function heartbeatsOf(drafts: HeartbeatDraft[]): { hbs: ClusterHeartbeat[] } | { error: string } {
  const hbs: ClusterHeartbeat[] = [];
  for (const [i, d] of drafts.entries()) {
    const section = `hb#${String(i + 1)}`;
    if (d.type.trim() === "") return { error: `${section}: type` };
    const parsed = heartbeatOf(d.type, d.keywords);
    if (!parsed.ok) return { error: `${section}: ${parsed.line}` };
    hbs.push(parsed.hb);
  }
  return { hbs };
}

/** The hb#<n> sections of the cluster configuration, edited as keyword lines. */
function HeartbeatsEditor({
  drafts,
  onChange,
}: {
  drafts: HeartbeatDraft[];
  onChange: (drafts: HeartbeatDraft[]) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      {drafts.length === 0 && <p className="text-ink-muted">{t("provisioning.hbNone")}</p>}
      {drafts.map((d, i) => (
        <div key={i} className="rounded-(--radius-control) border border-line/70 p-2">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono font-medium">hb#{i + 1}</span>
            <label className="sr-only" htmlFor={`${id}-${String(i)}-type`}>
              {t("provisioning.hbType")}
            </label>
            <input
              id={`${id}-${String(i)}-type`}
              list={`${id}-types`}
              value={d.type}
              placeholder={t("provisioning.hbType")}
              onChange={(event) => {
                onChange(drafts.map((x, j) => (j === i ? { ...x, type: event.target.value } : x)));
              }}
              className="h-7 w-40 rounded-(--radius-control) border border-line bg-surface px-2 font-mono"
            />
            <button
              type="button"
              aria-label={t("provisioning.hbRemove", { n: i + 1 })}
              onClick={() => {
                onChange(drafts.filter((_, j) => j !== i));
              }}
              className="ml-auto text-ink-muted hover:text-state-down"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
          <label className="sr-only" htmlFor={`${id}-${String(i)}-kw`}>
            {t("provisioning.hbKeywords")}
          </label>
          <textarea
            id={`${id}-${String(i)}-kw`}
            rows={2}
            value={d.keywords}
            placeholder="port=10000"
            onChange={(event) => {
              onChange(
                drafts.map((x, j) => (j === i ? { ...x, keywords: event.target.value } : x)),
              );
            }}
            className={AREA}
          />
        </div>
      ))}
      <datalist id={`${id}-types`}>
        {HEARTBEAT_TYPES.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <button
        type="button"
        onClick={() => {
          onChange([...drafts, { type: "unicast", keywords: "" }]);
        }}
        className="self-start text-accent hover:underline"
      >
        ＋ {t("provisioning.hbAdd")}
      </button>
      <p className="text-ink-muted">{t("provisioning.hbHint")}</p>
    </div>
  );
}

/**
 * Declaring a cluster, or the provisioning of a declared one: its configuration,
 * its nodes and their bootstrap tokens, its enrollments. A click beside the panel
 * closes it, as the other panels, unless a form holds an entry not saved yet
 * (`useReportDirty`).
 */
export function DeclarationPanel({
  open,
  declaration,
  onClose,
  onCreated,
}: {
  open: boolean;
  declaration: ClusterDeclarationSummary | undefined;
  onClose: () => void;
  onCreated: (clusterId: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <SlideOver
      open={open}
      title={
        declaration === undefined
          ? t("provisioning.createTitle")
          : t("provisioning.editTitle", { name: declaration.cluster_name })
      }
      leading={<ObjectIcon kind="provisioning" className="h-5 w-5" />}
      onClose={onClose}
      closeLabel={t("detail.close")}
      resizeLabel={t("detail.resize")}
      size="wide"
    >
      {declaration === undefined ? (
        <CreateForm onCreated={onCreated} />
      ) : (
        <DeclarationDetail
          key={declaration.cluster_id}
          declaration={declaration}
          onDeleted={onClose}
        />
      )}
    </SlideOver>
  );
}

const NEW_HEARTBEATS: HeartbeatDraft[] = [{ type: "unicast", keywords: "" }];

function CreateForm({ onCreated }: { onCreated: (clusterId: string) => void }) {
  const { t } = useTranslation();
  const id = useId();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [clusterId, setClusterId] = useState("");
  const [app, setApp] = useState("");
  const [drafts, setDrafts] = useState<HeartbeatDraft[]>(NEW_HEARTBEATS);
  const [invalid, setInvalid] = useState("");
  useReportDirty(
    name.trim() !== "" ||
      clusterId.trim() !== "" ||
      app.trim() !== "" ||
      JSON.stringify(drafts) !== JSON.stringify(NEW_HEARTBEATS),
  );
  const create = useMutation({
    mutationFn: (heartbeats: ClusterHeartbeat[]) =>
      declareCluster({
        cluster_name: name.trim(),
        ...(clusterId.trim() === "" ? {} : { cluster_id: clusterId.trim() }),
        ...(app.trim() === "" ? {} : { app: app.trim() }),
        heartbeats,
      }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: DECLARATIONS_KEY });
      onCreated(saved.cluster_id);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const hbs = heartbeatsOf(drafts);
    if ("error" in hbs) {
      setInvalid(t("provisioning.hbInvalid", { line: hbs.error }));
      return;
    }
    setInvalid("");
    create.mutate(hbs.hbs);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-ink-muted">{t("provisioning.createIntro")}</p>
      <Field id={`${id}-name`} label={t("provisioning.fields.name")}>
        <input
          id={`${id}-name`}
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          className={`${INPUT} font-mono`}
        />
      </Field>
      <Field id={`${id}-app`} label={t("provisioning.fields.app")} hint={t("provisioning.appHint")}>
        <input
          id={`${id}-app`}
          value={app}
          onChange={(event) => {
            setApp(event.target.value);
          }}
          className={`${INPUT} font-mono`}
        />
      </Field>
      <Field
        id={`${id}-cid`}
        label={t("provisioning.fields.existingId")}
        hint={t("provisioning.existingIdHint")}
      >
        <input
          id={`${id}-cid`}
          value={clusterId}
          onChange={(event) => {
            setClusterId(event.target.value);
          }}
          className={`${INPUT} font-mono`}
        />
      </Field>
      <fieldset className={FIELDSET}>
        <legend className="px-1 font-medium">{t("provisioning.fields.heartbeats")}</legend>
        <HeartbeatsEditor drafts={drafts} onChange={setDrafts} />
      </fieldset>
      {invalid !== "" && (
        <p role="alert" className="text-state-down">
          ■ {invalid}
        </p>
      )}
      {create.isError && (
        <p role="alert" className="text-state-down">
          ■ {create.error.message}
        </p>
      )}
      <div>
        <button type="submit" disabled={create.isPending || name.trim() === ""} className={PRIMARY}>
          {create.isPending ? t("provisioning.declaring") : t("provisioning.declare")}
        </button>
      </div>
    </form>
  );
}

function DeclarationDetail({
  declaration,
  onDeleted,
}: {
  declaration: ClusterDeclarationSummary;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => deleteDeclaration(declaration.cluster_id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DECLARATIONS_KEY });
      onDeleted();
    },
  });
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1">
        <dt className="text-ink-muted">{t("provisioning.fields.clusterId")}</dt>
        <dd className="font-mono break-all">{declaration.cluster_id}</dd>
        <dt className="text-ink-muted">{t("provisioning.fields.seed")}</dt>
        <dd className="font-mono">
          {declaration.seed_nodename ?? (
            <span className="font-sans text-ink-muted">{t("provisioning.noSeed")}</span>
          )}
        </dd>
        <dt className="text-ink-muted">{t("provisioning.fields.created")}</dt>
        <dd>
          <DateTime value={declaration.created} />
          {declaration.created_by !== "" && (
            <span className="text-ink-muted"> · {declaration.created_by}</span>
          )}
        </dd>
      </dl>
      <ConfigurationForm declaration={declaration} />
      <NodesSection declaration={declaration} />
      <EnrollmentsSection clusterId={declaration.cluster_id} />
      {remove.isError && (
        <p role="alert" className="text-state-down">
          ■ {remove.error.message}
        </p>
      )}
      <div className="border-t border-line pt-3">
        <ConfirmButton
          label={t("provisioning.delete")}
          question={t("provisioning.deleteQuestion", { name: declaration.cluster_name })}
          confirmLabel={t("detail.deleteConfirm")}
          cancelLabel={t("detail.cancel")}
          pendingLabel={t("detail.deleting")}
          pending={remove.isPending}
          onConfirm={() => {
            remove.mutate();
          }}
        />
      </div>
    </div>
  );
}

/** The app and the heartbeats a declared cluster provisions its nodes with. */
function ConfigurationForm({ declaration }: { declaration: ClusterDeclarationSummary }) {
  const { t } = useTranslation();
  const id = useId();
  const queryClient = useQueryClient();
  const [app, setApp] = useState(declaration.app);
  const [drafts, setDrafts] = useState(() => draftsOf(declaration.heartbeats));
  const [invalid, setInvalid] = useState("");
  const saved = JSON.stringify({ app: declaration.app, hb: draftsOf(declaration.heartbeats) });
  const dirty = JSON.stringify({ app, hb: drafts }) !== saved;
  useReportDirty(dirty);
  const save = useMutation({
    mutationFn: (heartbeats: ClusterHeartbeat[]) =>
      updateDeclaration(declaration.cluster_id, { app: app.trim(), heartbeats }),
    onSuccess: async (result) => {
      // The declaration as saved becomes the draft: the server orders the
      // keywords its own way.
      setApp(result.app);
      setDrafts(draftsOf(result.heartbeats));
      await queryClient.invalidateQueries({ queryKey: DECLARATIONS_KEY });
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const hbs = heartbeatsOf(drafts);
    if ("error" in hbs) {
      setInvalid(t("provisioning.hbInvalid", { line: hbs.error }));
      return;
    }
    setInvalid("");
    save.mutate(hbs.hbs);
  }

  return (
    <form onSubmit={submit} className={FIELDSET}>
      <h2 className="font-semibold">{t("provisioning.configuration")}</h2>
      <p className="text-ink-muted">{t("provisioning.configurationHint")}</p>
      <Field id={`${id}-app`} label={t("provisioning.fields.app")} hint={t("provisioning.appHint")}>
        <input
          id={`${id}-app`}
          value={app}
          onChange={(event) => {
            setApp(event.target.value);
          }}
          className={`${INPUT} font-mono`}
        />
      </Field>
      <div>
        <p className="mb-1 font-medium">{t("provisioning.fields.heartbeats")}</p>
        <HeartbeatsEditor drafts={drafts} onChange={setDrafts} />
      </div>
      {invalid !== "" && (
        <p role="alert" className="text-state-down">
          ■ {invalid}
        </p>
      )}
      {save.isError && (
        <p role="alert" className="text-state-down">
          ■ {save.error.message}
        </p>
      )}
      <div>
        <button
          type="submit"
          disabled={!dirty || save.isPending}
          className={dirty ? PRIMARY : BUTTON}
        >
          {save.isPending ? t("provisioning.saving") : t("provisioning.save")}
        </button>
      </div>
    </form>
  );
}

const STAGE_CLASS: Record<NodeStage, string> = {
  reporting: "bg-state-up-soft text-state-up",
  bootstrapped: "bg-accent-soft text-accent",
  token: "bg-surface-sunken text-ink",
  expired: "bg-state-warn-soft text-state-warn",
  declared: "bg-surface-sunken text-ink-muted",
};

/** The nodes of the cluster, their tokens, and the declaration of another. */
function NodesSection({ declaration }: { declaration: ClusterDeclarationSummary }) {
  const { t } = useTranslation();
  const id = useId();
  const queryClient = useQueryClient();
  const nodes = useDeclarationNodes(declaration.cluster_id);
  const [nodename, setNodename] = useState("");
  const [ttl, setTtl] = useState<number>(TOKEN_TTLS[0]);
  const [issued, setIssued] = useState<{
    node: ClusterDeclarationNode;
    token: NodeBootstrapToken;
  }>();
  const [now, setNow] = useState(() => Date.now());

  // The stage of a token turns expired without any change: the clock moves on.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: declarationKey(declaration.cluster_id, "nodes"),
    });
    await queryClient.invalidateQueries({ queryKey: DECLARATIONS_KEY });
  };
  const add = useMutation({
    mutationFn: () => declareNode(declaration.cluster_id, { nodename: nodename.trim() }),
    onSuccess: async () => {
      setNodename("");
      await invalidate();
    },
  });
  const issue = useMutation({
    mutationFn: async (node: ClusterDeclarationNode) => ({
      node,
      token: await issueBootstrapToken(node.node_id, ttl),
    }),
    onSuccess: async (result) => {
      setIssued(result);
      await invalidate();
    },
  });

  return (
    <section className={FIELDSET} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="font-semibold">
        {t("provisioning.nodes")}
      </h2>
      {nodes.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : nodes.isError ? (
        <p role="alert" className="text-state-down">
          ■ {nodes.error.message}
        </p>
      ) : nodes.data.length === 0 ? (
        <p className="text-ink-muted">{t("provisioning.noNode")}</p>
      ) : (
        <table className="w-full border-collapse text-data">
          <thead>
            <tr className="border-b border-line text-left text-ink-muted">
              <th scope="col" className="py-1 pr-2 font-medium">
                {t("provisioning.fields.nodename")}
              </th>
              <th scope="col" className="py-1 pr-2 font-medium">
                {t("provisioning.fields.stage")}
              </th>
              <th scope="col" className="py-1 pr-2 font-medium">
                {t("provisioning.fields.token")}
              </th>
              <th scope="col" className="py-1 font-medium">
                <span className="sr-only">{t("provisioning.fields.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {nodes.data.map((node) => {
              const stage = nodeStage(node, now);
              return (
                <tr
                  key={node.node_id}
                  className="border-b border-line/60 align-top last:border-b-0"
                >
                  <th scope="row" className="py-1 pr-2 text-left font-normal">
                    <span className="font-mono">{node.nodename}</span>
                    {node.seed && (
                      <span className="ml-2 rounded-full bg-accent-soft px-2 text-accent">
                        {t("provisioning.seedBadge")}
                      </span>
                    )}
                    <span className="block font-mono text-ink-muted">{node.app}</span>
                  </th>
                  <td className="py-1 pr-2">
                    <span className={`rounded-full px-2 whitespace-nowrap ${STAGE_CLASS[stage]}`}>
                      {t(`provisioning.stage.${stage}`)}
                    </span>
                    {node.cluster_id !== declaration.cluster_id && (
                      <span className="block text-state-warn">
                        {t("provisioning.otherCluster")}
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-2 whitespace-nowrap">
                    {node.token_used !== null && node.token_used !== undefined ? (
                      <>
                        {t("provisioning.tokenUsed")} <DateTime value={node.token_used} />
                      </>
                    ) : node.token_expires !== null && node.token_expires !== undefined ? (
                      <>
                        {t("provisioning.tokenExpires")} <DateTime value={node.token_expires} />
                      </>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      disabled={issue.isPending}
                      onClick={() => {
                        issue.mutate(node);
                      }}
                      className={BUTTON}
                    >
                      {stage === "token" || stage === "expired"
                        ? t("provisioning.reissue")
                        : t("provisioning.issue")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div className="flex items-center gap-2">
        <label htmlFor={`${id}-ttl`} className="text-ink-muted">
          {t("provisioning.tokenTtl")}
        </label>
        <select
          id={`${id}-ttl`}
          value={ttl}
          onChange={(event) => {
            setTtl(Number(event.target.value));
          }}
          className="h-7 rounded-(--radius-control) border border-line bg-surface px-2"
        >
          {TOKEN_TTLS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {t("provisioning.ttlHours", { count: minutes / 60 })}
            </option>
          ))}
        </select>
      </div>
      {issue.isError && (
        <p role="alert" className="text-state-down">
          ■ {issue.error.message}
        </p>
      )}
      {issued !== undefined && (
        <TokenReveal
          nodename={issued.node.nodename}
          token={issued.token}
          onDismiss={() => {
            setIssued(undefined);
          }}
        />
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          add.mutate();
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <label htmlFor={`${id}-node`} className="mb-1 block font-medium">
            {t("provisioning.addNode")}
          </label>
          <input
            id={`${id}-node`}
            value={nodename}
            placeholder={t("provisioning.nodenamePlaceholder")}
            onChange={(event) => {
              setNodename(event.target.value);
            }}
            className={`${INPUT} font-mono`}
          />
        </div>
        <button type="submit" disabled={add.isPending || nodename.trim() === ""} className={BUTTON}>
          {t("provisioning.add")}
        </button>
      </form>
      {add.isError && (
        <p role="alert" className="text-state-down">
          ■ {add.error.message}
        </p>
      )}
    </section>
  );
}

/**
 * A bootstrap token just issued, shown once, and the command that provisions
 * the node with it. The collector URL is the one the nodes reach, which may not
 * be the one of this page: it is editable, remembered by the browser.
 */
function TokenReveal({
  nodename,
  token,
  onDismiss,
}: {
  nodename: string;
  token: NodeBootstrapToken;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [collectorUrl, setCollectorUrl] = useState(rememberedCollectorUrl);
  const [copied, setCopied] = useState<"token" | "command" | "">("");
  const command =
    `umask 077; echo '${token.token}' > /root/.oc3-bootstrap-token\n` +
    `om node bootstrap --collector ${collectorUrl} --token /root/.oc3-bootstrap-token --wait 10m\n` +
    `rm -f /root/.oc3-bootstrap-token`;

  async function copy(what: "token" | "command", text: string) {
    try {
      await copyText(text);
      setCopied(what);
    } catch {
      setCopied("");
    }
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-2 rounded-(--radius-control) border border-accent p-3"
    >
      <p className="font-medium">
        {t("provisioning.tokenFor", { node: nodename })}{" "}
        <span className="font-normal text-ink-muted">
          ({t("provisioning.tokenExpires")} <DateTime value={token.expires} />)
        </span>
      </p>
      <p className="text-state-warn">▲ {t("provisioning.tokenOnce")}</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 rounded-(--radius-control) bg-surface-sunken px-2 py-1 break-all">
          {token.token}
        </code>
        <button
          type="button"
          onClick={() => {
            void copy("token", token.token);
          }}
          className={BUTTON}
        >
          {copied === "token" ? t("provisioning.copied") : t("provisioning.copy")}
        </button>
      </div>
      <Field
        id={`${id}-url`}
        label={t("provisioning.collectorUrl")}
        hint={t("provisioning.collectorUrlHint")}
      >
        <input
          id={`${id}-url`}
          value={collectorUrl}
          onChange={(event) => {
            setCollectorUrl(event.target.value);
            try {
              window.localStorage.setItem(COLLECTOR_URL_KEY, event.target.value);
            } catch {
              // A browser refusing the storage asks again next time.
            }
          }}
          className={`${INPUT} font-mono`}
        />
      </Field>
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="font-medium">{t("provisioning.command")}</span>
          <button
            type="button"
            onClick={() => {
              void copy("command", command);
            }}
            className={`${BUTTON} ml-auto`}
          >
            {copied === "command" ? t("provisioning.copied") : t("provisioning.copy")}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-(--radius-control) bg-surface-sunken px-2 py-1 text-data">
          {command}
        </pre>
        <p className="mt-1 text-ink-muted">{t("provisioning.commandHint")}</p>
      </div>
      <div>
        <button type="button" onClick={onDismiss} className={BUTTON}>
          {t("provisioning.dismiss")}
        </button>
      </div>
    </div>
  );
}

const ENROLLMENT_CLASS: Record<ClusterEnrollment["state"], string> = {
  pending: "bg-surface-sunken text-ink",
  claimed: "bg-accent-soft text-accent",
  done: "bg-state-up-soft text-state-up",
  failed: "bg-state-down-soft text-state-down",
  expired: "bg-state-warn-soft text-state-warn",
};

/** The last enrollments of the cluster: the joins of its nodes. */
function EnrollmentsSection({ clusterId }: { clusterId: string }) {
  const { t } = useTranslation();
  const id = useId();
  const enrollments = useEnrollments(clusterId);
  return (
    <section className={FIELDSET} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="font-semibold">
        {t("provisioning.enrollments")}
      </h2>
      <p className="text-ink-muted">{t("provisioning.enrollmentsHint")}</p>
      {enrollments.isPending ? (
        <p className="text-ink-muted">{t("list.loading")}</p>
      ) : enrollments.isError ? (
        <p role="alert" className="text-state-down">
          ■ {enrollments.error.message}
        </p>
      ) : enrollments.data.length === 0 ? (
        <p className="text-ink-muted">{t("provisioning.noEnrollment")}</p>
      ) : (
        <ul className="flex flex-col">
          {enrollments.data.map((e) => (
            <li key={e.id} className="border-b border-line/60 py-1 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 ${ENROLLMENT_CLASS[e.state]}`}>
                  {t(`provisioning.enrollmentState.${e.state}`)}
                </span>
                <span className="font-mono">{e.nodename}</span>
                {e.node_addr !== e.nodename && (
                  <span className="font-mono text-ink-muted">{e.node_addr}</span>
                )}
                {e.claimed_by !== null && e.claimed_by !== undefined && (
                  <span className="text-ink-muted">
                    {t("provisioning.claimedBy", { node: e.claimed_by })}
                  </span>
                )}
                <span className="ml-auto text-ink-muted">
                  <DateTime value={e.updated} />
                </span>
              </div>
              {e.message !== "" && (
                <p className={e.state === "failed" ? "text-state-down" : "text-ink-muted"}>
                  {e.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
