import * as React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Crosshair from "../Crosshair";

describe("Crosshair", () => {
  it.each([false, true])(
    "is locked to the viewport centre (isMobile=%s)",
    (isMobile) => {
      const { container } = render(
        <Crosshair
          crosshairSpread={0}
          hitMarker={false}
          hitRingKey={0}
          isGallery={false}
          isMobile={isMobile}
        />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root.style.top).toBe("50%");
      expect(root.style.left).toBe("50%");
      expect(root.style.transform).toBe("translate(-50%, -50%)");
    },
  );
});
