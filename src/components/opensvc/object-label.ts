import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { readProp } from "@/lib/row";
import type { PeekStep } from "@/lib/peek-trail";
import { fromInstanceId, instanceName, pickInstanceRow } from "@/features/instances/instance-id";

/**
 * Name of an object, for the panel breadcrumb.
 *
 * The path carries ids only — a uuid says nothing to a reader — so each step is read
 * once and cached. The queries reuse the keys of the panels themselves where the
 * shape allows, so opening a record one has already seen costs nothing.
 */
async function fetchLabel(step: PeekStep): Promise<string> {
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  switch (step.kind) {
    case "node": {
      const { data } = await api.GET("/nodes/{node_id}", {
        params: { path: { node_id: step.id }, query: { props: "nodename" } },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      return text(readProp(rows[0] ?? {}, "nodename")) || step.id;
    }
    case "service": {
      const { data } = await api.GET("/services/{svc_id}", {
        params: { path: { svc_id: step.id }, query: { props: "svcname" } },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      return text(readProp(rows[0] ?? {}, "svcname")) || step.id;
    }
    case "instance": {
      // An instance is named by its pair: the two names are read from its row.
      const key = fromInstanceId(step.id);
      if (key === null) return step.id;
      const { data } = await api.GET("/services/{svc_id}/instances/{node_id}", {
        params: {
          path: { svc_id: key.svcId, node_id: key.nodeId },
          query: { props: "services.svcname,nodes.nodename,mon_vmname" },
        },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      const row = pickInstanceRow(rows, key.vmname) ?? {};
      const svc = text(readProp(row, "services.svcname"));
      const node = text(readProp(row, "nodes.nodename"));
      return svc === "" && node === "" ? step.id : instanceName(svc, node, key.vmname);
    }
    case "group": {
      // A team is named by an integer id: its role is what a reader recognises.
      const { data } = await api.GET("/groups/{group_id}", {
        params: { path: { group_id: step.id }, query: { props: "role" } },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      return text(readProp(rows[0] ?? {}, "role")) || step.id;
    }
    case "tag": {
      // No tag can be read by its char(36) id alone: the list is read and searched,
      // as `useTag` does.
      const { data } = await api.GET("/tags", {
        params: { query: { props: "tag_id,tag_name", limit: 0 } },
      });
      const rows = Array.isArray(data?.data) ? data.data : [];
      const row = rows.find((r) => readProp(r, "tag_id") === step.id);
      return text(readProp(row ?? {}, "tag_name")) || step.id;
    }
    // An application code names itself: the id is the code.
    case "app":
    default:
      return step.id;
  }
}

/** Names of a whole path, in order, falling back to the id while one is loading. */
export function useObjectLabels(trail: PeekStep[]): string[] {
  const results = useQueries({
    queries: trail.map((step) => ({
      queryKey: ["object-label", step.kind, step.id],
      staleTime: 5 * 60 * 1000,
      queryFn: () => fetchLabel(step),
    })),
  });
  return trail.map((step, index) => results[index]?.data ?? step.id);
}
