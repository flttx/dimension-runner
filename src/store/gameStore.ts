import { create } from "zustand";

import type {
  GameStatus,
  PowerUpState,
  QualityLevel,
  QualityPreference,
  Theme,
} from "@/types";

export interface GameEngineApi {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
  setTheme: (theme: Theme) => void;
  triggerClear: () => void;
}

export interface GameStore {
  engine: GameEngineApi | null;
  status: GameStatus;
  theme: Theme;
  isEmbedded: boolean;
  assetsReady: boolean;
  qualityPreference: QualityPreference;
  qualityLevel: QualityLevel;
  score: number;
  distance: number;
  speed: number;
  powerUps: PowerUpState;
  setEngine: (engine: GameEngineApi | null) => void;
  setEmbedded: (isEmbedded: boolean) => void;
  setAssetsReady: (ready: boolean) => void;
  setTheme: (theme: Theme) => void;
  setQualityPreference: (quality: QualityPreference) => void;
  setQualityLevel: (quality: QualityLevel) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  resetGame: () => void;
  stopGame: () => void;
  setStatusFromEngine: (status: GameStatus) => void;
  setScore: (score: number) => void;
  setDistance: (distance: number) => void;
  setSpeed: (speed: number) => void;
  setPowerUps: (powerUps: PowerUpState) => void;
  consumeClear: () => void;
}

const baseSpeed = 12;

const createInitialPowerUps = (): PowerUpState => ({
  shield: 0,
  speedUntil: 0,
  magnetUntil: 0,
  hasClear: false,
  coins: 0,
});

export const useGameStore = create<GameStore>((set, get) => ({
  engine: null,
  status: "idle",
  theme: "xianxia",
  isEmbedded: false,
  assetsReady: false,
  qualityPreference: "auto",
  qualityLevel: "high",
  score: 0,
  distance: 0,
  speed: baseSpeed,
  powerUps: createInitialPowerUps(),
  setEngine: (engine) => {
    set({ engine });
    if (engine) {
      engine.setTheme(get().theme);
    }
  },
  setEmbedded: (isEmbedded) => set({ isEmbedded }),
  setAssetsReady: (assetsReady) => set({ assetsReady }),
  setTheme: (theme) => {
    set({ theme });
    get().engine?.setTheme(theme);
  },
  setQualityPreference: (quality) => {
    set({ qualityPreference: quality });
    get().resetGame();
  },
  setQualityLevel: (quality) => set({ qualityLevel: quality }),
  startGame: () => {
    if (!get().assetsReady) {
      return;
    }
    set({
      status: "running",
      score: 0,
      distance: 0,
      speed: baseSpeed,
      powerUps: createInitialPowerUps(),
    });
    get().engine?.start();
  },
  pauseGame: () => {
    set({ status: "paused" });
    get().engine?.pause();
  },
  resumeGame: () => {
    set({ status: "running" });
    get().engine?.resume();
  },
  resetGame: () => {
    set({
      status: "idle",
      score: 0,
      distance: 0,
      speed: baseSpeed,
      powerUps: createInitialPowerUps(),
    });
    get().engine?.reset();
  },
  stopGame: () => {
    set({ status: "over" });
    get().engine?.stop();
  },
  setStatusFromEngine: (status) => set({ status }),
  setScore: (score) => set({ score }),
  setDistance: (distance) => set({ distance }),
  setSpeed: (speed) => set({ speed }),
  setPowerUps: (powerUps) => set({ powerUps }),
  consumeClear: () => {
    set((state) => ({
      powerUps: { ...state.powerUps, hasClear: false },
    }));
    get().engine?.triggerClear();
  },
}));
