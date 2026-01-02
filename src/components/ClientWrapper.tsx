"use client";

import { useEffect } from "react";

import { sendGameEvent, setupMessageBridge } from "@/lib/communication";
import { useGameStore } from "@/store/gameStore";

import Scene from "@/components/Game/Scene";
import EmbeddedLayout from "@/components/UI/EmbeddedLayout";
import HUD from "@/components/UI/HUD";
import StandaloneLayout from "@/components/UI/StandaloneLayout";

export default function ClientWrapper() {
  const isEmbedded = useGameStore((state) => state.isEmbedded);
  const theme = useGameStore((state) => state.theme);
  const status = useGameStore((state) => state.status);
  const score = useGameStore((state) => state.score);
  const distance = useGameStore((state) => state.distance);
  const setEmbedded = useGameStore((state) => state.setEmbedded);
  const setTheme = useGameStore((state) => state.setTheme);
  const startGame = useGameStore((state) => state.startGame);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);

  useEffect(() => {
    const embedded = window.self !== window.top;
    setEmbedded(embedded);
    document.documentElement.dataset.mode = embedded ? "embedded" : "standalone";
  }, [setEmbedded]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const dispose = setupMessageBridge({
      onStart: startGame,
      onSetTheme: setTheme,
      onPause: pauseGame,
      onResume: resumeGame,
    });
    return dispose;
  }, [pauseGame, resumeGame, setTheme, startGame]);

  useEffect(() => {
    if (!isEmbedded) {
      return;
    }
    sendGameEvent("score_update", { score });
  }, [isEmbedded, score]);

  useEffect(() => {
    if (!isEmbedded) {
      return;
    }
    if (status === "over") {
      sendGameEvent("game_over", { score, distance });
    }
  }, [distance, isEmbedded, score, status]);

  const Layout = isEmbedded ? EmbeddedLayout : StandaloneLayout;

  return (
    <Layout>
      <div className="game-stage">
        <Scene />
        <HUD />
      </div>
    </Layout>
  );
}
