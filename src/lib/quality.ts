import type { QualityLevel } from "@/types";

export interface QualitySignals {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  width: number;
  height: number;
}

export interface QualityConfig {
  maxPixelRatio: number;
  ssaoEnabled: boolean;
  ssaoKernelRadius: number;
  ssaoMinDistance: number;
  ssaoMaxDistance: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
}

export const resolveQuality = (signals: QualitySignals): QualityLevel => {
  const memory = signals.deviceMemory ?? 8;
  const cores = signals.hardwareConcurrency ?? 8;
  const minSide = Math.min(signals.width, signals.height);

  if (memory <= 4 || cores <= 4 || minSide < 720) {
    return "low";
  }
  if (memory <= 6 || cores <= 6 || minSide < 900) {
    return "medium";
  }
  return "high";
};

export const getQualityConfig = (level: QualityLevel): QualityConfig => {
  switch (level) {
    case "low":
      return {
        maxPixelRatio: 1,
        ssaoEnabled: false,
        ssaoKernelRadius: 8,
        ssaoMinDistance: 0.01,
        ssaoMaxDistance: 0.1,
        bloomStrength: 0.14,
        bloomRadius: 0.35,
        bloomThreshold: 0.92,
      };
    case "medium":
      return {
        maxPixelRatio: 1.5,
        ssaoEnabled: true,
        ssaoKernelRadius: 8,
        ssaoMinDistance: 0.008,
        ssaoMaxDistance: 0.12,
        bloomStrength: 0.22,
        bloomRadius: 0.4,
        bloomThreshold: 0.88,
      };
    case "high":
    default:
      return {
        maxPixelRatio: 2,
        ssaoEnabled: true,
        ssaoKernelRadius: 12,
        ssaoMinDistance: 0.005,
        ssaoMaxDistance: 0.15,
        bloomStrength: 0.28,
        bloomRadius: 0.45,
        bloomThreshold: 0.85,
      };
  }
};
