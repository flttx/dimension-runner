"use client";

import type { ReactNode } from "react";

import { useGameStore } from "@/store/gameStore";

export default function StandaloneLayout({ children }: { children: ReactNode }) {
  const theme = useGameStore((state) => state.theme);
  const setTheme = useGameStore((state) => state.setTheme);
  const qualityPreference = useGameStore(
    (state) => state.qualityPreference
  );
  const setQualityPreference = useGameStore(
    (state) => state.setQualityPreference
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">Dimension Runner</span>
          <span className="brand-sub">3D Infinite Runner</span>
        </div>
        <div className="switches">
          <div className="theme-switch">
            <span className="switch-label">Theme</span>
            <button
              className={theme === "xianxia" ? "chip active" : "chip"}
              onClick={() => setTheme("xianxia")}
              type="button"
            >
              Xianxia
            </button>
            <button
              className={theme === "minecraft" ? "chip active" : "chip"}
              onClick={() => setTheme("minecraft")}
              type="button"
            >
              Minecraft
            </button>
          </div>
          <div className="quality-switch">
            <span className="switch-label">Quality</span>
            {(["auto", "high", "medium", "low"] as const).map((mode) => (
              <button
                key={mode}
                className={qualityPreference === mode ? "chip active" : "chip"}
                onClick={() => setQualityPreference(mode)}
                type="button"
              >
                {mode === "auto"
                  ? "Auto"
                  : mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        Swipe or use arrow keys to dodge. Tap clear when ready.
      </footer>
    </div>
  );
}
