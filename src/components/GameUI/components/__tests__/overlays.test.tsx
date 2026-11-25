import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HitDirectionIndicator from "../HitDirectionIndicator";
import BonusRoundOverlay from "../BonusRoundOverlay";

describe("HitDirectionIndicator", () => {
  it("renders nothing when hitAngle is null", () => {
    const { container } = render(<HitDirectionIndicator hitAngle={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a fixed full-screen overlay when hitAngle is 0", () => {
    const { container } = render(<HitDirectionIndicator hitAngle={0} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay.style.position).toBe("fixed");
    expect(overlay.style.pointerEvents).toBe("none");
  });

  it("rotates its inner box by hitAngle", () => {
    const { container } = render(<HitDirectionIndicator hitAngle={1.5} />);
    const inner = container.firstChild?.firstChild as HTMLElement;
    expect(inner.style.transform).toBe("rotate(1.5rad)");
  });
});

describe("BonusRoundOverlay", () => {
  it("renders nothing when visible is false", () => {
    const { container } = render(
      <BonusRoundOverlay visible={false} isMinimal={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows BONUS ROUND! and x2 POINTS when visible", () => {
    render(<BonusRoundOverlay visible={true} isMinimal={false} />);
    expect(screen.getByText(/BONUS ROUND!/i)).toBeInTheDocument();
    expect(screen.getByText(/x2 POINTS/i)).toBeInTheDocument();
  });

  it("has 30px heading font size when isMinimal is false", () => {
    render(<BonusRoundOverlay visible={true} isMinimal={false} />);
    const heading = screen.getByText(/BONUS ROUND!/i) as HTMLElement;
    expect(heading.style.fontSize).toBe("30px");
  });

  it("has 18px heading font size when isMinimal is true", () => {
    render(<BonusRoundOverlay visible={true} isMinimal={true} />);
    const heading = screen.getByText(/BONUS ROUND!/i) as HTMLElement;
    expect(heading.style.fontSize).toBe("18px");
  });
});
