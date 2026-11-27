import React, { useEffect, useState } from "react";
import { Spinner } from "./21st.dev/Spinner";
import "../styles/Spinner.css";

/** Show elapsed time after this long, and offer a reload after the second. */
export const SLOW_AFTER_S = 5;
export const STUCK_AFTER_S = 20;

const LoadingSpinner: React.FC = () => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const start = window.performance.now();
    const timer = window.setInterval(
      () => setSeconds(Math.floor((window.performance.now() - start) / 1000)),
      1000,
    );
    return () => {
      window.clearInterval(timer);
      // How long the page chunk took: performance.getEntriesByName(...) shows it.
      window.performance.measure?.("darkmoon:route-load", { start });
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100%",
        backgroundColor: "#1a1a1a",
        color: "#fff",
      }}
    >
      <Spinner size="large" color="#fff" thickness={5} />
      <p style={{ marginTop: "20px", fontSize: "16px" }}>Loading DARKMOON...</p>
      {seconds >= SLOW_AFTER_S && (
        <p role="status" style={{ marginTop: "8px", fontSize: "14px" }}>
          Still downloading the game ({seconds}s). The first visit takes
          longest.
        </p>
      )}
      {seconds >= STUCK_AFTER_S && (
        <button type="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
