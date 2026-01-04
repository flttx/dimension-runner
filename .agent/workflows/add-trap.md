---
description: 如何在“维度跑酷”中快速添加一个新的 3D 陷阱 (Obstacle)
---

按照以下标准化步骤添加陷阱，以确保类型安全、性能优化和双主题兼容。

### 1. 注册类型定义
在 `src/types/index.ts` 的 `ObstacleType` 联合类型中添加新的陷阱名称。必须使用蛇形命名法（snake_case）。
```typescript
export type ObstacleType = 
  | "..." 
  | "spirit_sword"; // 示例
```

### 2. 配置资源映射与主题适配
在 `src/lib/modelCatalog.ts` 的 `modelCatalog.obstacles` 中注册资源。
- 如果某个主题使用 GLB，填入路径。
- 如果某个主题使用纯代码生成，填入 `[]`。
```typescript
spirit_sword: { 
  xianxia: "/assets/models/sketchfab/xianxia/sword.glb", 
  minecraft: [] // Minecraft 模式下将在代码中生成
},
```

### 3. 设置高度与碰撞配置文件
在 `src/components/Game/Obstacles.tsx` 的 `obstacleHeight` 映射中定义：
- `low`: 玩家可以通过跳跃避开。
- `high`: 玩家可以通过滑行/下蹲避开。
- `full`: 必须通过左右切换车道避开。

### 4. 完善渲染模型逻辑
在 `Obstacles.tsx` 的 `createModel(type)` 中补充 `switch` 分支。
- **规范**：模型必须经过 `scaleToMax(model, size)` 缩放和 `centerOnGround(model)` 对齐。
- **自定义材质**：如果是代码生成的 Mesh，优先使用项目定义的 `matBody` 或 `matAccent`。
- **自发光**：使用 `applyEmissive(model, "#color")` 增加视觉吸引力。

### 5. 实现动态行为逻辑 (Animation & Logic)
如果陷阱不是静态的，需要在以下两个位置处理：
1. **更新循环**：在 `update(delta, speed)` 的分支中添加逻辑。通常做法是调用一个专用的私有方法 `this.updateSpiritSword(obstacle)`。
2. **生命周期**：在私有方法中根据 `obstacle.timer` 处理阶段（如：预警、触发、消失）。

### 6. 控制伤害判定 (Hazard States)
- 默认情况下，`spawn` 时 `hazardActive` 会被设置为 `true`。
- **延迟伤害陷阱**（如地雷、落雷）：在 `spawn` 时将 `hazardActive` 设为 `false`，在更新逻辑的特定时间点再设为 `true`。
- 调用 `this.onExplosion?.()` 来触发屏幕抖动。

### 7. 加入随机生成池
在 `src/components/Game/Scene.tsx` 中：
- 找到 `obstacleTypes` 常量。
- 将新类型字符串加入 `xianxia` 或 `minecraft` 数组。

### 8. 调试与验证 (Testing)
为了快速验证新陷阱：
1. 在 `Scene.tsx` 的生成逻辑中临时将 `type` 固定为你的新陷阱类型。
2. 检查：
   - 模型缩放是否正确（不会太大遮挡视线或太小看不见）。
   - 碰撞体高度是否符合预期。
   - 主题切换时是否有回退方案（Fallback）。
   - 被清理时（对象池复用）是否有视觉残留。

---
**性能保障**：严禁在 `update` 循环中创建任何 `new THREE.*` 对象。所有临时计算必须使用类成员变量复用（如 `this.boulderTemp`）。
