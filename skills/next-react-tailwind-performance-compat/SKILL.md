---
name: next-react-tailwind-performance-compat
description: 通用的 Next.js + React + TailwindCSS 性能优化与兼容性排查技能。用于性能瓶颈分析、Web Vitals 优化、资源与渲染调优、移动端兼容与降级策略设计等场景。
---

# Next React Tailwind Performance & Compat

## 概览

系统化执行性能分析与兼容性治理，覆盖诊断、优化、验证的完整流程。

## 工作流（按需裁剪）

1. 诊断现状：收集 Web Vitals、Lighthouse、性能时间线。
2. 定位瓶颈：识别慢路由、重渲染、包体积与渲染阻塞。
3. 执行优化：按优先级落地（见 `references/perf-checklist.md`）。
4. 兼容治理：移动端与浏览器差异处理（见 `references/compat-checklist.md`）。
5. Tailwind 细节：样式体积与渲染优化（见 `references/tailwind-performance.md`）。
6. 复测验证：建立性能预算与回归门槛。

## 关键原则

- 先测量再优化，避免盲目改动。
- 优先解决首屏与交互卡顿，再优化次要指标。
- 兼容性优先可用性，必要时提供降级策略。

## 参考

- `references/perf-checklist.md`
- `references/compat-checklist.md`
- `references/tailwind-performance.md`
