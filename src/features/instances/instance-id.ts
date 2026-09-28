/**
 * An instance has no id of its own exposed by apicollector: it is named by the
 * service / node pair, as in `GET /services/{svc_id}/instances/{node_id}`, plus
 * the container name for an encapsulated service, which has one svcmon row per
 * container on each node (unique key node_id, svc_id, mon_vmname). The ids are
 * UUIDs, which never contain "@"; the container name comes last and is kept whole.
 */
export function toInstanceId(
  svcId: string | undefined,
  nodeId: string | undefined,
  vmname?: string | null,
) {
  if (svcId === undefined || nodeId === undefined) return undefined;
  return vmname === undefined || vmname === null || vmname === ""
    ? `${svcId}@${nodeId}`
    : `${svcId}@${nodeId}@${vmname}`;
}

export function fromInstanceId(
  id: string,
): { svcId: string; nodeId: string; vmname: string | undefined } | null {
  const [svcId, nodeId, ...rest] = id.split("@");
  if (svcId === undefined || nodeId === undefined || svcId === "" || nodeId === "") return null;
  const vmname = rest.length === 0 ? undefined : rest.join("@");
  return vmname === "" ? null : { svcId, nodeId, vmname };
}

/**
 * The row of an instance among those `GET /services/{svc_id}/instances/{node_id}`
 * returns: the one of its container, or the first for a plain instance.
 */
export function pickInstanceRow<T extends { mon_vmname?: string | null }>(
  rows: T[],
  vmname: string | undefined,
): T | undefined {
  return vmname === undefined ? rows[0] : rows.find((row) => row.mon_vmname === vmname);
}

/** "service @ node", with the container name of an encapsulated instance. */
export function instanceName(svc: string, node: string, vmname?: string | null) {
  return vmname === undefined || vmname === null || vmname === ""
    ? `${svc} @ ${node}`
    : `${svc} @ ${node} (${vmname})`;
}
