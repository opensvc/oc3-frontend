import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import { useTeams } from "@/features/groups/use-teams";
import { ObjectIcon } from "@/components/opensvc/ObjectIcon";
import { SlideOver } from "@/components/ui/SlideOver";
import { ipv4Contains, ipv4Range } from "./ipv4";

type NetworkRow = components["schemas"]["NetworkRow"];

const INPUT = "h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2";

function toInt(value: string): number | undefined {
  return value.trim() === "" ? undefined : Number(value);
}

/**
 * Declaring a network. The Networks view lists node addresses, not the declared
 * networks: a network once created shows through the node addresses it contains,
 * whose Network column takes its name, and in the network picker of a segment. The range preview reproduces the computation of the table's
 * generated columns; the server stays the only judge (network address, gateway,
 * uniqueness).
 */
export function CreateNetworkPanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (network: NetworkRow) => void;
}) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const teams = useTeams();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [prefix, setPrefix] = useState("24");
  const [gateway, setGateway] = useState("");
  const [pvid, setPvid] = useState("");
  const [prio, setPrio] = useState("0");
  const [team, setTeam] = useState("");
  const [comment, setComment] = useState("");

  const prefixValue = Number(prefix);
  const range = ipv4Range(address, prefixValue);
  const gatewayOutside =
    range !== null && gateway.trim() !== "" && !ipv4Contains(range, prefixValue, gateway);

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/networks", {
        body: {
          network: address.trim(),
          netmask: prefixValue,
          ...(name.trim() === "" ? {} : { name: name.trim() }),
          ...(gateway.trim() === "" ? {} : { gateway: gateway.trim() }),
          ...(toInt(pvid) === undefined ? {} : { pvid: toInt(pvid) }),
          ...(toInt(prio) === undefined ? {} : { prio: toInt(prio) }),
          ...(team === "" ? {} : { team_responsible: team }),
          ...(comment.trim() === "" ? {} : { comment: comment.trim() }),
        },
      });
      if (error !== undefined) throw new Error(problemText(error));
      const created = data.data[0];
      if (created === undefined) throw new Error(t("networks.create.noRow"));
      return created;
    },
    onSuccess: async (created) => {
      setName("");
      setAddress("");
      setPrefix("24");
      setGateway("");
      setPvid("");
      setPrio("0");
      setTeam("");
      setComment("");
      // The addresses of the new network change their Network column.
      await queryClient.invalidateQueries({ queryKey: ["ips"] });
      // The segment form offers it as a parent.
      await queryClient.invalidateQueries({ queryKey: ["networks"] });
      await queryClient.invalidateQueries({ queryKey: ["ip"] });
      await queryClient.invalidateQueries({ queryKey: ["node"] });
      onCreated(created);
      onClose();
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  const field = (id: string, label: string, input: React.ReactNode, hint?: React.ReactNode) => (
    <div className="mb-3">
      <label className="mb-1 block font-medium" htmlFor={id}>
        {label}
      </label>
      {input}
      {hint}
    </div>
  );

  return (
    <SlideOver
      open={open}
      title={t("networks.create.title")}
      onClose={onClose}
      closeLabel={t("detail.close")}
      resizeLabel={t("detail.resize")}
      leading={<ObjectIcon kind="network" />}
    >
      <p className="mb-3 text-ink-muted">{t("networks.create.intro")}</p>
      <form onSubmit={onSubmit}>
        <div className="mb-3 grid grid-cols-[1fr_6rem] gap-2">
          <div>
            <label className="mb-1 block font-medium" htmlFor="create-network-address">
              {t("networks.create.fields.network")}
            </label>
            <input
              id="create-network-address"
              required
              inputMode="decimal"
              placeholder="192.168.10.0"
              value={address}
              onChange={(event) => {
                setAddress(event.target.value);
              }}
              className={`${INPUT} font-mono`}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium" htmlFor="create-network-prefix">
              {t("networks.create.fields.netmask")}
            </label>
            <input
              id="create-network-prefix"
              required
              type="number"
              min={0}
              max={32}
              value={prefix}
              onChange={(event) => {
                setPrefix(event.target.value);
              }}
              className={`${INPUT} font-mono`}
            />
          </div>
        </div>

        {range !== null && (
          <div className="mb-3 rounded-(--radius-control) border border-line bg-surface px-3 py-2 text-data">
            {range.hostBitsSet ? (
              <p className="text-state-warn">
                ▲{" "}
                {t("networks.create.hostBits", {
                  network: `${range.network}/${String(prefixValue)}`,
                })}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAddress(range.network);
                  }}
                  className="underline underline-offset-2"
                >
                  {t("networks.create.useNetwork", { network: range.network })}
                </button>
              </p>
            ) : (
              <p>
                <code>
                  {range.first} – {range.last}
                </code>{" "}
                <span className="text-ink-muted">
                  {t("networks.create.preview", {
                    count: range.usable,
                    formatted: range.usable.toLocaleString(i18n.language),
                    broadcast: range.broadcast,
                  })}
                </span>
              </p>
            )}
          </div>
        )}

        {field(
          "create-network-name",
          t("networks.create.fields.name"),
          <input
            id="create-network-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            className={INPUT}
          />,
          <p className="mt-1 text-ink-muted">{t("networks.create.nameHint")}</p>,
        )}

        {field(
          "create-network-gateway",
          t("networks.create.fields.gateway"),
          <input
            id="create-network-gateway"
            inputMode="decimal"
            value={gateway}
            onChange={(event) => {
              setGateway(event.target.value);
            }}
            placeholder={range === null || range.hostBitsSet ? "" : range.first}
            className={`${INPUT} font-mono`}
          />,
          gatewayOutside ? (
            <p className="mt-1 text-state-warn">▲ {t("networks.create.gatewayOutside")}</p>
          ) : undefined,
        )}

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block font-medium" htmlFor="create-network-pvid">
              {t("networks.create.fields.pvid")}
            </label>
            <input
              id="create-network-pvid"
              type="number"
              min={0}
              max={4094}
              value={pvid}
              onChange={(event) => {
                setPvid(event.target.value);
              }}
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1 block font-medium" htmlFor="create-network-prio">
              {t("networks.create.fields.prio")}
            </label>
            <input
              id="create-network-prio"
              type="number"
              min={0}
              max={99}
              value={prio}
              onChange={(event) => {
                setPrio(event.target.value);
              }}
              className={INPUT}
            />
          </div>
        </div>

        {field(
          "create-network-team",
          t("networks.create.fields.team_responsible"),
          <select
            id="create-network-team"
            value={team}
            onChange={(event) => {
              setTeam(event.target.value);
            }}
            className={INPUT}
          >
            <option value="">{t("networks.create.teamDefault")}</option>
            {(teams.data ?? []).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>,
        )}

        {field(
          "create-network-comment",
          t("networks.create.fields.comment"),
          <input
            id="create-network-comment"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
            }}
            className={INPUT}
          />,
        )}

        {create.isError && (
          <p role="alert" className="mb-3 text-state-down">
            ■ {create.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={create.isPending}
          className="h-8 rounded-(--radius-control) bg-accent px-3 font-medium text-accent-ink disabled:opacity-60"
        >
          {create.isPending ? t("networks.create.submitting") : t("networks.create.submit")}
        </button>
      </form>
    </SlideOver>
  );
}
