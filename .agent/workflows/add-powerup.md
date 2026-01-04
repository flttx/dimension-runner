---
description: 如何在“维度跑酷”中添加一个新道具 (Power-Up)
---

道具不仅涉及 3D 视觉表现，还涉及玩家状态变更和 UI 反馈。

### 1. 注册核心类型
在 `src/types/index.ts` 中：
- `PowerUpType`: 添加新道具标识符。
- `PowerUpState`: 如果道具涉及持久化状态（如磁铁时长），在此接口添加属性。

### 2. 资源配置
在 `src/lib/modelCatalog.ts` 的 `modelCatalog.powerUps` 中添加新道具。
- 分别配置 `xianxia` 和 `minecraft` 的模型或空数组。

### 3. 定义逻辑与状态 (Zustand)
在 `src/store/gameStore.ts` 中：
- `powerUps` 的初始状态。
- 如果是即时效果（如清理屏幕）：在 `consumeClear` 类似的方法中实现逻辑。
- 如果是持续效果：实现逻辑并在 `PlayerController.update` 中应用（如改变移动速度）。

### 4. 视觉呈现 (PowerUps.tsx)
在 `src/components/Game/PowerUps.tsx` 中：
- 管理道具的旋转、漂浮动画逻辑。
- 确保在玩家接触时触发 `onCollect` 回调。

### 5. 设计 UI 反馈 (HUD.tsx)
在 `src/components/UI/HUD.tsx` 中：
- **图标**：引入 `lucide-react` 图标。
- **状态显示**：在 `Active Powerups` 区域添加对应的 `motion.div` 徽章。
- **倒计时**：如果是时效性道具，使用 `speedLeft` 类似的 `useMemo` 计算剩余秒数。

### 6. 整合进入场景
在 `src/components/Game/Scene.tsx` 中：
- 将新道具类型加入随机生成逻辑。
- 在 `handleCollision` 中判断道具类型并调用对应的 Store Action 或 Player 方法。
