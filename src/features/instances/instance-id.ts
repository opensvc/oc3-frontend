/**
 * An instance has no id of its own exposed by apicollector: it is named by the
 * service / node pair, as in `GET /services/{svc_id}/instances/{node_id}`. Both are
 * UUIDs, which never contain "@".
 */
export function toInstanceId(svcId: string | undefined, nodeId: string | undefined) {
  return svcId === undefined || nodeId === undefined ? undefined : `${svcId}@${nodeId}`;
}

export function fromInstanceId(id: string): { svcId: string; nodeId: string } | null {
  const [svcId, nodeId, extra] = id.split("@");
  return svcId === undefined ||
    nodeId === undefined ||
    extra !== undefined ||
    svcId === "" ||
    nodeId === ""
    ? null
    : { svcId, nodeId };
}
