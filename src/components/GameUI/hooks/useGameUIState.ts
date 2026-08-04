import * as React from "react";
import { GameState } from "../../GameManager";
import { WEAPONS } from "../../combat/WeaponManager";

const GALLERY_HS_KEY = "darkmoon_gallery_highscore";

export function useViewport() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  const [isLandscape, setIsLandscape] = React.useState(
    window.innerWidth > window.innerHeight,
  );

  React.useEffect(() => {
    const handle = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  return { isMobile, isLandscape, isMinimal: isMobile && isLandscape };
}

export function useStreakAnnouncement(
  streakAnnouncement: GameState["streakAnnouncement"],
) {
  const [visibleStreak, setVisibleStreak] = React.useState<{
    killerName: string;
    count: number;
  } | null>(null);

  React.useEffect(() => {
    if (streakAnnouncement === undefined) {
      setVisibleStreak(null);
      return;
    }
    setVisibleStreak({
      killerName: streakAnnouncement.killerName,
      count: streakAnnouncement.count,
    });
  }, [streakAnnouncement]);

  return visibleStreak;
}

export function useRespawnCountdown(respawnAt: number | undefined) {
  const [respawnSecondsLeft, setRespawnSecondsLeft] = React.useState<
    number | null
  >(null);

  React.useEffect(() => {
    if (respawnAt === undefined) {
      setRespawnSecondsLeft(null);
      return;
    }
    const id = setInterval(() => {
      const secs = Math.ceil((respawnAt - Date.now()) / 1000);
      setRespawnSecondsLeft(Math.max(0, secs));
    }, 100);
    return () => clearInterval(id);
  }, [respawnAt]);

  return respawnSecondsLeft;
}

export function useHitDirection() {
  const [hitAngle, setHitAngle] = React.useState<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const onDamaged = (e: Event) => {
      const angle = (e as CustomEvent<{ angle: number }>).detail.angle;
      if (timerRef.current) clearTimeout(timerRef.current);
      setHitAngle(angle);
      timerRef.current = setTimeout(() => setHitAngle(null), 900);
    };
    window.addEventListener("player-damaged", onDamaged);
    return () => {
      window.removeEventListener("player-damaged", onDamaged);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return hitAngle;
}

export function useDamageFlash(health: number | undefined) {
  const prevRef = React.useRef<number | null>(null);
  const [damageFlash, setDamageFlash] = React.useState(false);

  React.useEffect(() => {
    const hp = health ?? null;
    if (prevRef.current !== null && hp !== null && hp < prevRef.current) {
      setDamageFlash(true);
      const t = setTimeout(() => setDamageFlash(false), 500);
      prevRef.current = hp;
      return () => clearTimeout(t);
    }
    prevRef.current = hp;
    return undefined;
  }, [health]);

  return damageFlash;
}

export function useHitMarker() {
  const [hitMarker, setHitMarker] = React.useState(false);
  const [hitRingKey, setHitRingKey] = React.useState(0);

  React.useEffect(() => {
    const handle = () => {
      setHitMarker(true);
      setHitRingKey((k) => k + 1);
      setTimeout(() => setHitMarker(false), 300);
    };
    window.addEventListener("player-hit-landed", handle);
    return () => window.removeEventListener("player-hit-landed", handle);
  }, []);

  return { hitMarker, hitRingKey };
}

export function useMousePosition() {
  const [mousePos, setMousePos] = React.useState({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  });

  React.useEffect(() => {
    const onMove = (e: MouseEvent) =>
      setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return mousePos;
}

export function useGalleryHighScore(
  gameState: Pick<GameState, "isActive" | "mode" | "gameResults">,
) {
  const [galleryHighScore, setGalleryHighScore] = React.useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(GALLERY_HS_KEY) ?? "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [isNewRecord, setIsNewRecord] = React.useState(false);

  React.useEffect(() => {
    if (gameState.isActive) {
      setIsNewRecord(false);
      return;
    }
    if (
      gameState.mode === "shooting_gallery" &&
      gameState.gameResults &&
      gameState.gameResults.length > 0
    ) {
      const score = gameState.gameResults[0].score ?? 0;
      try {
        const prev =
          parseInt(localStorage.getItem(GALLERY_HS_KEY) ?? "0", 10) || 0;
        if (score > prev) {
          localStorage.setItem(GALLERY_HS_KEY, String(score));
          setGalleryHighScore(score);
          setIsNewRecord(true);
        }
      } catch {
        // localStorage unavailable
      }
    }
  }, [gameState.isActive, gameState.mode, gameState.gameResults]);

  return { galleryHighScore, isNewRecord };
}

export function useBonusRound() {
  const [bonusRoundVisible, setBonusRoundVisible] = React.useState(false);

  React.useEffect(() => {
    const onBonus = () => {
      setBonusRoundVisible(true);
      setTimeout(() => setBonusRoundVisible(false), 3000);
    };
    window.addEventListener("gallery-bonus-round", onBonus);
    return () => window.removeEventListener("gallery-bonus-round", onBonus);
  }, []);

  return bonusRoundVisible;
}

export function useGalleryCombo() {
  const [galleryCombo, setGalleryCombo] = React.useState(0);
  const [galleryMultiplier, setGalleryMultiplier] = React.useState(1);

  React.useEffect(() => {
    const onCombo = (e: unknown) => {
      const d = (e as { detail: { combo: number; multiplier: number } }).detail;
      setGalleryCombo(d.combo);
      setGalleryMultiplier(d.multiplier);
    };
    window.addEventListener("gallery-combo", onCombo);
    return () => window.removeEventListener("gallery-combo", onCombo);
  }, []);

  return { galleryCombo, galleryMultiplier };
}

export function useCrosshairSpread() {
  const [crosshairSpread, setCrosshairSpread] = React.useState(0);
  const decayRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    const onFired = (e: unknown) => {
      const weaponId = (e as { detail: { weaponId: string } }).detail.weaponId;
      const addSpread = weaponId === "smg" ? 8 : weaponId === "shotgun" ? 6 : 3;
      setCrosshairSpread((prev) => Math.min(prev + addSpread, 24));
      if (decayRef.current) clearInterval(decayRef.current);
      decayRef.current = setInterval(() => {
        setCrosshairSpread((prev) => {
          if (prev <= 0) {
            if (decayRef.current) clearInterval(decayRef.current);
            return 0;
          }
          return prev - 2;
        });
      }, 50);
    };
    window.addEventListener("weapon-fired", onFired);
    return () => window.removeEventListener("weapon-fired", onFired);
  }, []);

  return crosshairSpread;
}

export function useScoreboard() {
  const [showScoreboard, setShowScoreboard] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Tab") {
        e.preventDefault();
        setShowScoreboard(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Tab") setShowScoreboard(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return showScoreboard;
}

export function usePickupToast() {
  const [pickupToast, setPickupToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onWeapon = (e: unknown) => {
      const { weaponId } = (e as { detail: { weaponId: string } }).detail;
      const name = WEAPONS[weaponId]?.name ?? weaponId;
      setPickupToast(`PICKED UP ${name.toUpperCase()}`);
      clearTimeout(timer);
      timer = setTimeout(() => setPickupToast(null), 2200);
    };
    const onHealth = (e: unknown) => {
      const { amount } = (e as { detail: { amount: number } }).detail;
      setPickupToast(`+${amount} HEALTH`);
      clearTimeout(timer);
      timer = setTimeout(() => setPickupToast(null), 2200);
    };
    window.addEventListener("weapon-pickup", onWeapon);
    window.addEventListener("health-pickup", onHealth);
    return () => {
      window.removeEventListener("weapon-pickup", onWeapon);
      window.removeEventListener("health-pickup", onHealth);
      clearTimeout(timer);
    };
  }, []);

  return pickupToast;
}

export function useKillAnnouncement(
  killFeed: GameState["killFeed"],
  currentPlayerId: string,
) {
  const lastKeyRef = React.useRef<string | null>(null);
  const [killAnnouncement, setKillAnnouncement] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    const feed = killFeed ?? [];
    if (feed.length === 0) return;
    const latest = feed[feed.length - 1];
    const key = `${latest.killerId}-${latest.timestamp}`;
    if (key === lastKeyRef.current) return undefined;
    lastKeyRef.current = key;
    if (latest.killerId !== currentPlayerId) return undefined;
    const weaponLabel = WEAPONS[latest.weaponId]?.name ?? latest.weaponId;
    setKillAnnouncement(`${latest.targetName} [${weaponLabel}]`);
    const t = setTimeout(() => setKillAnnouncement(null), 2000);
    return () => clearTimeout(t);
  }, [killFeed, currentPlayerId]);

  return killAnnouncement;
}
