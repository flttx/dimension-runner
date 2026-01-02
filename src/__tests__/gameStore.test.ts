import { describe, expect, it, vi, beforeEach } from "vitest";

import type { GameEngineApi } from "@/store/gameStore";
import { useGameStore } from "@/store/gameStore";

const baseSpeed = 12;

const createPowerUps = () => ({
  shield: 0,
  speedUntil: 0,
  magnetUntil: 0,
  hasClear: false,
  coins: 0,
});

const createEngine = (): GameEngineApi => ({
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  reset: vi.fn(),
  stop: vi.fn(),
  setTheme: vi.fn(),
  triggerClear: vi.fn(),
});

const resetStore = () => {
  useGameStore.setState({
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
    powerUps: createPowerUps(),
  });
};

describe("gameStore", () => {
  beforeEach(() => {
    resetStore();
  });

  it("未就绪时不会启动游戏", () => {
    const engine = createEngine();
    useGameStore.setState({ engine, assetsReady: false });

    useGameStore.getState().startGame();

    expect(engine.start).not.toHaveBeenCalled();
    expect(useGameStore.getState().status).toBe("idle");
  });

  it("启动游戏会重置核心状态并调用引擎", () => {
    const engine = createEngine();
    useGameStore.setState({
      engine,
      assetsReady: true,
      status: "over",
      score: 120,
      distance: 300,
      speed: 40,
      powerUps: { ...createPowerUps(), coins: 3, hasClear: true },
    });

    useGameStore.getState().startGame();

    const state = useGameStore.getState();
    expect(state.status).toBe("running");
    expect(state.score).toBe(0);
    expect(state.distance).toBe(0);
    expect(state.speed).toBe(baseSpeed);
    expect(state.powerUps.coins).toBe(0);
    expect(engine.start).toHaveBeenCalledTimes(1);
  });

  it("切换主题会同步到引擎", () => {
    const engine = createEngine();
    useGameStore.getState().setEngine(engine);
    const state = useGameStore.getState();

    expect(engine.setTheme).toHaveBeenCalledWith(state.theme);
    vi.clearAllMocks();

    useGameStore.getState().setTheme("minecraft");
    expect(engine.setTheme).toHaveBeenCalledWith("minecraft");
  });

  it("consumeClear 会清除道具并触发引擎清屏", () => {
    const engine = createEngine();
    useGameStore.setState({
      engine,
      powerUps: { ...createPowerUps(), hasClear: true },
    });

    useGameStore.getState().consumeClear();

    expect(useGameStore.getState().powerUps.hasClear).toBe(false);
    expect(engine.triggerClear).toHaveBeenCalledTimes(1);
  });

  it("切换画质会重置游戏状态", () => {
    const engine = createEngine();
    useGameStore.setState({
      engine,
      assetsReady: true,
      status: "running",
      score: 80,
      distance: 150,
      speed: 30,
      powerUps: { ...createPowerUps(), coins: 2 },
      qualityLevel: "medium",
    });

    useGameStore.getState().setQualityPreference("low");

    const state = useGameStore.getState();
    expect(state.qualityPreference).toBe("low");
    expect(state.status).toBe("idle");
    expect(state.score).toBe(0);
    expect(state.distance).toBe(0);
    expect(engine.reset).toHaveBeenCalledTimes(1);
  });
});
