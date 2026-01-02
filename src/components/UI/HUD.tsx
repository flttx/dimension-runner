"use client";

import { useEffect, useMemo, useState } from "react";

import { useGameStore } from "@/store/gameStore";

const formatTimeLeft = (until: number, now: number) => {
  if (!until || until <= now) {
    return 0;
  }
  return Math.ceil((until - now) / 1000);
};

export default function HUD() {
  const status = useGameStore((state) => state.status);
  const score = useGameStore((state) => state.score);
  const distance = useGameStore((state) => state.distance);
  const speed = useGameStore((state) => state.speed);
  const powerUps = useGameStore((state) => state.powerUps);
  const assetsReady = useGameStore((state) => state.assetsReady);
  const qualityPreference = useGameStore(
    (state) => state.qualityPreference
  );
  const qualityLevel = useGameStore((state) => state.qualityLevel);
  const startGame = useGameStore((state) => state.startGame);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const consumeClear = useGameStore((state) => state.consumeClear);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const speedLeft = useMemo(
    () => formatTimeLeft(powerUps.speedUntil, now),
    [now, powerUps.speedUntil]
  );
  const magnetLeft = useMemo(
    () => formatTimeLeft(powerUps.magnetUntil, now),
    [now, powerUps.magnetUntil]
  );

  const qualityLabel = useMemo(() => {
    const format = (value: string) =>
      `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
    if (qualityPreference === "auto") {
      return `Auto · ${format(qualityLevel)}`;
    }
    return format(qualityPreference);
  }, [qualityLevel, qualityPreference]);

  return (
    <div className="hud">
      <div className="hud-panel">
        <div className="hud-row">
          <div className="hud-item">
            <span className="hud-label">Score</span>
            <span className="hud-value">{score}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Distance</span>
            <span className="hud-value">{distance}m</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Speed</span>
            <span className="hud-value">{speed}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Coins</span>
            <span className="hud-value">{powerUps.coins}</span>
          </div>
        </div>
        <div className="hud-row">
          <div className="hud-chip">
            Shield: <strong>{powerUps.shield}</strong>
          </div>
          <div className="hud-chip">
            Speed: <strong>{speedLeft > 0 ? `${speedLeft}s` : "-"}</strong>
          </div>
          <div className="hud-chip">
            Magnet: <strong>{magnetLeft > 0 ? `${magnetLeft}s` : "-"}</strong>
          </div>
          <div className="hud-chip">
            Quality: <strong>{qualityLabel}</strong>
          </div>
          <button
            type="button"
            className="hud-action"
            onClick={consumeClear}
            disabled={!powerUps.hasClear}
          >
            Clear
          </button>
          {status === "running" ? (
            <button type="button" className="hud-action" onClick={pauseGame}>
              Pause
            </button>
          ) : null}
          {status === "paused" ? (
            <button type="button" className="hud-action" onClick={resumeGame}>
              Resume
            </button>
          ) : null}
        </div>
      </div>

      {status === "idle" ? (
        <div className="hud-overlay">
          <div className="hud-card">
            {!assetsReady ? (
              <div className="hud-loading">
                <span className="hud-spinner" aria-hidden="true" />
                <span>资源加载中...</span>
              </div>
            ) : null}
            <h2>{assetsReady ? "Ready to Run" : "正在加载资源"}</h2>
            <p>
              {assetsReady
                ? "Swipe left/right to switch lanes, swipe up to jump, swipe down to roll."
                : "首次进入会预加载模型与音效，请稍候。"}
            </p>
            <button
              type="button"
              className="primary"
              onClick={startGame}
              disabled={!assetsReady}
            >
              Start
            </button>
          </div>
        </div>
      ) : null}

      {status === "over" ? (
        <div className="hud-overlay">
          <div className="hud-card">
            <h2>Run Complete</h2>
            <p>
              Score {score} · Distance {distance}m
            </p>
            <button type="button" className="primary" onClick={startGame}>
              Restart
            </button>
            <button type="button" className="ghost" onClick={resetGame}>
              Back to Lobby
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
