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
 * A node's `os_name` to its logo. Table taken from `os_class_h` in
 * `init/static/js/osvc/tables/decorators.js` of the historical collector, with the
 * same images: `sunos` and `solaris` share the Solaris logo, `osf1` is Tru64.
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
 * Operating system logo, at 16 px.
 *
 * An unknown or absent system leaves an empty slot of the same size: the names stay
 * aligned in the column. The name of the system is given as alternative text and as a
 * tooltip, the logo alone not being enough for everyone.
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
