import aix from "@/assets/os/aix.png";
import darwin from "@/assets/os/darwin.png";
import freebsd from "@/assets/os/freebsd.png";
import hpux from "@/assets/os/hpux.png";
import linux from "@/assets/os/linux.png";
import opensolaris from "@/assets/os/opensolaris.png";
import solaris from "@/assets/os/solaris.png";
import tru64 from "@/assets/os/tru64.png";
import vmware from "@/assets/os/vmware.png";
import windows from "@/assets/os/windows.png";

/**
 * `os_name` d'un node vers son logo. Table reprise de `os_class_h` dans
 * `init/static/js/osvc/tables/decorators.js` du collector historique, avec les mêmes
 * images : `sunos` et `solaris` partagent le logo Solaris, `osf1` est Tru64.
 */
const LOGOS: Record<string, string> = {
  aix,
  darwin,
  freebsd,
  "hp-ux": hpux,
  linux,
  opensolaris,
  osf1: tru64,
  solaris,
  sunos: solaris,
  vmware,
  windows,
};

/**
 * Logo du système d'exploitation, à 16 px.
 *
 * Un système inconnu ou absent laisse un emplacement vide de même taille : les noms
 * restent alignés dans la colonne. Le nom du système est donné en texte alternatif
 * et en infobulle, le logo seul ne suffisant pas à tout le monde.
 */
export function OsLogo({ osName }: { osName: string | undefined }) {
  const src = osName === undefined ? undefined : LOGOS[osName.toLowerCase()];
  if (src === undefined)
    return <span aria-hidden="true" className="inline-block h-4 w-4 shrink-0" />;
  return (
    <img
      src={src}
      alt={osName}
      title={osName}
      width={16}
      height={16}
      className="h-4 w-4 shrink-0 object-contain"
    />
  );
}
