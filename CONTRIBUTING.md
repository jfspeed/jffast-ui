# 贡献指南

感谢你关注 jffast-ui！提交代码前请先花几分钟读完本文。

## 开发环境

| 依赖    | 版本                                |
| ------- | ----------------------------------- |
| Node.js | ^22.22.1 \|\| ^24.0.0 \|\| >=26.0.0 |
| npm     | >= 10.x                             |

> Node 版本与 `package.json` 的 `engines` 一致，且 `.npmrc` 设了 `engine-strict=true`
> —— 版本不满足时 `npm install` 会**直接失败**（不是警告）。

后端服务需先行启动（默认 http://localhost:7200），前端开发端口 7201。

## 常用命令

```bash
npm install                    # 安装依赖
npm run dev                    # 启动开发服务器
VITE_RSA_PUBLIC_KEY=<公钥> npm run build   # 构建生产版本（公钥必填，见下）
npm run lint                   # 代码检查
```

## 目录约定

```
src/        应用页面、路由、API、入口
shared/     @jfspeed/shared 公共包（http、createCrud、加密工具、类型声明）
```

环境变量见 `.env`（通用）、`.env.development`（开发），示例参考 `.env.example`。
仓库**不提供 `.env.production`**：生产构建走的是 `--mode release`，读 `.env` / `.env.release` / `.env.release.local`。

**生产构建必须注入 RSA 公钥**：`vite.config.ts` 对 `VITE_RSA_PUBLIC_KEY` 做 fail-fast（为空、或不是合法的 RSA 公钥——Base64 编码的 X.509 SPKI DER——即构建失败；仓库不存任何密钥字面量，也没有示例公钥可抄）。生产构建走 `--mode release`，因此用环境变量或 `.env.release.local`（不入库）注入；后端 `RSA_PRIVATE_KEY` 必须成对更换。

## 提交规范

提交信息统一使用 Conventional Commits：

```
type(scope): description
```

- **type**：`feat` / `fix` / `docs` / `refactor` / `perf` / `test` / `chore` / `build` / `ci`
- **scope**：模块名或页面名，如 `router`、`system`、`flow`、`shared`
- 示例：`fix(router): 登录失效重新登录后跳回原页面`

## 贡献者声明（DCO）

本项目采用 [Developer Certificate of Origin 1.1](DCO)。每个提交必须包含 `Signed-off-by` 行，
署名必须与提交作者一致，用 `git commit -s` 自动追加：

```
Signed-off-by: Your Name <your@email.com>
```

请确保 `git config user.name` / `user.email` 与署名一致，并且你有权按本仓库的
Apache-2.0 许可证提交该代码。未签署的 PR 会被维护者要求补签；DCO 全文见仓库根 [`DCO`](DCO)。

## 编码规范

前端开发指南以本仓库 [`docs/前端开发指南.md`](docs/前端开发指南.md) 为权威来源，本仓库 AGENTS.md 只做摘要。要点：

- 组件使用 Vue 3 `<script setup>` + TypeScript
- 列表页统一走 `createCrud` 三件套，不重复手写增删改查样板
- 接口统一放 `src/api/`，通过 `http` 实例调用，不直接使用 axios
- UI 组件统一使用 TDesign，避免混用其他组件库

## Pull Request 流程

1. Fork 仓库，从 `master` 切出分支（如 `feat/xxx`、`fix/xxx`）
2. 本地 `npm run lint` / `npm test` / `npm run build:type` 通过；构建检查用 `npm run build:test`（或注入自有 `VITE_RSA_PUBLIC_KEY` 后 `npm run build`）
3. PR 描述中写清：动机、改动内容、影响范围，UI 变动请附截图
4. 等待 CI（`.github/workflows/ci.yml`）通过后由维护者评审合并

## 行为准则

保持友善与建设性。技术分歧摆事实讲方案，不进行人身攻击。
