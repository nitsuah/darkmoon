import React from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import ErrorBoundary from "../components/ErrorBoundary";
import UtilityMenu from "../components/UtilityMenu";
import { Card } from "../components/21st.dev/Card";
import "../styles/App.css";
import "../styles/Home.css";
import "../styles/Card.css";

const Home = () => {
  const navigate = useNavigate();
  const [flippedCard, setFlippedCard] = React.useState<string | null>(null);

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

  // Handle card flip on mobile (tap to flip, tap again to navigate)
  const handleCardInteraction = (cardId: string, navigateTo?: string) => {
    // On mobile, first tap flips, second tap navigates
    if (window.innerWidth <= 1024) {
      if (flippedCard === cardId && navigateTo) {
        navigate(navigateTo);
      } else {
        setFlippedCard(cardId);
        // Auto-flip back after 4 seconds on mobile
        setTimeout(() => {
          setFlippedCard(null);
        }, 4000);
      }
    } else if (navigateTo) {
      // On desktop, click navigates immediately
      navigate(navigateTo);
    }
  };

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
        <Card
          title="Solo Practice"
          description="Hone your skills against AI opponents"
          icon="🎯"
          status="● LIVE NOW"
          statusType="live"
          onClick={() => handleCardInteraction("solo", "/solo")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/solo")}
          isFlipped={flippedCard === "solo"}
        >
          <h3>Game Features</h3>
          <ul className="flip-features-list">
            <li>🤖 Smart AI opponents</li>
            <li>🏃 Tag game mechanics</li>
            <li>🚀 Jetpack movement</li>
            <li>🎮 WASD controls</li>
            <li>💬 Live chat</li>
            <li>🎨 Theme support</li>
          </ul>
        </Card>

        <Card
          title="Multiplayer Tag"
          description="Compete with players worldwide"
          icon="👥"
          status="⏳ Coming Soon"
          statusType="coming-soon"
          className="mode-card-disabled"
          onClick={() => handleCardInteraction("multiplayer")}
          onKeyDown={(e) =>
            e.key === "Enter" && handleCardInteraction("multiplayer")
          }
          isFlipped={flippedCard === "multiplayer"}
        >
          <h3>Planned Features</h3>
          <ul className="flip-features-list">
            <li>🌐 Global matchmaking</li>
            <li>🏃 Real-time multiplayer</li>
            <li>💬 Voice chat support</li>
            <li>📱 Cross-platform play</li>
            <li>🎮 Custom lobbies</li>
            <li>📊 Stats tracking</li>
          </ul>
        </Card>

        <Card
          title="Tournament"
          description="Ranked competitive matches"
          icon="🏆"
          status="⏳ Coming Soon"
          statusType="coming-soon"
          className="mode-card-disabled"
          onClick={() => handleCardInteraction("tournament")}
          onKeyDown={(e) =>
            e.key === "Enter" && handleCardInteraction("tournament")
          }
          isFlipped={flippedCard === "tournament"}
        >
          <h3>Future Modes</h3>
          <ul className="flip-features-list">
            <li>🏁 Race mode</li>
            <li>💎 Collectible hunt</li>
            <li>🎭 Emotes & actions</li>
            <li>👤 Custom avatars</li>
            <li>🏅 Leaderboards</li>
            <li>🎁 Rewards system</li>
          </ul>
        </Card>
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
