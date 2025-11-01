import React from "react";
import { useNavigate } from "react-router-dom";
// import Spline from '@splinetool/react-spline';
import Footer from "../components/Footer";
// import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from "../components/ErrorBoundary";
import "../styles/App.css";
import "../styles/Home.css";

// CONSTANTS - Spline temporarily disabled to debug React bundling issue
// const SPLINE_SCENE = `https://prod.spline.design/lwFGUGO5nCfnnDQU/scene.splinecode`;

const Home = () => {
  const navigate = useNavigate();

  const renderHome = () => (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">PLAY 🌑 DARKMOON</h1>
        <p className="hero-subtitle">
          An immersive 3D multiplayer tag experience in the browser
        </p>
        <button className="cta-play-button" onClick={() => navigate("/solo")}>
          <span className="cta-icon">🎮</span>
          <span>START PLAYING</span>
        </button>
        <div className="hero-badges">
          <span className="badge">Free to Play</span>
          <span className="badge">Browser-Based</span>
          <span className="badge">No Install</span>
        </div>
      </div>

      {/* Game Modes Grid */}
      <div className="game-modes-grid">
        <div
          className="mode-card mode-card-solo mode-card-flip-container"
          onClick={() => navigate("/solo")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/solo")}
          role="button"
          tabIndex={0}
        >
          <div className="mode-card-flip-inner">
            <div className="mode-card-front">
              <div className="mode-icon">🎯</div>
              <h3>Solo Practice</h3>
              <p>Hone your skills against AI opponents</p>
              <div className="mode-status status-live">● LIVE NOW</div>
            </div>
            <div className="mode-card-back">
              <div className="mode-icon">✨</div>
              <h3>Game Features</h3>
              <ul className="flip-features-list">
                <li>🤖 Smart AI opponents</li>
                <li>🏃 Tag game mechanics</li>
                <li>🚀 Jetpack movement</li>
                <li>🎮 WASD controls</li>
                <li>💬 Live chat</li>
                <li>🎨 Theme support</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mode-card mode-card-disabled mode-card-flip-container">
          <div className="mode-card-flip-inner">
            <div className="mode-card-front">
              <div className="mode-icon">👥</div>
              <h3>Multiplayer Tag</h3>
              <p>Compete with players worldwide</p>
              <div className="mode-status status-coming-soon">
                ⏳ Coming Soon
              </div>
            </div>
            <div className="mode-card-back">
              <div className="mode-icon">🌍</div>
              <h3>Planned Features</h3>
              <ul className="flip-features-list">
                <li>🌐 Global matchmaking</li>
                <li>🏃 Real-time multiplayer</li>
                <li>💬 Voice chat support</li>
                <li>📱 Cross-platform play</li>
                <li>🎮 Custom lobbies</li>
                <li>📊 Stats tracking</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mode-card mode-card-disabled mode-card-flip-container">
          <div className="mode-card-flip-inner">
            <div className="mode-card-front">
              <div className="mode-icon">�</div>
              <h3>Tournament</h3>
              <p>Ranked competitive matches</p>
              <div className="mode-status status-coming-soon">
                ⏳ Coming Soon
              </div>
            </div>
            <div className="mode-card-back">
              <div className="mode-icon">🎯</div>
              <h3>Future Modes</h3>
              <ul className="flip-features-list">
                <li>🏁 Race mode</li>
                <li>💎 Collectible hunt</li>
                <li>🎭 Emotes & actions</li>
                <li>👤 Custom avatars</li>
                <li>🏅 Leaderboards</li>
                <li>🎁 Rewards system</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="App">
        {/* Background Moon */}
        <div
          className="moon-background"
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "150px",
            opacity: 0.15,
            userSelect: "none",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          🌑
        </div>

        {renderHome()}

        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            padding: "2rem 0",
          }}
        >
          <Footer />
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Home;
