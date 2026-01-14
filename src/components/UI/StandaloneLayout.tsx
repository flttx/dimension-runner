"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { ArrowLeftRight, ArrowUp, Blocks, Sparkles } from "lucide-react";

import { useGameStore } from "@/store/gameStore";

import styles from "./StandaloneLayout.module.scss";

const themeOptions = [
  { key: "xianxia", label: "修仙", Icon: Sparkles },
  { key: "minecraft", label: "像素", Icon: Blocks },
] as const;

const qualityOptions = [
  { key: "auto", label: "自动" },
  { key: "high", label: "高" },
  { key: "medium", label: "中" },
  { key: "low", label: "低" },
] as const;

export default function StandaloneLayout({ children }: { children: ReactNode }) {
  const theme = useGameStore((state) => state.theme);
  const setTheme = useGameStore((state) => state.setTheme);
  const qualityPreference = useGameStore((state) => state.qualityPreference);
  const setQualityPreference = useGameStore((state) => state.setQualityPreference);
  const qualityLevel = useGameStore((state) => state.qualityLevel);

  const qualityText =
    qualityPreference === "auto"
      ? `AUTO · ${qualityLevel.toUpperCase()}`
      : qualityPreference.toUpperCase();

  return (
    <div className="ui-layer">
      <header className={clsx("glass-panel", styles.topbar)}>
        <div className={styles.brand}>
          <div className={styles.titleRow}>
            <span className={styles.title}>维度跑酷</span>
            <span className={styles.titleEn}>Dimension Runner</span>
          </div>
          <span className={styles.subtitle}>{qualityText}</span>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>主题</span>
            <div className={styles.segmented} role="group" aria-label="主题选择">
              {themeOptions.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={clsx(
                    styles.segment,
                    theme === key && styles.segmentActivePrimary
                  )}
                >
                  <Icon size={14} />
                  <span className={styles.segmentText}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} aria-hidden />

          <div className={styles.controlGroup}>
            <span className={styles.controlLabel}>画质</span>
            <div className={styles.segmented} role="group" aria-label="画质设置">
              {qualityOptions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setQualityPreference(key)}
                  className={clsx(
                    styles.segment,
                    qualityPreference === key && styles.segmentActiveSecondary
                  )}
                >
                  <span className={styles.segmentText}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <div className={clsx("glass-panel", styles.hintPill)}>
          <span className={styles.hintItem}>
            <ArrowLeftRight size={16} />
            左右滑动 / 方向键移动
          </span>
          <span className={styles.hintDivider} aria-hidden />
          <span className={styles.hintItem}>
            <ArrowUp size={16} />
            空格跳跃
          </span>
        </div>
      </footer>
    </div>
  );
}
