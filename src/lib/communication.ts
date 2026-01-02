import type { MessagePayload, Theme } from "@/types";

const TARGET = "dimension-runner";

const allowedOrigins = (process.env.NEXT_PUBLIC_EMBED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin: string) => {
  if (!origin) {
    return false;
  }
  if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
    return true;
  }
  return allowedOrigins.includes(origin);
};

const normalizeAction = (payload: MessagePayload) => {
  if (payload.action === "game_event" && payload.data) {
    const dataAction =
      (payload.data.action as string | undefined) ||
      (payload.data.type as string | undefined);
    if (dataAction) {
      return dataAction;
    }
  }
  return payload.action;
};

export const isEmbedded = () => {
  if (typeof window === "undefined") {
    return false;
  }
  return window.self !== window.top;
};

export const setupMessageBridge = (handlers: {
  onStart?: () => void;
  onSetTheme?: (theme: Theme) => void;
  onPause?: () => void;
  onResume?: () => void;
}) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const listener = (event: MessageEvent) => {
    const payload = event.data as MessagePayload | undefined;
    if (!payload || payload.target !== TARGET) {
      return;
    }
    if (!isAllowedOrigin(event.origin)) {
      return;
    }

    const action = normalizeAction(payload);
    switch (action) {
      case "start_game":
        handlers.onStart?.();
        break;
      case "set_theme": {
        const theme = payload.data?.theme;
        if (theme === "xianxia" || theme === "minecraft") {
          handlers.onSetTheme?.(theme);
        }
        break;
      }
      case "pause_game":
        handlers.onPause?.();
        break;
      case "resume_game":
        handlers.onResume?.();
        break;
      default:
        break;
    }
  };

  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
};

export const sendGameEvent = (
  action: string,
  data?: Record<string, unknown>
) => {
  if (typeof window === "undefined") {
    return;
  }
  if (!isEmbedded()) {
    return;
  }
  const payload: MessagePayload = {
    target: TARGET,
    action,
    data,
  };
  window.parent.postMessage(payload, "*");
};
