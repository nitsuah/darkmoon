import React from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import ErrorBoundary from "../components/ErrorBoundary";
import UtilityMenu from "../components/UtilityMenu";
import "../styles/App.css";
import "../styles/Home.css";

const Home = () => {
  const navigate = useNavigate();

  // Fix mobile browser address bar on home page
  React.useEffect(() => {
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
      document.documentElement.style.setProperty(
        "--app-height",
        `${window.innerHeight}px`,
      );
    };

    updateViewportHeight();

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const debouncedUpdate = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateViewportHeight, 150);
    };

    window.addEventListener("resize", debouncedUpdate);
    window.addEventListener("orientationchange", updateViewportHeight);

    return () => {
      window.removeEventListener("resize", debouncedUpdate);
      window.removeEventListener("orientationchange", updateViewportHeight);
      clearTimeout(resizeTimeout);
    };
  }, []);

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

      {/* Game Modes Grid — redesigned cards */}
      <div className="game-modes-grid">
        {/* Solo Practice */}
        <div
          className="game-card game-card--solo"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/solo")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/solo")}
        >
          <div className="game-card__accent" />
          <div className="game-card__icon">🎯</div>
          <div className="game-card__content">
            <span className="game-card__badge game-card__badge--live">
              ● LIVE NOW
            </span>
            <h3 className="game-card__title">Solo Practice</h3>
            <p className="game-card__desc">
              Hone your aim against smart AI opponents across multiple game
              modes.
            </p>
            <ul className="game-card__features">
              <li>🤖 Smart AI opponents</li>
              <li>🏃 Tag, Deathmatch & CTF</li>
              <li>🚀 Jetpack movement</li>
              <li>🔫 5 unique weapons</li>
            </ul>
          </div>
          <button className="game-card__cta" onClick={() => navigate("/solo")}>
            Play Now →
          </button>
        </div>

        {/* Multiplayer Tag */}
        <div className="game-card game-card--multi game-card--disabled">
          <div className="game-card__accent" />
          <div className="game-card__icon">👥</div>
          <div className="game-card__content">
            <span className="game-card__badge game-card__badge--soon">
              ⏳ Coming Soon
            </span>
            <h3 className="game-card__title">Multiplayer Tag</h3>
            <p className="game-card__desc">
              Compete with players around the world in real-time matches.
            </p>
            <ul className="game-card__features">
              <li>🌐 Global matchmaking</li>
              <li>🏃 Real-time multiplayer</li>
              <li>💬 Voice chat</li>
              <li>📊 Stats & rankings</li>
            </ul>
          </div>
          <button className="game-card__cta game-card__cta--disabled" disabled>
            Coming Soon
          </button>
        </div>

        {/* Tournament */}
        <div className="game-card game-card--tournament game-card--disabled">
          <div className="game-card__accent" />
          <div className="game-card__icon">🏆</div>
          <div className="game-card__content">
            <span className="game-card__badge game-card__badge--soon">
              ⏳ Coming Soon
            </span>
            <h3 className="game-card__title">Tournament</h3>
            <p className="game-card__desc">
              Ranked competitive matches with leaderboards and rewards.
            </p>
            <ul className="game-card__features">
              <li>🏅 Leaderboards</li>
              <li>🎁 Reward system</li>
              <li>🏁 Special modes</li>
              <li>👤 Custom avatars</li>
            </ul>
          </div>
          <button className="game-card__cta game-card__cta--disabled" disabled>
            Coming Soon
          </button>
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

        {/* Utility Menu (theme toggle only on home page) */}
        <UtilityMenu />

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
