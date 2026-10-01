import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangleIcon, CloseIcon } from "@/components/ui/icons";
import { useImpersonate } from "./use-impersonate";

/**
 * Asks for the user to act as, by id or email, as the impersonation form of the
 * historical collector asks for a user id: quicker than finding the user in the
 * Users view, from which the user panel offers the same action. Modal: Escape, the cross or
 * a click beside it close it, the focus stays inside and goes back where it was.
 */
export function ImpersonateDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const id = useId();
  const [user, setUser] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const impersonate = useImpersonate(onClose);

  useEffect(() => {
    opener.current = document.activeElement;
    input.current?.focus();
    return () => {
      if (opener.current instanceof HTMLElement && document.contains(opener.current))
        opener.current.focus();
    };
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const value = user.trim();
    if (value !== "") impersonate.mutate(value);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      // The side panel listens for Escape too: it stays open under the dialog.
      event.stopPropagation();
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = [
      ...(dialog.current?.querySelectorAll<HTMLElement>("input, button:not([disabled])") ?? []),
    ];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-ink/20 px-4 pt-[15vh]"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-(--radius-panel) border border-line bg-surface-raised shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <h2 id={`${id}-title`} className="text-title font-semibold">
            {t("impersonation.dialogTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            title={t("detail.close")}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-(--radius-control) border border-line text-ink-muted hover:text-ink"
          >
            <CloseIcon />
            <span className="sr-only">{t("detail.close")}</span>
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3 p-3">
          <p className="text-ink-muted">{t("impersonation.hint")}</p>
          <div>
            <label htmlFor={`${id}-user`} className="mb-1 block font-medium">
              {t("impersonation.user")}
            </label>
            <input
              ref={input}
              id={`${id}-user`}
              value={user}
              onChange={(event) => {
                setUser(event.target.value);
                impersonate.reset();
              }}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={impersonate.isError}
              aria-describedby={impersonate.isError ? `${id}-error` : undefined}
              className="h-8 w-full rounded-(--radius-control) border border-line bg-surface px-2"
            />
          </div>
          {impersonate.isError && (
            <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-state-down">
              <AlertTriangleIcon className="shrink-0" />
              {impersonate.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-(--radius-control) border border-line px-3 hover:bg-surface-sunken"
            >
              {t("impersonation.cancel")}
            </button>
            <button
              type="submit"
              disabled={user.trim() === "" || impersonate.isPending}
              className="h-8 rounded-(--radius-control) bg-accent px-3 text-accent-ink disabled:opacity-60"
            >
              {t("impersonation.start")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
