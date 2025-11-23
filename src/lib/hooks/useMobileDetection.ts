import { useState, useEffect } from "react";

/**
 * Hook to detect if the device is mobile/touch-enabled
 * Checks for touch capability and small screen size
 */
export const useMobileDetection = () => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Check for touch capability and small screen
      const hasTouchScreen =
        "ontouchstart" in window ||
        (typeof window !== "undefined" &&
          "navigator" in window &&
          (window.navigator.maxTouchPoints > 0 ||
            // @ts-expect-error - Legacy IE support
            window.navigator.msMaxTouchPoints > 0));
      const isSmallScreen = window.innerWidth <= 1024;
      setIsMobileDevice(hasTouchScreen && isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobileDevice;
};
