# 目录结构建议

## App Router（推荐）

```
src/
  app/                # 路由与布局
  components/
    ui/               # 纯展示组件
    feature/          # 业务功能组件
    layout/           # 页面级布局
  hooks/              # 复用 Hook
  lib/                # 纯逻辑与适配层
  services/           # API/数据访问层
  store/              # 状态管理（Zustand/Redux）
  styles/             # Tailwind 入口与全局样式
  types/              # 全局类型
  utils/              # 工具函数
```

## Pages Router（兼容）

```
src/
  pages/
  components/
  hooks/
  lib/
  services/
  store/
  styles/
  types/
  utils/
```

## 分层规则

- `components/ui`：无业务依赖，纯渲染。
- `components/feature`：业务逻辑组合，允许依赖 `store` 与 `services`。
- `lib`：纯逻辑与适配层，不直接依赖 UI。
- `services`：API 与数据访问，统一错误处理与缓存策略。
