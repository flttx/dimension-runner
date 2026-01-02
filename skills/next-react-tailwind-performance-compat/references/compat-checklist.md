# 兼容性检查清单

## 设备与交互

- 视口使用 `meta viewport`，处理刘海屏 `safe-area`。
- 触控与鼠标兼容：`pointer` 事件与 hover 降级。
- 键盘弹出与滚动回弹处理（iOS/Android）。

## 浏览器差异

- Safari：`position: sticky`、滚动容器与 `vh` 适配。
- Android WebView：字体与阴影渲染差异。
- 动画与滚动：尊重 `prefers-reduced-motion`。

## 降级策略

- 核心功能优先保证可用性。
- 复杂特效提供关闭或简化选项。
