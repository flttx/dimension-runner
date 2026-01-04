export type Theme = "xianxia" | "minecraft";
export type Biome = "city" | "forest" | "ocean";
export type GameStatus = "idle" | "running" | "paused" | "over";
export type Lane = 0 | 1 | 2;
export type QualityLevel = "high" | "medium" | "low";
export type QualityPreference = "auto" | QualityLevel;

export type ObstacleType =
  | "lightning"
  | "sword_rain"
  | "boulder"
  | "beast"
  | "whirlwind"
  | "falling_seal"
  | "spirit_laser"
  | "ice_spikes"
  | "soul_bell"
  | "bagua"
  | "ghost_fire"
  | "golden_lotus"
  | "iron_chains"
  | "stone_stele"
  | "sword_array"
  | "furnace"
  | "talisman"
  | "yin_yang"
  | "creeper"
  | "tnt"
  | "lava"
  | "mc_anvil"
  | "mc_cactus"
  | "mc_magma"
  | "mc_arrow";

export type PowerUpType = "shield" | "speed" | "clear" | "magnet" | "coin" | "tribulation";

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
