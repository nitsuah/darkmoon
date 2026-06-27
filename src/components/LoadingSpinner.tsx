import React from "react";
import { Spinner } from "./21st.dev/Spinner";
import "../styles/Spinner.css";

const LoadingSpinner: React.FC = () => {
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
