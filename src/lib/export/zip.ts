/**
 * A ZIP archive built in the browser, for the formats that are one: an XLSX
 * workbook is a handful of XML files in a ZIP. A few dozen lines rather than a
 * dependency: only what a workbook needs is covered — a flat list of files, no
 * encryption, no ZIP64, hence archives under 4 GiB and 65535 files.
 *
 * Files are deflated with the browser's own `CompressionStream` when it offers
 * the raw deflate format, and stored as they are otherwise.
 */

export interface ZipEntry {
  /** Path in the archive, in ASCII. */
  name: string;
  data: Uint8Array;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** The data deflated, or null where the browser cannot do it. */
async function deflate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    const stream = new Blob([data as BlobPart])
      .stream()
      .pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    // "deflate-raw" is the most recent of the formats: refused by an older browser.
    return null;
  }
}

/** A fixed-size header, written field after field in little-endian. */
function header(size: number) {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  let at = 0;
  return {
    bytes,
    u16(value: number) {
      view.setUint16(at, value, true);
      at += 2;
    },
    u32(value: number) {
      view.setUint32(at, value, true);
      at += 4;
    },
  };
}

export async function zip(entries: ZipEntry[]): Promise<Blob> {
  const encoder = new TextEncoder();
  const now = new Date();
  // MS-DOS date and time, as the format wants them.
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const deflated = await deflate(entry.data);
    const stored = deflated ?? entry.data;
    const method = deflated === null ? 0 : 8;
    const crc = crc32(entry.data);

    const local = header(30);
    local.u32(0x04034b50);
    local.u16(20); // version needed
    local.u16(0); // flags
    local.u16(method);
    local.u16(time);
    local.u16(date);
    local.u32(crc);
    local.u32(stored.length);
    local.u32(entry.data.length);
    local.u16(name.length);
    local.u16(0); // extra field
    parts.push(local.bytes, name, stored);

    const central = header(46);
    central.u32(0x02014b50);
    central.u16(20); // version made by
    central.u16(20); // version needed
    central.u16(0); // flags
    central.u16(method);
    central.u16(time);
    central.u16(date);
    central.u32(crc);
    central.u32(stored.length);
    central.u32(entry.data.length);
    central.u16(name.length);
    central.u16(0); // extra field
    central.u16(0); // comment
    central.u16(0); // disk number
    central.u16(0); // internal attributes
    central.u32(0); // external attributes
    central.u32(offset);
    directory.push(central.bytes, name);

    offset += 30 + name.length + stored.length;
  }

  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
  const end = header(22);
  end.u32(0x06054b50);
  end.u16(0); // this disk
  end.u16(0); // disk of the directory
  end.u16(entries.length);
  end.u16(entries.length);
  end.u32(directorySize);
  end.u32(offset);
  end.u16(0); // comment

  return new Blob([...parts, ...directory, end.bytes] as BlobPart[], { type: "application/zip" });
}
