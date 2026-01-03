
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Wind,
  Zap,
  Coins,
  Shield,
  Magnet,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Activity,
  Layers
} from "lucide-react";
import { audioManager } from "@/lib/audio";
import { useGameStore } from "@/store/gameStore";
import clsx from "clsx";

const formatTimeLeft = (until: number, now: number) => {
  if (!until || until <= now) return 0;
  return Math.ceil((until - now) / 1000);
};

export default function HUD() {
  const status = useGameStore((state) => state.status);
  const score = useGameStore((state) => state.score);
  const distance = useGameStore((state) => state.distance);
  const speed = useGameStore((state) => state.speed);
  const powerUps = useGameStore((state) => state.powerUps);
  const assetsReady = useGameStore((state) => state.assetsReady);
  const startGame = useGameStore((state) => state.startGame);
  const pauseGame = useGameStore((state) => state.pauseGame);
  const resumeGame = useGameStore((state) => state.resumeGame);
  const resetGame = useGameStore((state) => state.resetGame);
  const consumeClear = useGameStore((state) => state.consumeClear);

  const playClick = () => audioManager.playSfx("ui_click");

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const speedLeft = useMemo(() => formatTimeLeft(powerUps.speedUntil, now), [now, powerUps.speedUntil]);
  const magnetLeft = useMemo(() => formatTimeLeft(powerUps.magnetUntil, now), [now, powerUps.magnetUntil]);

  // Floating variants
  const panelVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
    exit: { opacity: 0, y: -20 }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, bounce: 0.4 } }
  };

  return (
    <div className="hud" style={{ pointerEvents: 'none', height: '100%', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

      {/* Top Bar Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>

        {/* Left: Score & Distance */}
        <motion.div
          className="glass-panel"
          style={{ padding: '16px 24px', borderRadius: '20px', display: 'flex', gap: '24px', pointerEvents: 'auto' }}
          initial="hidden" animate="visible" variants={panelVariants}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Trophy size={14} /> SCORE
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
              {score.toLocaleString()}
            </span>
          </div>
          <div style={{ width: '1px', background: 'var(--glass-border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} /> DISTANCE
            </span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {Math.floor(distance)}<span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>m</span>
            </span>
          </div>
        </motion.div>

        {/* Right: Stats & Coins */}
        <motion.div
          className="glass-panel"
          style={{ padding: '12px 20px', borderRadius: '16px', display: 'flex', gap: '20px', alignItems: 'center', pointerEvents: 'auto' }}
          initial="hidden" animate="visible" variants={panelVariants}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gauge size={16} className="neon-text" style={{ color: 'var(--accent-secondary)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600 }}>{Math.round(speed)}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>KM/H</span>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'var(--glass-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={16} style={{ color: 'var(--accent-warn)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600 }}>{powerUps.coins}</span>
          </div>
        </motion.div>
      </div>

      {/* Active Powerups (Left Center) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
        <AnimatePresence>
          {powerUps.shield > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
              className="glass-panel"
              style={{ padding: '8px 16px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '3px solid var(--accent-success)' }}
            >
              <Shield size={16} color="var(--accent-success)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>SHIELD ACTIVE</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem' }}>{powerUps.shield}</span>
            </motion.div>
          )}
          {speedLeft > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
              className="glass-panel"
              style={{ padding: '8px 16px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '3px solid var(--accent-secondary)' }}
            >
              <Zap size={16} color="var(--accent-secondary)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>BOOST</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{speedLeft}s</span>
            </motion.div>
          )}
          {magnetLeft > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
              className="glass-panel"
              style={{ padding: '8px 16px', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '3px solid var(--accent-warn)' }}
            >
              <Magnet size={16} color="var(--accent-warn)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>MAGNET</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{magnetLeft}s</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      {/* Bottom Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={() => { playClick(); consumeClear(); }}
            disabled={!powerUps.hasClear}
            className={clsx("glass-button", "neon-border")}
            style={{
              width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: powerUps.hasClear ? 1 : 0.3,
              background: powerUps.hasClear ? 'rgba(0, 240, 255, 0.15)' : undefined
            }}
          >
            <Layers size={24} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
          {status === "running" && (
            <button
              onClick={() => { playClick(); pauseGame(); }}
              className="glass-button"
              style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Pause size={24} />
            </button>
          )}
          {status === "paused" && (
            <button
              onClick={() => { playClick(); resumeGame(); }}
              className="glass-button"
              style={{ width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: 'var(--accent-success)', color: 'var(--accent-success)' }}
            >
              <Play size={24} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      {/* Modals Overlay */}
      <AnimatePresence>
        {(status === 'idle' || status === 'over') && (
          <motion.div
            className="hud-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {status === "idle" && (
              <motion.div
                className="glass-panel"
                variants={cardVariants}
                initial="hidden" animate="visible" exit="hidden"
                style={{ padding: '40px', borderRadius: '32px', textAlign: 'center', maxWidth: '400px', width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {!assetsReady ? (
                  <div style={{ marginBottom: '20px' }}>
                    <div className="hud-spinner" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-muted)' }}>INITIALIZING REALITY...</p>
                  </div>
                ) : (
                  <>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px', background: 'linear-gradient(to right, var(--accent-primary), var(--accent-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      READY
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.6' }}>
                      Swipe to dodge. Collect crystals. Survive the void.
                    </p>
                    <button
                      onClick={() => { playClick(); startGame(); }}
                      className="glass-button"
                      style={{
                        width: '100%', padding: '16px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700,
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                        color: '#000', border: 'none',
                        boxShadow: '0 8px 24px var(--glow-secondary)'
                      }}
                    >
                      INITIATE RUN
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {status === "over" && (
              <motion.div
                className="glass-panel"
                variants={cardVariants}
                initial="hidden" animate="visible" exit="hidden"
                style={{ padding: '40px', borderRadius: '32px', textAlign: 'center', maxWidth: '400px', width: '90%' }}
              >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-warn)', marginBottom: '8px', letterSpacing: '0.1em' }}>
                  SYNC FAILED
                </h2>
                <div style={{ margin: '32px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>SCORE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{score}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>DISTANCE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{distance}m</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => { playClick(); resetGame(); }}
                    className="glass-button"
                    style={{ flex: 1, padding: '14px', borderRadius: '14px', fontSize: '0.9rem' }}
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={() => { playClick(); startGame(); }}
                    className="glass-button"
                    style={{
                      flex: 3, padding: '14px', borderRadius: '14px', fontSize: '1rem', fontWeight: 700,
                      background: 'var(--text-main)', color: 'var(--bg-deep)'
                    }}
                  >
                    RETRY
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
