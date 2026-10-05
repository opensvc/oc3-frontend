import { ResourceStatusTable } from "@/features/services/related/ServiceResources";
import { useInstanceResources } from "./use-instance-resources";

/** The resources of the instance, as its node reports them. */
export function InstanceResources({ instanceId, locale }: { instanceId: string; locale: string }) {
  const resources = useInstanceResources(instanceId);
  return (
    <ResourceStatusTable
      rows={resources.data}
      isPending={resources.isPending}
      errorMessage={resources.isError ? resources.error.message : null}
      grouped={false}
      locale={locale}
    />
  );
}
