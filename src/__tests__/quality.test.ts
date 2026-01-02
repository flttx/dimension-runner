import { describe, expect, it } from "vitest";

import { getQualityConfig, resolveQuality } from "@/lib/quality";

describe("quality", () => {
  it("低端设备会降级到 low", () => {
    const level = resolveQuality({
      deviceMemory: 4,
      hardwareConcurrency: 4,
      width: 720,
      height: 1280,
    });
    expect(level).toBe("low");
  });

  it("中端设备会落在 medium", () => {
    const level = resolveQuality({
      deviceMemory: 6,
      hardwareConcurrency: 8,
      width: 1280,
      height: 800,
    });
    expect(level).toBe("medium");
  });

  it("高端设备返回 high", () => {
    const level = resolveQuality({
      deviceMemory: 16,
      hardwareConcurrency: 12,
      width: 1920,
      height: 1080,
    });
    expect(level).toBe("high");
  });

  it("配置在低画质下关闭 SSAO 并限制像素比", () => {
    const config = getQualityConfig("low");
    expect(config.ssaoEnabled).toBe(false);
    expect(config.maxPixelRatio).toBe(1);
  });
});
