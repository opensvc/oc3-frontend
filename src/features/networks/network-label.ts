import type { components } from "@/lib/api/schema";

type NetworkRow = components["schemas"]["NetworkRow"];

/** How a network is named in the picker: its name, then its address. */
export function networkLabel(network: NetworkRow): string {
  const address = `${network.network ?? ""}/${String(network.netmask ?? "")}`;
  return network.name === undefined || network.name === "" ? address : `${network.name} ${address}`;
}
