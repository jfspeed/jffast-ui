# E2E 冒烟测试（Playwright）

基于 Playwright 的端到端冒烟用例，覆盖：登录 → 首页菜单、系统管理列表渲染、搜索交互。

## 准备

```bash
npm install
npx playwright install chromium   # 首次运行需下载浏览器
```

## 运行

```bash
# 方式一：本地已启动 dev 服务（推荐，直接复用）
npm run dev          # 另开终端保持运行
npm run test:e2e

# 方式二：让 Playwright 自动拉起 dev 服务
npm run test:e2e     # webServer 会自动执行 npm run dev，结束后自动关闭
```

默认访问 `http://localhost:7201`（可用 `E2E_BASE_URL` 覆盖）。

## 登录与验证码

- 默认使用占位账号 `admin` / `change-me`，请用环境变量覆盖为本地测试账号：
  `E2E_USERNAME`、`E2E_PASSWORD`（切勿把真实凭据写进仓库）。
- 验证码：用例会拦截 `/sys/needCaptcha` 返回「不需要验证码」；若仍出现验证码输入框，
  用 `E2E_CAPTCHA_CODE` 提供识别结果。
- token 兜底：设置 `E2E_TOKEN` 时跳过登录表单，直接把登录态写入 `localStorage['token']`。

## 常见失败

登录失败不再表现为「等满超时后报 `waitForURL` 超时」：`login()` 会抓 `/sys/login` 的响应，
把服务端的 `code` / `message` 原样带进报错。对照下表处理：

| 报错里的 message                         | 原因                                                                                                                                        | 处理                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 请输入验证码                             | 该账号累计登录失败 ≥2 次，服务端开始强制图形验证码（Redis 计数，约 7 分钟后过期）。上面的 `needCaptcha` mock 只挡前端渲染，挡不住服务端判定 | 等锁过期，或设 `E2E_CAPTCHA_CODE`，或用 `E2E_TOKEN` 跳过表单 |
| 用户名或密码错误，且报错说明密码是占位值 | `change-me` 只是占位符，不是任何账号的密码                                                                                                  | 显式设置 `E2E_PASSWORD`（和 `E2E_USERNAME`）                 |
| 接口已成功但页面未跳转                   | 前端路由/权限问题，不是凭据问题                                                                                                             | 查浏览器控制台与 `router` 守卫                               |

## 产物

失败用例的 trace / 截图 / HTML 报告统一输出到 `e2e/.artifacts/`（本地临时产物，无需提交）。
