---
description: 如何在“维度跑酷”中集成与管理音效与音乐 (Audio System)
---

项目使用 Web Audio API 管理游戏音效（SFX）和背景音乐（BGM），并支持双主题切换。

### 1. 资源注册
在 `src/lib/audio.ts` 中维护音频资源列表。
- **BGM**: 每个主题对应一个循环背景音乐。
- **SFX**: 定义通用的游戏交互音效（跳跃、碰撞、拾取等）。
```typescript
const audioUrls = {
  bgm: { xianxia: "...", minecraft: "..." },
  sfx: { new_sfx: "/audio/sfx-new.ogg" }
};
```

### 2. 更新类型定义
同步更新 `src/lib/audio.ts` 中的 `SfxName` 类型，确保调用时的代码提示和类型安全。
```typescript
type SfxName = | "jump" | ... | "new_sfx";
```

### 3. 预加载 (Preloading)
音频资源必须在游戏开始前预加载并解码。
- 在 `src/components/Game/Scene.tsx` 的生命周期中调用 `audioManager.preload()`。
- 确保所有的音频文件格式为 `.ogg` (体积小且支持无缝循环) 或 `.mp3`。

### 4. 触发场景
- **UI交互**：在 `HUD.tsx` 的按钮点击事件中调用 `audioManager.playSfx("ui_click")`。
- **游戏事件**：
  *   玩家跳跃：在 `Player.tsx` 中触发。
  *   碰撞/爆炸：在 `Obstacles.tsx` 的逻辑分支中触发。
  *   主题切换：在 `Scene.tsx` 切换主题时，自动调用 `audioManager.playBgm(newTheme)`。

### 5. 音量与增益控制
- **BGM**: 默认增益建议设为 `0.35`，避免覆盖音效。
- **SFX**: 重要反馈（如受击 `hit`）增益可设为 `0.6`，普通反馈设为 `0.45`。
- 全局静音开关通过 `audioManager.setMuted(boolean)` 控制。

---
**注意**：由于浏览器安全策略，音频上下文（AudioContext）必须在用户首次交互（点击）后通过 `audioManager.unlock()` 激活。
