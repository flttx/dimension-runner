"use client";

import type { ReactNode } from "react";

import { useGameStore } from "@/store/gameStore";

export default function StandaloneLayout({ children }: { children: ReactNode }) {
  const theme = useGameStore((state) => state.theme);
  const setTheme = useGameStore((state) => state.setTheme);
  const qualityPreference = useGameStore((state) => state.qualityPreference);
  const setQualityPreference = useGameStore((state) => state.setQualityPreference);

  return (
    <div className="ui-layer">
      <header className="glass-panel" style={{
        padding: '12px 24px',
        borderRadius: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'auto'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--accent-primary)' }}>
            DIMENSION RUNNER
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
            QUANTUM SYNC // v0.9
          </span>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Theme</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(["xianxia", "minecraft"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="glass-button"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: theme === t ? 'var(--accent-primary)' : 'var(--text-muted)',
                    borderColor: theme === t ? 'var(--accent-primary)' : 'transparent'
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '1px', background: 'var(--glass-border)' }} />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Visuals</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(["auto", "high", "medium", "low"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setQualityPreference(mode)}
                  className="glass-button"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: qualityPreference === mode ? 'var(--accent-secondary)' : 'var(--text-muted)',
                    borderColor: qualityPreference === mode ? 'var(--accent-secondary)' : 'transparent'
                  }}
                >
                  {mode === "auto" ? "A" : mode.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main style={{ position: 'relative', flex: 1, pointerEvents: 'none' }}>
        {children}
      </main>

      <footer style={{ textAlign: 'center', paddingBottom: '12px', opacity: 0.6 }}>
        <span className="glass-panel" style={{ padding: '8px 16px', borderRadius: '100px', fontSize: '0.8rem', pointerEvents: 'auto' }}>
          Swipe or Arrows to Navigate · Tap Space to Jump
        </span>
      </footer>
    </div>
  );
}
