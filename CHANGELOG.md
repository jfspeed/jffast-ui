# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [1.0.0] - 2026-11-01

### 新增

- Monorepo 架构：`shared/`（@jfspeed/shared）+ `src/`（Base 应用），npm workspaces 管理。
- CRUD 工厂与表格 / 表单 hooks：`createCrud`、`useTable`、`useForm`、`useDict`。
- 页面：登录、仪表盘、系统管理（用户 / 角色 / 菜单 / 部门 / 岗位 / 字典 / 日志 / 文件 / 异步任务 / 通知 / 缓存 / 监控）、工作流（含 BPMN 设计器）、AI 中心、个人中心、社交账号绑定。
- 权限：`v-permission` / `hasPermission` / `hasRole`，动态路由与静态路由双模式。
- 国际化：中英词典（`shared/src/locales`），随语言即时切换。
- 体验：暗黑模式、响应式布局、多标签页、面包屑、全局水印、移动端抽屉导航。
- 登录：RSA 加密 + 按失败次数自动启用图形验证码。
- 实时通知：WebSocket 单例 + 心跳 + 退避重连。
- 用户岗位绑定：新增 / 编辑弹窗多选，停用岗位回显不丢，自助编辑只读。

### 变更

- 导航改为按路由名跳转；登出时清理通知、页签与动态路由会话态。
- dev 代理开启 `rewriteWsOrigin`，与生产同源反代语义一致。
- 生产构建强制注入 `VITE_RSA_PUBLIC_KEY`，空值或非法公钥直接失败。
- 清理 11 个未使用的模板图片，布局缩略图改为项目自制 SVG（`public/img/setting/{side,top,mix}.svg`）。

### 修复

- 补齐 i18n 键、路由组件名、静态路由与结果页；修复部门与岗位页面若干交互与样式问题。
