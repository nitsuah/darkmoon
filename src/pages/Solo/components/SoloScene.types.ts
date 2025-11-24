import type * as React from "react";
import type CollisionSystem from "../../../components/CollisionSystem";
import type GameManager from "../../../components/GameManager";
import type { GameState } from "../../../components/GameManager";
import type { BotConfig as BotAIConfig } from "../../../components/characters/useBotAI";
import type { PlayerCharacterHandle } from "../../../components/characters/PlayerCharacter";
import type { Socket } from "socket.io-client";

export type RockPosition = {
  x: number;
  z: number;
  size: number;
  height: number;
};
export type JoystickMove = { x: number; y: number };

export type QualitySettings = {
  shadows: boolean;
  pixelRatio: number | [number, number];
  antialias: boolean;
};

export type MouseControls = {
  mouseX: number;
  mouseY: number;
  leftClick: boolean;
  rightClick: boolean;
  middleClick: boolean;
};

export type BotConfig = Partial<BotAIConfig>;

export type SoloSceneProps = {
  qualitySettings: QualitySettings;
  rockPositions: RockPosition[];
  playerCharacterRef: React.RefObject<PlayerCharacterHandle | null>;
  keysPressedRef: React.RefObject<Record<string, boolean>>;
  socketClient: Socket | null;
  mouseControls: MouseControls;
  clients: Record<
    string,
    { position: [number, number, number]; rotation: [number, number, number] }
  >;
  gameManager: GameManager | null;
  currentPlayerId: string;
  joystickMove: JoystickMove;
  lastWalkSoundTimeRef: React.RefObject<number>;
  isPaused: boolean;
  onPositionUpdate: (p: [number, number, number]) => void;
  playerIsIt: boolean;
  setPlayerIsIt: (v: boolean) => void;
  setBotIsIt?: (v: boolean) => void;
  setBot1GotTagged: (t: number) => void;
  setBot2GotTagged: (t: number) => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  botDebugMode: boolean;
  bot1Position: [number, number, number];
  bot2Position: [number, number, number];
  handleBot1PositionUpdate: (p: [number, number, number]) => void;
  handleBot2PositionUpdate: (p: [number, number, number]) => void;
  collisionSystemRef: React.RefObject<CollisionSystem>;
  bot1GotTagged: number;
  bot2GotTagged: number;
  BOT1_CONFIG: BotConfig;
  BOT2_CONFIG: BotConfig;
};
