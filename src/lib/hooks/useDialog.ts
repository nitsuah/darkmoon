import { useEffect, useRef } from "react";

export const OPEN_HELP_EVENT = "darkmoon-open-help";

export function openHelp(): void {
  window.dispatchEvent(new CustomEvent(OPEN_HELP_EVENT));
}

export function isTouchDevice(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Moves focus into a dialog when it opens, keeps Tab inside it, and gives
 * focus back when it closes.
 */
export function useDialogFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.focus();
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey
        ? index <= 0
          ? items.length - 1
          : index - 1
        : (index + 1) % items.length;
      e.preventDefault();
      // The game's Tab (next weapon) must not see keys used inside a dialog.
      e.stopPropagation();
      items[next]?.focus();
    };
    dialog?.addEventListener("keydown", onTab);
    return () => {
      dialog?.removeEventListener("keydown", onTab);
      previous?.focus?.();
    };
  }, [open]);
  return ref;
}

/** Open dialogs, oldest first: only the newest one answers Esc. */
const escapeStack: object[] = [];

/**
 * Esc closes the newest dialog only. Capture phase, so the game's own Esc
 * handler (pause) does not also run.
 */
export function useEscapeToClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const token = {};
    escapeStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || escapeStack[escapeStack.length - 1] !== token)
        return;
      e.stopImmediatePropagation();
      closeRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      escapeStack.splice(escapeStack.indexOf(token), 1);
    };
  }, [open]);
}
