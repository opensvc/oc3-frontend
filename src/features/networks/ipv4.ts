/** Calcul d'une plage IPv4, pour l'aperçu du formulaire de réseau. */

function toInt(address: string): number | null {
  const parts = address.trim().split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const byte = Number(part);
    if (byte > 255) return null;
    value = value * 256 + byte;
  }
  return value;
}

function toAddress(value: number): string {
  return [24, 16, 8, 0].map((shift) => String(Math.floor(value / 2 ** shift) % 256)).join(".");
}

export interface Ipv4Range {
  /** Adresse de réseau correspondant au préfixe. */
  network: string;
  /** Vrai quand l'adresse saisie a des bits d'hôte : ce n'est pas l'adresse de réseau. */
  hostBitsSet: boolean;
  first: string;
  last: string;
  broadcast: string;
  /** Adresses utilisables, hors réseau et diffusion. */
  usable: number;
}

/**
 * Plage d'un réseau IPv4, calculée comme les colonnes générées de la table `networks`
 * (`begin`, `end`, `broadcast`). `null` pour une saisie incomplète ou invalide.
 */
export function ipv4Range(address: string, prefix: number): Ipv4Range | null {
  const value = toInt(address);
  if (value === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const size = 2 ** (32 - prefix);
  const network = Math.floor(value / size) * size;
  return {
    network: toAddress(network),
    hostBitsSet: network !== value,
    first: toAddress(Math.min(network + 1, network + size - 1)),
    last: toAddress(Math.max(network + size - 2, network)),
    broadcast: toAddress(network + size - 1),
    usable: Math.max(size - 2, 0),
  };
}

/** Vrai si l'adresse appartient à la plage. */
export function ipv4Contains(range: Ipv4Range, prefix: number, address: string): boolean {
  const value = toInt(address);
  const network = toInt(range.network);
  if (value === null || network === null) return false;
  return Math.floor(value / 2 ** (32 - prefix)) * 2 ** (32 - prefix) === network;
}
