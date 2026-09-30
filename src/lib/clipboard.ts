/**
 * Copies a text to the clipboard. The Clipboard API only exists in a secure
 * context (HTTPS or localhost): served over plain HTTP, a collector falls back on
 * the selection of a hidden field, which every browser still honours.
 */
export async function copyText(text: string): Promise<void> {
  const clipboard: Clipboard | undefined = navigator.clipboard;
  if (clipboard !== undefined) {
    await clipboard.writeText(text);
    return;
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  // Deprecated, but the only way left without a secure context.
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("copy refused");
}
