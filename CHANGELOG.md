# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

> 记录自 1.0.0 以来合入但尚未发版的一批变更，按类别摘要（不含版本号与具体提交号）。

### Security

- 登录密码加密由 RSA PKCS#1 v1.5 切换为 RSA-OAEP（SHA-256 / MGF1-SHA1）随机化加密。
- 文件下载改为受控下载 / 签名直显：直显地址带短期签名 ticket，匿名可读但有时效。
- 响应拦截器补充业务码 401 / 401xx 的登录态清理，HTTP 200 包裹的登录失效不再残留会话。
- 构建产物缺失或非法 RSA 公钥时 fail-fast；登录页公钥为空时阻止提交，不再降级明文传输。

### Added

- 代码生成器支持导出 ZIP 包。
- 页面设计器（page-design）支持明细子表。
- 右上角开源入口开关（`VITE_SHOW_OPEN_SOURCE_LINKS`）与正式文档站地址。
- 文件签名 URL 换发 API（`GET /sys/file/signed-url/{id}`）声明与接入点标注。

### Fixed

- `useForm` 编辑回显改为深拷贝，避免修改表单时污染原始行数据。
- 响应错误提示对技术细节（堆栈 / SQL）统一收敛为安全文案。
- 401 提示去重与单飞清理，避免并发请求重复弹窗 / 重复跳转。

### Changed

- 仓库图片资源瘦身，清理未使用的模板图片。
- dev 代理与生产同源反代语义对齐（含 WebSocket 握手 Origin 改写）。

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
