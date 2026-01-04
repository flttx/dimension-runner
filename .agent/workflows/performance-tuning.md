---
description: 如何进行“维度跑酷”的性能监控与画质调优 (Performance & Quality)
---

为了在不同能力的设备上提供极致体验，项目实现了一套基于硬件能力的自动画质调节系统。

### 1. 核心调优维度
在 `src/lib/quality.ts` 中，通过 `QualityConfig` 接口管理以下关键参数：
- **maxPixelRatio**: 控制渲染分辨率倍率（High=2.0, Low=1.0）。
- **SSAO (屏幕空间环境光遮蔽)**：提升场景深度感，Low 分支下直接关闭。
- **Bloom (辉光效果)**：控制 neon/发光物体的光效强度和阈值。

### 2. 硬件自动识别
系统在 `Scene.tsx` 初始化阶段通过 `resolveQuality()` 采集信号：
- `deviceMemory`: 内存大小。
- `hardwareConcurrency`: CPU 核心数。
- 窗口分辨率。
- 信号不足（如内存 < 4GB 或核心数 < 4）将强制降级至 `low` 模式。

### 3. 代码级的性能优化 (必须遵守)
- **InstancedMesh (实例化)**：对于重复度高的物体（如 `boulder`），严禁使用普通 Group。必须在 `Obstacles.tsx` 中使用 `InstancedMesh` 合并 Draw Calls。
- **手动资源释放 (Disposal)**：
  *   每次 `setTheme` 时，必须调用 `disposeBoulderRenders()`。
  *   释放顺序：Mesh -> Geometry -> Material。
- **LOD (多细节层次)**：在 `Scenery.tsx` 中为远处建筑使用 `THREE.LOD`，远端用半透明雾团（Low Detail）替代复杂模型。

### 4. 调试与监控工具
- **帧率监控**：如需深度调优，可在 `Scene.tsx` 中临时引入 `stats.js`。
- **渲染分析**：
  *   使用 Chrome 开发者工具的 `Layers` 面板查看合成情况。
  *   使用 Spector.js 检查 Draw Calls 数量。

### 5. SCSS 性能优化
- 尽量使用 `transform` 和 `opacity` 进行 UI 动画，开启 `.optimize-gpu`。
- 避免在滚动或频繁变化的 UI 上使用过大的 `backdrop-filter`，这是非常昂贵的开销。

---
**红线**：禁止在游戏主循环 (`update` 方法) 中进行任何会导致 Garbage Collection 的操作（如频繁创建 `new THREE.Vector3()`）。请使用预设的临时变量复用空间。
