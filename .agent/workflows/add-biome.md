---
description: 如何在“维度跑酷”中创建并切换一个新的生物群落 (Biome)
---

生物群落决定了游戏的氛围感，通过调整环境光、雾气和生成特定的背景装饰来实现。

### 1. 定义生物群落类型
在 `src/types/index.ts` 中更新 `Biome` 类型。
```typescript
export type Biome = "city" | "forest" | "ocean" | "nether"; // 示例
```

### 2. 配置环境视觉参数
在 `src/components/Game/Scene.tsx` 中配置新群落的视觉参数：
- **颜色定义**：为新群落设定对应的十六进制颜色。
- **雾气调节**：在群落切换逻辑中，根据新群落调整 `scene.fog` 的颜色和浓度。
- **光照调整**：可选环节，针对特定群落调整 `dirLight` 或 `ambient` 的强度。

### 3. 实现群落特有风景 (Scenery.tsx)
在 `src/components/Game/Scenery.tsx` 的 `createModel(biome)` 方法中：
- 添加 `if (biome === 'your_new_biome')` 分支。
- 创建特有的几何体组合（如：地狱模式下的岩浆柱，荒漠模式下的仙人掌）。
- **优化**：对于群落特有的模型，建议实现简单的 LOD 分级，远处的风景使用模糊的雾团替代。

### 4. 触发切换逻辑
在 `src/components/Game/Scene.tsx` 中寻找控制群落切换的逻辑（通常是基于行驶距离或随机触发）：
- 调用 `currentBiome = 'new_biome'`。
- 执行 `sceneryManager.spawn(z, currentBiome)` 确保新生成的动态风景属于新群落。

### 5. 主题与群落的联动 (Theme vs Biome)
- **注意**：同一个主题（如 Minecraft）可以有多个群落（丛林、沙漠、下界）。
- 在逻辑中确保群落的视觉风格不与当前大主题冲突。
