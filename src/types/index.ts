export type Theme = "xianxia" | "minecraft";
export type GameStatus = "idle" | "running" | "paused" | "over";
export type Lane = 0 | 1 | 2;
export type QualityLevel = "high" | "medium" | "low";
export type QualityPreference = "auto" | QualityLevel;

export type ObstacleType =
  | "lightning"
  | "sword_rain"
  | "boulder"
  | "creeper"
  | "tnt"
  | "lava";

export type PowerUpType = "shield" | "speed" | "clear" | "magnet" | "coin";

export interface PowerUpState {
  shield: number;
  speedUntil: number;
  magnetUntil: number;
  hasClear: boolean;
  coins: number;
}

export interface GameReport {
  score: number;
  distance: number;
}

export interface MessagePayload {
  target: "dimension-runner";
  action: string;
  data?: Record<string, unknown>;
}
