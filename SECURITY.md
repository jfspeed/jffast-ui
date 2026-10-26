# 安全策略

## 支持版本

| 版本     | 支持状态                                            |
| -------- | --------------------------------------------------- |
| 尚未发布 | ⏳ 首个正式版本发布后，此处将列出受支持的版本与分支 |

> 本项目**首发版本为 `1.0.0`**（`package.json` / `shared/package.json` 已由发布指令统一定版；此前是 `1.0.0-SNAPSHOT` 开发快照）。
> 首个正式版本发布后，会在此列出受支持的版本与分支；仅最新 minor 分支获得安全修复。

## 报告漏洞

请**不要**通过公开 GitHub Issue 报告安全漏洞。

请使用 [GitHub Security Advisories](https://github.com/summerZstar/jffast-ui/security/advisories/new) 提交私密报告（需在仓库 Settings → Security 打开 "Private vulnerability reporting"）；涉及后端 `jffast` 的问题请上报到[后端仓库](https://github.com/summerZstar/jffast/security/advisories/new)。本仓库不设邮箱渠道——写死的邮件地址一旦域名失效，上报就会石沉大海，而 GitHub 私密报告有送达记录。

报告请包含：漏洞描述、复现步骤、受影响版本、建议修复方案。

我们将在 **7 个工作日内**确认收到，并在修复后公开致谢（除非你要求匿名）。

## 安全基线（部署检查）

- 构建时注入自有公钥：`VITE_RSA_PUBLIC_KEY=<公钥> npm run build`（或写入 `.env.release.local`）
  - `vite.config.ts` 已 fail-fast：公钥为空、或不是合法的 RSA 公钥（Base64 编码的 X.509 SPKI DER），构建直接失败
  - 仓库**不存任何密钥字面量**，也不提供 `.env.production`；`npm run build` 走 `--mode release`，实际读 `.env` / `.env.release`
  - 后端 `RSA_PRIVATE_KEY` 必须与该公钥成对更换（后端工具类 `RsaKeyGenerator`）
- Token 存储位置与 CSRF 策略按业务风险评估（当前为 localStorage）
- 关闭开发代理：`VITE_IS_REQUEST_PROXY=false`
- 生产环境启用 HTTPS，并确认后端 CORS 仅放行可信来源
