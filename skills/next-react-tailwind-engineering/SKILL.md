---
name: next-react-tailwind-engineering
description: 通用的 Next.js + React + TailwindCSS 前端工程化与架构治理技能。用于新项目的目录结构/脚本/配置设计，或既有项目的模块化重构、依赖治理、测试策略与发布流程调整等场景。
---

# Next React Tailwind Engineering

## 概览

面向 Next + React + Tailwind 的工程化与架构改造指南，提供结构规划、配置与脚本调整、模块落位与测试策略的标准流程。

## 工作流（按需裁剪）

1. 识别项目形态与约束（App Router / Pages Router、包管理器、部署目标）。
2. 规划目录与分层（见 `references/project-structure.md`）。
3. 调整配置与脚本（见 `references/configuration-playbook.md`）。
4. 拆分模块与边界（UI/状态/数据/工具），避免循环依赖。
5. 完善测试与发布校验（见 `references/testing-strategy.md`）。

## 关键原则

- 遵循既有包管理器，不强制切换工具链。
- 优先稳定可读的模块边界，再做性能微调。
- Tailwind 保持 Utility-first，避免堆叠过深的自定义 CSS。
- 复杂逻辑配简短中文注释，避免重复解释。

## 脚本

- `scripts/scaffold_project.py`：生成基础目录与可选配置模板（不会覆盖已有文件，除非 `--force`）。
  - 示例：`python3 scripts/scaffold_project.py --router app --templates`
- `scripts/generate_next_basics.py`：生成 Next/TS/Tailwind 基础配置与入口文件模板。
  - 示例：`python3 scripts/generate_next_basics.py --router app --tailwind --ts --force`

## 参考

- `references/project-structure.md`
- `references/configuration-playbook.md`
- `references/testing-strategy.md`
