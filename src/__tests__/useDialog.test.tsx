import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useDialogFocus, useEscapeToClose } from "../lib/hooks/useDialog";

const Dialog = ({ name, onClose }: { name: string; onClose: () => void }) => {
  const ref = useDialogFocus(true);
  useEscapeToClose(true, onClose);
  return (
    <div ref={ref} role="dialog" aria-label={name} tabIndex={-1}>
      <button>{name} one</button>
      <button>{name} two</button>
    </div>
  );
};

describe("dialog hooks", () => {
  it("sends Esc to the newest dialog only", () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <>
        <Dialog name="first" onClose={first} />
        <Dialog name="second" onClose={second} />
      </>,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("keeps Tab and Shift+Tab inside the dialog", () => {
    render(<Dialog name="only" onClose={vi.fn()} />);
    const one = screen.getByText("only one");
    const two = screen.getByText("only two");
    two.focus();
    fireEvent.keyDown(two, { key: "Tab" });
    expect(document.activeElement).toBe(one);
    fireEvent.keyDown(one, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(two);
  });
});
