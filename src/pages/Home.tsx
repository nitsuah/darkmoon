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

      {/* Live Game Mode — single featured card */}
      <div className="game-modes-live">
        <div className="game-card game-card--solo game-card--featured">
          <div className="game-card__accent" />
          <div className="game-card__live-pulse">
            <span className="game-card__badge game-card__badge--live">
              ● LIVE NOW
            </span>
          </div>
          <div className="game-card__icon game-card__icon--large">🎯</div>
          <div className="game-card__content">
            <h3 className="game-card__title game-card__title--large">
              Solo Practice
            </h3>
            <p className="game-card__desc">
              Hone your aim against smart AI opponents across multiple game
              modes — all in your browser, no install required.
            </p>
            <ul className="game-card__features game-card__features--grid">
              <li>🤖 Smart AI opponents</li>
              <li>🏃 Tag, Deathmatch & CTF</li>
              <li>🚀 Jetpack movement</li>
              <li>🔫 5 unique weapons</li>
              <li>🎯 Shooting gallery</li>
              <li>💥 Destructible environment</li>
            </ul>
          </div>
          <button
            type="button"
            className="game-card__cta game-card__cta--primary"
            onClick={() => navigate("/solo")}
          >
            🎮 Play Now →
          </button>
        </div>
      </div>

      {/* Coming Soon — compact teaser row */}
      <div className="game-modes-soon">
        <div className="game-card-soon game-card-soon--multi">
          <span className="game-card__badge game-card__badge--soon">
            ⏳ Coming Soon
          </span>
          <span className="game-card-soon__icon">👥</span>
          <div>
            <div className="game-card-soon__title">Multiplayer Tag</div>
            <div className="game-card-soon__desc">
              Global real-time matches · Voice chat · Rankings
            </div>
          </div>
        </div>
        <div className="game-card-soon game-card-soon--tournament">
          <span className="game-card__badge game-card__badge--soon">
            ⏳ Coming Soon
          </span>
          <span className="game-card-soon__icon">🏆</span>
          <div>
            <div className="game-card-soon__title">Tournament</div>
            <div className="game-card-soon__desc">
              Ranked brackets · Leaderboards · Rewards
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
