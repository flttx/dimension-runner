"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
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

import styles from "./HUD.module.scss";

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
    <div className={styles.hud}>
      {/* Speed Vignette */}
      <div
        className={styles["speed-vignette"]}
        style={{ opacity: Math.max(0, (speed - 12) / 24) }}
      />

      {/* Onboarding / Control Hints */}
      <AnimatePresence>
        {status === "running" && distance < 50 && (
          <motion.div
            className={styles.instructions}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <span className={styles.label}>Control Matrix</span>
            <div className={styles.keys}>
              <span>A / D / SWIPE</span>
              <span>SPACE / JUMP</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar Info */}
      <div className={styles["hud-top"]}>
        {/* Left: Score & Distance */}
        <motion.div
          className={clsx("glass-panel", styles["hud-panel"])}
          initial="hidden" animate="visible" variants={panelVariants}
        >
          <div className={styles["hud-stat"]}>
            <label><Trophy size={14} /> SCORE</label>
            <span className={clsx(styles.value, styles.primary)}>
              {score.toLocaleString()}
            </span>
          </div>
          <div className={styles["hud-divider"]} />
          <div className={styles["hud-stat"]}>
            <label><Activity size={14} /> DISTANCE</label>
            <span className={styles.value}>
              {Math.floor(distance)}<span style={{ fontSize: '0.8rem', marginLeft: '2px' }}>m</span>
            </span>
          </div>
        </motion.div>

        {/* Right: Stats & Coins */}
        <motion.div
          className={clsx("glass-panel", styles["hud-panel"], styles.stats)}
          initial="hidden" animate="visible" variants={panelVariants}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Gauge size={16} className="neon-text" style={{ color: 'var(--accent-secondary)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600 }}>{Math.round(speed)}</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>KM/H</span>
          </div>
          <div className={clsx(styles["hud-divider"], styles.tall)} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={16} style={{ color: 'var(--accent-warn)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600 }}>{powerUps.coins}</span>
          </div>
        </motion.div>
      </div>

      {/* Active Powerups (Left Center) */}
      <div className={styles["hud-powerups"]}>
        <AnimatePresence>
          {powerUps.shield > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
              className={clsx("glass-panel", styles["hud-badge"], styles.shield)}
            >
              <Shield size={16} color="var(--accent-success)" />
              <span>SHIELD ACTIVE</span>
              <span className={styles.count}>{powerUps.shield}</span>
            </motion.div>
          )}
          {speedLeft > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
              className={clsx("glass-panel", styles["hud-badge"], styles.boost)}
            >
              <Zap size={16} color="var(--accent-primary)" />
              <span>BOOST</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{speedLeft}s</span>
            </motion.div>
          )}
          {magnetLeft > 0 && (
            <motion.div
              initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
              className={clsx("glass-panel", styles["hud-badge"], styles.magnet)}
            >
              <Magnet size={16} color="var(--accent-warn)" />
              <span>MAGNET</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{magnetLeft}s</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className={styles["hud-bottom"]}>
        <div className={styles["hud-btn-group"]}>
          <button
            type="button"
            onClick={() => { playClick(); consumeClear(); }}
            disabled={!powerUps.hasClear}
            className={clsx(styles["hud-round-btn"], powerUps.hasClear && styles.primary)}
            style={{ opacity: powerUps.hasClear ? 1 : 0.3 }}
          >
            <Layers size={24} />
          </button>
        </div>

        <div className={styles["hud-btn-group"]}>
          {status === "running" && (
            <button
              onClick={() => { playClick(); pauseGame(); }}
              className={styles["hud-round-btn"]}
            >
              <Pause size={24} />
            </button>
          )}
          {status === "paused" && (
            <button
              onClick={() => { playClick(); resumeGame(); }}
              className={clsx(styles["hud-round-btn"], styles.success)}
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
                className={styles["modal-card"]}
                variants={cardVariants}
                initial="hidden" animate="visible" exit="hidden"
              >
                {!assetsReady ? (
                  <div style={{ marginBottom: '20px' }}>
                    <div className="hud-spinner" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-muted)' }}>INITIALIZING REALITY...</p>
                  </div>
                ) : (
                  <>
                    <h1 className={styles["modal-title"]}>READY</h1>
                    <p className={styles["modal-desc"]}>
                      Swipe to dodge. Collect crystals. Survive the void.
                    </p>
                    <button
                      onClick={() => { playClick(); startGame(); }}
                      className={styles["modal-action"]}
                    >
                      INITIATE RUN
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {status === "over" && (
              <motion.div
                className={styles["modal-card"]}
                variants={cardVariants}
                initial="hidden" animate="visible" exit="hidden"
              >
                <h2 className={clsx(styles["modal-title"], styles.error)}>
                  SYNC FAILED
                </h2>
                <div className={styles["modal-stats-grid"]}>
                  <div className={styles["modal-stat-box"]}>
                    <div className={styles.label}>SCORE</div>
                    <div className={styles.value}>{score}</div>
                  </div>
                  <div className={styles["modal-stat-box"]}>
                    <div className={styles.label}>DISTANCE</div>
                    <div className={styles.value}>{distance}m</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => { playClick(); resetGame(); }}
                    className={styles["modal-action"]}
                    style={{ flex: 1, padding: '14px', borderRadius: '18px' }}
                  >
                    <RotateCcw size={20} />
                  </button>
                  <button
                    onClick={() => { playClick(); startGame(); }}
                    className={clsx(styles["modal-action"], styles.secondary)}
                    style={{ flex: 2.5 }}
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
