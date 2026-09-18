import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { problemText } from "@/lib/api/problem";
import type { TagEditControl } from "@/components/opensvc/ObjectTags";
import { toTagRows } from "./tag-row";

export type TagTargetKind = "node" | "service";

/**
 * Rattachement et détachement des tags d'un node ou d'un service depuis son panneau
 * de détail.
 *
 * Les tags proposés viennent de `GET /…/candidate_tags`, qui écarte ceux déjà
 * attachés et ceux qu'exclut un tag déjà en place ; la liste n'est demandée qu'à
 * l'ouverture du sélecteur. Le rattachement passe par `POST /tags/nodes` et
 * `/tags/services`, qui acceptent le `tag_id` char(36) que renvoient les listes,
 * contrairement à `/tags/{tag_id}/…` qui attend l'identifiant entier (voir notes.md) ;
 * le détachement, par `DELETE` sur les mêmes routes. Comme dans l'ancien collector,
 * ces actions ne sont proposées qu'au responsable de
 * l'objet (`am_i_responsible`) ; la compatibilité des exclusions reste vérifiée par
 * l'API, dont le refus s'affiche tel quel.
 */
export function useTagEdit(kind: TagTargetKind, objectId: string | undefined): TagEditControl {
  const queryClient = useQueryClient();
  // Rattaché à l'objet plutôt qu'un simple booléen : passer à un autre node referme
  // le sélecteur sans effet de bord.
  const [pickingFor, setPickingFor] = useState<string | undefined>(undefined);
  const picking = objectId !== undefined && pickingFor === objectId;
  // Même précaution pour la confirmation : une question laissée ouverte ne doit pas
  // détacher le tag d'un autre objet.
  const [confirming, setConfirming] = useState<{ objectId: string; tagId: string } | null>(null);

  // 200 si l'utilisateur est responsable, 403 sinon : seul le statut compte.
  const responsible = useQuery({
    queryKey: [kind, objectId, "am_i_responsible"],
    enabled: objectId !== undefined,
    queryFn: async () => {
      const { error, response } =
        kind === "node"
          ? await api.GET("/nodes/{node_id}/am_i_responsible", {
              params: { path: { node_id: objectId ?? "" } },
            })
          : await api.GET("/services/{svc_id}/am_i_responsible", {
              params: { path: { svc_id: objectId ?? "" } },
            });
      if (response.status === 403) return false;
      if (error !== undefined) throw new Error(problemText(error));
      return true;
    },
  });

  const candidates = useQuery({
    queryKey: [kind, objectId, "candidate_tags"],
    enabled: picking,
    queryFn: async () => {
      const query = { orderby: "tag_name", limit: 0 };
      const { data, error } =
        kind === "node"
          ? await api.GET("/nodes/{node_id}/candidate_tags", {
              params: { path: { node_id: objectId ?? "" }, query },
            })
          : await api.GET("/services/{svc_id}/candidate_tags", {
              params: { path: { svc_id: objectId ?? "" }, query },
            });
      if (error !== undefined) throw new Error(problemText(error));
      return toTagRows(data.data);
    },
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [kind, objectId, "tags"] }),
      queryClient.invalidateQueries({ queryKey: [kind, objectId, "candidate_tags"] }),
      queryClient.invalidateQueries({ queryKey: ["tags"] }),
    ]);

  const attach = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } =
        kind === "node"
          ? await api.POST("/tags/nodes", { body: { tag_id: tagId, node_id: objectId ?? "" } })
          : await api.POST("/tags/services", { body: { tag_id: tagId, svc_id: objectId ?? "" } });
      if (error !== undefined) throw new Error(problemText(error));
    },
    onSuccess: invalidate,
  });

  const detach = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } =
        kind === "node"
          ? await api.DELETE("/tags/nodes", { body: { tag_id: tagId, node_id: objectId ?? "" } })
          : await api.DELETE("/tags/services", { body: { tag_id: tagId, svc_id: objectId ?? "" } });
      if (error !== undefined) throw new Error(problemText(error));
    },
    onSuccess: invalidate,
  });

  return {
    allowed: responsible.data === true,
    picking,
    setPicking: (next) => {
      attach.reset();
      setPickingFor(next ? objectId : undefined);
    },
    candidates: candidates.data,
    candidatesPending: candidates.isPending,
    candidatesError: candidates.isError ? candidates.error.message : null,
    attach: (tagId) => {
      attach.mutate(tagId);
    },
    attaching: attach.isPending,
    attachError: attach.isError ? attach.error.message : null,
    confirmingDetach:
      confirming !== null && confirming.objectId === objectId ? confirming.tagId : null,
    askDetach: (tagId) => {
      detach.reset();
      setConfirming(tagId === null || objectId === undefined ? null : { objectId, tagId });
    },
    detach: (tagId) => {
      setConfirming(null);
      detach.mutate(tagId);
    },
    detaching: detach.isPending ? (detach.variables ?? null) : null,
    detachError: detach.isError ? detach.error.message : null,
  };
}
