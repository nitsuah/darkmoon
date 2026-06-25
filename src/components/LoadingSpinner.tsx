import React from "react";

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
      <div
        style={{
          width: "50px",
          height: "50px",
          border: "5px solid rgba(255, 255, 255, 0.1)",
          borderTop: "5px solid #fff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
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
