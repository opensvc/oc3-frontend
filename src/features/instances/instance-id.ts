/**
 * Une instance n'a pas d'identifiant propre exposé par apicollector : elle est
 * désignée par le couple service / node, comme dans `GET /services/{svc_id}/instances/{node_id}`.
 * Les deux sont des UUID, qui ne contiennent jamais « @ ».
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
