import type { Theme } from "@/types";

type SfxName =
  | "jump"
  | "collect"
  | "powerup"
  | "hit"
  | "clear"
  | "explosion"
  | "ui_click";

const audioUrls = {
  bgm: {
    xianxia: "/audio/bgm-xianxia.ogg",
    minecraft: "/audio/bgm-minecraft.ogg",
  },
  sfx: {
    jump: "/audio/sfx-jump.ogg",
    collect: "/audio/sfx-collect.ogg",
    powerup: "/audio/sfx-powerup.ogg",
    hit: "/audio/sfx-hit.ogg",
    clear: "/audio/sfx-clear.ogg",
    explosion: "/audio/sfx-explosion.ogg",
    ui_click: "/audio/sfx-collect.ogg",
  },
};

class AudioManager {
  private context: AudioContext | null = null;
  private bgmSource: AudioBufferSourceNode | null = null;
  private bgmGain: GainNode | null = null;
  private muted = false;
  private buffers = new Map<string, AudioBuffer>();
  private preloadPromise: Promise<void> | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") {
      return null;
    }
    if (!this.context) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.context = new Ctx();
    }
    return this.context;
  }

  async unlock() {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  async preload() {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }
    this.preloadPromise = (async () => {
      const ctx = this.ensureContext();
      if (!ctx) {
        return;
      }
      const urls = [
        ...Object.values(audioUrls.bgm),
        ...Object.values(audioUrls.sfx),
      ];
      await Promise.all(
        urls.map(async (url) => {
          if (this.buffers.has(url)) {
            return;
          }
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
          this.buffers.set(url, buffer);
        })
      );
    })();
    return this.preloadPromise;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) {
      this.stopBgm();
    }
  }

  playBgm(theme: Theme) {
    if (this.muted) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }
    const url = audioUrls.bgm[theme];
    const buffer = this.buffers.get(url);
    if (!buffer) {
      return;
    }
    this.stopBgm();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0.35;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    this.bgmSource = source;
    this.bgmGain = gain;
  }

  stopBgm() {
    if (this.bgmSource) {
      this.bgmSource.stop();
      this.bgmSource.disconnect();
      this.bgmSource = null;
    }
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
  }

  playSfx(name: SfxName) {
    if (this.muted) {
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }
    const url = audioUrls.sfx[name];
    const buffer = this.buffers.get(url);
    if (!buffer) {
      return;
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = name === "hit" ? 0.6 : 0.45;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }
}

export const audioManager = new AudioManager();
