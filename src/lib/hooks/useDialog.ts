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

/** Moves focus into a dialog when it opens and gives it back when it closes. */
export function useDialogFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, [open]);
  return ref;
}

/**
 * Esc closes this dialog only. Capture phase, so the game's own Esc handler
 * (pause) does not also run.
 */
export function useEscapeToClose(open: boolean, close: () => void): void {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      closeRef.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);
}
