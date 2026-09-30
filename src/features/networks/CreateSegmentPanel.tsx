import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { SlideOver } from "@/components/ui/SlideOver";
import { ipv4Value } from "./ipv4";
import { networkLabel } from "./network-label";

type NetworkRow = components["schemas"]["NetworkRow"];
type SegmentRow = components["schemas"]["NetworkSegmentRow"];
type SegmentType = "static" | "dynamic";

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2";

const SEGMENT_TYPES: SegmentType[] = ["static", "dynamic"];

function useDeclaredNetworks(enabled: boolean) {
  return useQuery({
    queryKey: ["networks"],
    enabled,
    queryFn: async () => {
      const { data, error } = await api.GET("/networks", {
        params: {
          query: { props: "id,name,network,netmask,begin,end", orderby: "network", limit: 0 },
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const rows: NetworkRow[] = Array.isArray(data.data) ? data.data : [];
      return rows;
    },
  });
}

/** What is wrong with the range typed, checked as the server does; null when valid. */
function rangeProblem(
  network: NetworkRow | undefined,
  begin: string,
  end: string,
): { field: "begin" | "end"; key: string } | null {
  const low = ipv4Value(network?.begin ?? "");
  const high = ipv4Value(network?.end ?? "");
  const first = ipv4Value(begin);
  const last = ipv4Value(end);
  if (begin.trim() !== "") {
    if (first === null) return { field: "begin", key: "invalid" };
    if (low !== null && high !== null && (first < low || first > high))
      return { field: "begin", key: "outside" };
  }
  if (end.trim() !== "") {
    if (last === null) return { field: "end", key: "invalid" };
    if (low !== null && high !== null && (last < low || last > high))
      return { field: "end", key: "outside" };
  }
  if (first !== null && last !== null && last < first) return { field: "end", key: "before" };
  return null;
}

/**
 * Declaring a segment of a network: an address range whose responsible groups may
 * allocate its addresses, as the historical "Add network segment" form. The parent
 * network is picked among the declared ones; the range must lie inside it, which
 * is checked here as the user types. The server alone knows the other segments of
 * the network and refuses an overlap. The caller's primary group becomes
 * responsible for the segment.
 */
export function CreateSegmentPanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (segment: SegmentRow, network: NetworkRow | undefined) => void;
}) {
  const { t, i18n } = useTranslation();
  const networks = useDeclaredNetworks(open);
  const [netId, setNetId] = useState("");
  const [segType, setSegType] = useState<SegmentType>("static");
  const [begin, setBegin] = useState("");
  const [end, setEnd] = useState("");

  const network = networks.data?.find((row) => String(row.id) === netId);
  const problem = network === undefined ? null : rangeProblem(network, begin, end);
  const first = ipv4Value(begin);
  const last = ipv4Value(end);
  const count = problem === null && first !== null && last !== null ? last - first + 1 : null;

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/networks/{net_id}/segments", {
        params: { path: { net_id: netId } },
        body: { seg_type: segType, seg_begin: begin.trim(), seg_end: end.trim() },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const created = data.data[0];
      if (created === undefined) throw new Error(t("networks.segment.noRow"));
      return created;
    },
    onSuccess: (created) => {
      setBegin("");
      setEnd("");
      setSegType("static");
      onCreated(created, network);
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (problem !== null) return;
    create.mutate();
  }

  const problemFor = (field: "begin" | "end") =>
    problem?.field === field ? (
      <p id={`create-segment-${field}-problem`} className="mt-1 text-state-down">
        ■ {t(`networks.segment.problems.${problem.key}`)}
      </p>
    ) : undefined;

  const field = (id: string, label: string, input: ReactNode, hint?: ReactNode) => (
    <div className="mb-3">
      <label className="mb-1 block font-medium" htmlFor={id}>
        {label}
      </label>
      {input}
      {hint}
    </div>
  );

  const address = (name: "begin" | "end", value: string, set: (value: string) => void) => (
    <input
      id={`create-segment-${name}`}
      required
      inputMode="decimal"
      value={value}
      placeholder={network?.[name] ?? ""}
      aria-invalid={problem?.field === name}
      aria-describedby={problem?.field === name ? `create-segment-${name}-problem` : undefined}
      onChange={(event) => {
        set(event.target.value);
        create.reset();
      }}
      className={`${INPUT} font-mono ${problem?.field === name ? "border-state-down" : ""}`}
    />
  );

  return (
    <SlideOver
      open={open}
      title={t("networks.segment.title")}
      onClose={onClose}
      closeLabel={t("detail.close")}
      resizeLabel={t("detail.resize")}
      leading={<ObjectIcon kind="network" />}
    >
      <p className="mb-3 text-ink-muted">{t("networks.segment.intro")}</p>
      <form onSubmit={onSubmit}>
        {field(
          "create-segment-network",
          t("networks.segment.fields.network"),
          <select
            id="create-segment-network"
            required
            value={netId}
            onChange={(event) => {
              setNetId(event.target.value);
              create.reset();
            }}
            className={INPUT}
          >
            <option value="" disabled>
              {networks.isPending ? t("networks.segment.loading") : t("networks.segment.pick")}
            </option>
            {(networks.data ?? []).map((row) => (
              <option key={row.id} value={String(row.id)}>
                {networkLabel(row)}
              </option>
            ))}
          </select>,
          networks.isError ? (
            <p className="mt-1 text-state-down">■ {networks.error.message}</p>
          ) : networks.data?.length === 0 ? (
            <p className="mt-1 text-ink-muted">{t("networks.segment.noNetwork")}</p>
          ) : network !== undefined ? (
            <p className="mt-1 text-ink-muted">
              {t("networks.segment.networkRange")}{" "}
              <code>
                {network.begin} – {network.end}
              </code>
            </p>
          ) : undefined,
        )}

        <fieldset className="mb-3">
          <legend className="mb-1 font-medium">{t("networks.segment.fields.seg_type")}</legend>
          <div className="grid gap-1">
            {SEGMENT_TYPES.map((type) => (
              <label key={type} className="flex items-start gap-2">
                <input
                  type="radio"
                  name="create-segment-type"
                  value={type}
                  checked={segType === type}
                  onChange={() => {
                    setSegType(type);
                  }}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">{t(`networks.segment.types.${type}`)}</span>
                  <span className="block text-ink-muted">
                    {t(`networks.segment.typeHints.${type}`)}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block font-medium" htmlFor="create-segment-begin">
              {t("networks.segment.fields.seg_begin")}
            </label>
            {address("begin", begin, setBegin)}
            {problemFor("begin")}
          </div>
          <div>
            <label className="mb-1 block font-medium" htmlFor="create-segment-end">
              {t("networks.segment.fields.seg_end")}
            </label>
            {address("end", end, setEnd)}
            {problemFor("end")}
          </div>
        </div>

        {count !== null && (
          <p className="mb-3 rounded-(--radius-control) border border-line bg-surface px-3 py-2 text-data text-ink-muted">
            {t("networks.segment.preview", {
              count,
              formatted: count.toLocaleString(i18n.language),
            })}
          </p>
        )}

        {create.isError && (
          <p role="alert" className="mb-3 text-state-down">
            ■ {create.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={create.isPending || netId === ""}
          className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {create.isPending ? t("networks.segment.submitting") : t("networks.segment.submit")}
        </button>
      </form>
    </SlideOver>
  );
}
