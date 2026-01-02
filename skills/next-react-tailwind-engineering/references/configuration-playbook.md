# 配置与脚本速查

## 核心配置

- `next.config.(js|ts)`：路由、图片域名、重定向、实验特性。
- `tailwind.config.(js|ts)`：`content` 路径、主题扩展、插件。
- `postcss.config.js`：Tailwind 与 Autoprefixer。
- `tsconfig.json`：路径别名与严格度。
- `eslint`：统一规则与格式化策略。

## 常见脚本

- `dev`：本地开发
- `build`：构建产物
- `start`：生产启动
- `test`：单测
- `lint`：静态检查

## 约定

- 依赖与脚本保持最小化，不重复造轮子。
- 环境变量通过 `NEXT_PUBLIC_` 前缀暴露到浏览器。
- Tailwind `content` 需覆盖 `app/` 与 `components/` 路径。
