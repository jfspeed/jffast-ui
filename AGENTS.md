# jffast-ui 项目规则

> 疾风框架基础前端（Base，Apache 2.0）。最后更新：2026-10-29  
> 结构：协作规范 → 前端规范 → 项目信息。冲突时以本文件「前端规范」与权威文档摘要为准。

<!-- BEGIN: 协作规范 -->

# jffast-ui 协作规范（通用）

> 本节与具体技术栈无关。
> 详细编码约定以 `docs/前端开发指南.md` 为准，本节只定协作纪律。
>
> **术语「私有信息」（统称，两类都算）**
>
> - **身份类**：姓名、个人邮箱、手机号、账号名、本机用户名
> - **环境类**：本机绝对路径、私有端口、私有项目名、内部域名、内部机制（如同步方式）
>
> 下文一律用「私有信息」指代这两类，不再细分称呼。
> 需要落地的**实际值**一律放 `LOCAL.md`（该文件不入库，必须列入 `.gitignore`）；`AGENTS.md` 里只保留引用，不写值。

## 一、开发原则：先分析再实现

收到功能需求后，**必须先完成需求分析，再动手写代码**。分析至少覆盖：

1. **功能边界** 2. **影响范围** 3. **数据模型**（涉及后端时） 4. **兼容性** 5. **配置方式** 6. **交互与权限** 7. **文档同步**

**禁止**：用户说一个需求就立刻写代码。先输出简洁的分析结论（要点列表），确认后再实现。
分析中发现需求有歧义或遗漏，**必须主动提出**，不得自行假设。

## 二、文档同步规则

### 2.1 文档归属

| 归属         | 位置                                 | 说明                                     |
| ------------ | ------------------------------------ | ---------------------------------------- |
| 权威编码规范 | `docs/前端开发指南.md`               | 前端编码约定唯一权威                     |
| 功能级文档   | `docs/`                              | 按模块分目录；暂缺则建                   |
| 使用者文档   | 独立文档站（本仓不含使用者文档目录） | 对外可见功能说明                         |
| 部署文档     | `README.md` + `deploy/`              | 前端镜像（nginx+dist）构建与反代变量说明 |
| AI 规则文件  | 仓库根 `AGENTS.md`                   | 本文件                                   |

### 2.2 同步规则

| 变更类型                                                | 需更新的文档                                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 新增/修改**业务页面**（`pages/`、业务路由、业务 API）   | 对应模块文档 / README 登记 + 权限标识与后端契约一致；**不**要求改本文件「前端规范」索引与 `docs/前端开发指南.md`（二者是**模式/能力**文档，只随公共能力与约定变更） |
| 新增/修改 **hooks、公共组件、工具、路径别名等公共能力** | 本文件「前端规范」索引 + `docs/前端开发指南.md`                                                                                                                     |
| 修改 API 约定 / 权限标识                                | 本文件 + 与后端契约一致（`模块:业务:操作`）                                                                                                                         |
| 修改技术栈 / 端口 / 仓库结构                            | 本文件                                                                                                                                                              |
| 影响 AI 判断的变更                                      | 本文件                                                                                                                                                              |

### 2.3 文档组织规范

- 文档统一放 `docs/`；引用使用**仓库根相对路径**；写入前确认目标存在
- 新增/移动/删除文档须在 README 或模块文档清单登记

### 2.4 AI 行为规范（硬性）

1. 改完代码检查是否需更新文档，未更新不得提交
2. 引用路径校验后再写入
3. 新增公共能力**当次补进**「可复用能力索引」

## 三、AI 规则文件（AGENTS.md）统一约定

- 统一使用仓库根 `AGENTS.md`；不引入异构规则副本
- **锚定权威规范**：只做摘要 + 项目特有信息，避免双份漂移
- **自足性**：单独拉取本仓时 `AGENTS.md` 必须完整可用
- **私有信息零残留**：实际值放 `LOCAL.md`；本文件不写具体值
- **谁改动谁维护**：功能/端口/技术栈变更同步更新本文件

## 四、提交规范

- 格式：`type(scope): description`
- **提交信息不得含私有信息**；无密钥/调试残留；文档已同步
- 提交前三门禁全绿：`npm run lint`（0 警告）、`npm test`、`npm run build:type`（vue-tsc 0 错，CI 硬失败不豁免）

## 五、通用红线

1. 不擅自扩大范围
2. 不硬编码敏感信息（密钥走环境变量；RSA 公钥在 `.env` 属配置样例）
3. 不泄露私有信息（有值必迁 `LOCAL.md`）
4. 不跳过验证（页面问题须真实浏览器验证）
5. 不吞异常
6. 破坏性操作先确认

<!-- END: 协作规范 -->

<!-- BEGIN: 前端规范 -->

# jffast-ui 前端通用规范

## 一、复用优先（硬约束）

新增任何 hook / 组件 / 工具函数 / API 封装前，**必须先查下表**；表里已有就复用，没有才允许自建。
自建完成后**必须补进本表**。

### 1.1 可复用能力索引（增量维护）

| 类别   | 能力              | 路径                                                          | 何时用                                                                                                                                    |
| ------ | ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 脚手架 | CRUD API 工厂     | `shared/src/api/core/crud.js`（`createCrud`）                 | 标准增删改查，默认 create/update/delete/detail/page/list；**不自带 `batchDelete`**（只有实现了批量删除的资源才在自己的 `options` 里声明） |
| 脚手架 | 表格 hook         | `shared/src/hooks/useTable.js`                                | **所有列表页表格逻辑，禁止重写**                                                                                                          |
| 脚手架 | 表单 hook         | `shared/src/hooks/useForm.js`                                 | **所有新增/编辑弹窗，禁止重写**                                                                                                           |
| 脚手架 | 字典 hook         | `shared/src/hooks/useDict.js`                                 | 下拉选项取字典                                                                                                                            |
| 请求   | HTTP 封装         | `shared/src/api/core/http.js` + `shared/src/utils/request.ts` | 统一拦截器、token、`R` 结构；禁止裸用 axios                                                                                               |
| 工具   | 权限              | `shared/src/utils/permission.js`                              | `v-permission` / `hasPermission` / `hasRole`                                                                                              |
| 工具   | 加解密            | `shared/src/utils/crypto.js`                                  | `rsaEncrypt`（**jsencrypt**，非 Web Crypto）；**无 `tool.js`**                                                                            |
| 工具   | 日期              | `shared/src/utils/date.ts`                                    | 格式化                                                                                                                                    |
| 工具   | 错误收集          | `shared/src/utils/error-logger.ts`                            | `initErrorLogger()` JS/Promise/接口上报                                                                                                   |
| 工具   | 主题/图表色       | `shared/src/utils/color.ts`                                   | `getColorFromTheme` / `getChartListColor`                                                                                                 |
| 工具   | 图表辅助          | `shared/src/utils/charts.ts`                                  | 时间轴 / 随机数组                                                                                                                         |
| 工具   | 路由装配          | `shared/src/utils/route/`                                     | `setupViewsModules` + LAYOUT/IFRAME                                                                                                       |
| 工具   | 登录跳转 redirect | `shared/src/utils/login-redirect.ts`                          | 跳登录页 / 读回跳地址的**唯一入口**（编码、解码、站内白名单），禁止自行 `encodeURIComponent` 拼回跳                                       |
| 工具   | WebSocket         | `shared/src/utils/websocket.ts`                               | 站内通知单例 + 心跳 + 退避重连                                                                                                            |
| 状态   | store 模块        | `shared/src/store/modules/`                                   | user / permission / setting / notification…                                                                                               |
| 约定   | 路径别名          | `vite.config.ts`                                              | 见项目信息别名表；禁止深层 `../../`                                                                                                       |
| 约定   | 路由注册          | `src/router/modules/*.ts` 自动扫描                            | 见项目信息                                                                                                                                |
| 常量   | 权限常量          | `shared/src/constants/`                                       | `ROLE_SUPER_ADMIN` / `PERM_WILDCARD`                                                                                                      |

### 1.2 复用纪律

- 表格统一 `useTable`，表单统一 `useForm`，**禁止在页面里重写**
- 接口统一走 HTTP 封装，禁止绕过拦截器
- 新增页面前先看已有同类页面，照最接近的改

## 二、页面标准结构

```
src/pages/{模块}/{页面名}/
├── index.vue     列表页（搜索 + 表格 + 操作列）
└── save.vue      新增/编辑弹窗（表单）
```

- 页面内不写请求细节，请求走 API 层
- 删除确认用 `DialogPlugin.confirm()`（不是 `MessagePlugin.confirm`）
- **路由页必须声明组件名**：被菜单/静态路由直接挂载的 `index.vue`（`flow/task/todo.vue` 这类）要写
  `defineOptions({ name: 'Xxx' })`，`Xxx` = 静态路由 `name` = 后端菜单 `upperFirst(sys_menu.path)`。
  `Content.vue` 的 keep-alive `:include` 用 `route.name`，而 Vue 按**组件名**匹配；缺这句页签保活**静默失效**（不报错）

## 三、浏览器测试规范（硬性）

**前端页面功能必须通过浏览器自动化在真实浏览器中验证**；**不得仅通过接口调用断言前端功能**。

1. **工具**：Playwright（与仓库既有脚本约定一致，不要混用两套）
2. **脚本位置**：按仓库测试目录约定；本仓单测用 Vitest（`npm test`）
3. **截图**：用完立即删除，不得留在仓库
4. **等待**：`wait_until='networkidle'`；元素用 locator wait，避免固定 sleep 滥用
5. **验证深度**：页面能开、关键元素可见、核心操作完成、结果符合预期；弹窗/批量/权限差异分别覆盖

## 四、常见坑与已知限制

- **`tool.js` 已删除**：加解密只走 `crypto.js`（底层 `jsencrypt`，不是 Web Crypto），勿再引用
- **`/jffast-api` 代理必须 `ws: true`**，否则站内通知 WebSocket 升级不转发
- **同一代理还须 `rewriteWsOrigin: true`**：后端把「`allowed-origins` 留空」定义为**只放行同源握手**
  （Spring `OriginHandshakeInterceptor`：非同源且来源不在名单 ⇒ 403）。dev 下浏览器 `Origin` 是页面源
  （:7201），而 `changeOrigin` 已把 `Host` 改成后端（:7200）⇒ 后端判跨源 ⇒ 握手 403、
  站内通知连不上。改写 `Origin` 让 dev 与生产（nginx 同源反代）保持同一套语义。漏掉这条的表现是
  「接口全通、只有站内通知永远收不到推送」
- **只加路由文件不插后端菜单** → 菜单不显示（菜单由 `sys_menu` 驱动时）
- Token 写入 `localStorage` 的键为 `token` / `user`（与 request 拦截器一致），勿另起键名

<!-- END: 前端规范 -->

<!-- BEGIN: 项目信息 -->

# jffast-ui 项目信息

> 权威编码规范：`docs/前端开发指南.md`（本仓唯一权威）

## 一、项目概览

- **定位**：疾风框架的基础前端，Vue 3 + TDesign + Vite 企业级中后台（Apache 2.0）
- **License**：Apache 2.0
- **技术栈**：Vue 3.5（`<script setup>`）、Vite 6、Pinia 3、Vue Router 4、TDesign Vue Next ^1.19、less
- **Monorepo**：npm workspaces —— `shared/`（`@jfspeed/shared`）+ `src/`（Base 应用）
- **端口与环境**：前端 **7201**，代理后端 **7200**（`/jffast-api`）；Node.js `^22.22.1 || ^24.0.0 || >=26.0.0`（见 package.json engines，推荐 24 LTS）；npm 需 **10.x+**（Node 22/24 自带即满足；`engines` 只声明 node，`.npmrc` 的 engine-strict 只对已声明的 node 生效）

## 二、架构与目录结构

```
jffast-ui/
├── shared/src/                # @jfspeed/shared 公共包
│   ├── api/core/              #   crud.js（createCrud）/ http.js
│   ├── hooks/                 #   useTable / useForm / useDict / index.ts
│   ├── components/            #   DeptUserTreeSelect / LanguageSwitcher / color / result / thumbnail
│   ├── store/modules/         #   user / permission / setting / tabs-router / notification
│   ├── layouts/               #   布局（SideNav / Header / frame 等）
│   ├── style/                 #   index.less / variables.less / reset.less
│   ├── locales/lang/          #   zh_CN.json / en_US.json
│   ├── utils/                 #   request.ts / permission.js / crypto.js / date.ts / websocket.ts / error-logger.ts / color.ts / charts.ts / route/
│   ├── assets/                #   公共静态资源（logo 等）
│   ├── config/ constants/ types/
├── src/                       # Base 应用
│   ├── pages/                 #   dashboard / login / result / demo / system / flow / ai / user / social
│   ├── router/modules/        #   ai.ts / demo.ts / flow.ts / homepage.ts / system.ts / user.ts（自动扫描）
│   ├── api/                   #   平铺：system.js / codegen.js / flow.js / ai.js / job.js / demo.js / oauth2Client.js / index.js；登录专用 modules/auth.js
│   ├── assets/  types/  create-app.ts  main.ts  permission.ts
├── docker/                    # nginx 配置：默认站点模板 + WebSocket map
├── deploy/                    # 前端栈 compose + .env.example
└── vite.config.ts  package.json  .env.development  Dockerfile  .dockerignore
```

### 别名映射表（以 vite.config.ts 为准）

| 别名                                                                                                              | 指向                  |
| ----------------------------------------------------------------------------------------------------------------- | --------------------- |
| `@/api/core`                                                                                                      | shared/src/api/core   |
| `@/api/modules`                                                                                                   | src/api/modules       |
| `@/api/system` `@/api/codegen` `@/api`                                                                            | src/api 对应          |
| `@/hooks` `@/utils` `@/components` `@/store` `@/layouts` `@/style` `@/locales` `@/config` `@/constants` `@/types` | shared/src 对应子目录 |
| `@/pages` `@/router` `@/assets`                                                                                   | src 对应              |
| `@jfspeed/shared`                                                                                                 | shared/src            |
| `@jfspeed/base`                                                                                                   | src/create-app.ts     |
| `@`                                                                                                               | src                   |

## 三、环境要求

| 项           | 要求                                                              |
| ------------ | ----------------------------------------------------------------- |
| Node.js      | `^22.22.1 \|\| ^24.0.0 \|\| >=26.0.0`（推荐 24 LTS，见 `.nvmrc`） |
| npm          | >= 10.x                                                           |
| 后端（联调） | 7200 /context-path `/jffast-api`                                  |

本机路径等见不入库的 **`LOCAL.md`**。

## 四、开发规范索引

| 主题                 | 位置                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| 前端编码规范（权威） | `docs/前端开发指南.md`                                                             |
| 后端 / 全栈契约摘要  | 见项目信息与协作规范；后端权威为 jffast 仓的开发规范（**单仓拉取时以本文件为准**） |
| 可复用能力索引       | 本文件「前端规范」块                                                               |

## 五、关键文件速查

| 用途                     | 路径                                                                       |
| ------------------------ | -------------------------------------------------------------------------- |
| CRUD 工厂 / http         | `shared/src/api/core/crud.js`、`http.js`                                   |
| 请求拦截 / token / 响应  | `shared/src/utils/request.ts`                                              |
| 表格 / 表单 / 字典 hooks | `shared/src/hooks/useTable.js`、`useForm.js`、`useDict.js`                 |
| 路由模块（自动扫描）     | `src/router/modules/*.ts`                                                  |
| 业务 API 目录            | `src/api/`（平铺 + `modules/auth.js`）                                     |
| 页面示例                 | `src/pages/demo/demoExample/index.vue` + `save.vue`                        |
| 应用入口 / 工厂 / 守卫   | `src/main.ts`、`src/create-app.ts`（`@jfspeed/base`）、`src/permission.ts` |
| Vite / 环境              | `vite.config.ts`、`.env.development`                                       |
| 单测                     | `npm test`（Vitest，配置 `vitest.config.ts`）                              |

## 六、常见坑与已知限制

- 语言层 `.ts` 尽量不动，业务代码用 `.js`
- `DialogPlugin.confirm` 用于删除确认
- 多租户开关 `VITE_ENABLE_MULTI_TENANT` 影响**两处**：请求头拼装（`X-Tenant-Id`，`shared/src/utils/request.ts`）与路由过滤（`filterProRoutes`，`shared/src/store/modules/permission.ts`，关闭时剔除多租户专有菜单）。注意：绕开 axios 的 `fetch`（如 SSE 流式）不会自动带这两个头，需自行补齐
- 路由守卫（`src/permission.ts`）对声明了 `meta.perm` 的路由做页面级权限校验，**冷加载（刷新/直连 URL）与热跳转同口径**；新增静态路由若要控权限必须显式写 `meta.perm`，否则任何登录用户知道 URL 即可直达
- **登出只有单一流程**（`shared/src/layouts/components/Header.vue` 的 `handleLogout`）：先 `await getAuthApi().auth.logout()` 吊销后端会话（失败不阻塞退出），再 `await user.logout()` 清 Pinia / localStorage / cookie / WebSocket，再 `await permissionStore.restoreRoutes()` 卸载动态路由，最后 `router.replace(buildLoginRoute(...))`。新增登出入口必须复用这条链；只跳转 `/login` 会留下上一账号的菜单与权限（同标签页、多标签页都会），因为页面不刷新、Pinia 与动态路由仍在内存里
- 安全：密码 RSA（`crypto.js`）；Token 不写明文敏感信息
- **生产构建必填 `VITE_RSA_PUBLIC_KEY`**：`vite.config.ts` fail-fast（为空、或不是合法 RSA 公钥即 Base64(X.509 SPKI DER) 解析失败即构建失败）。构建走 `--mode release` 读 `.env` / `.env.release`，用环境变量或 `.env.release.local` 注入；仓库不提供 `.env.production`；CI 由 `ci.yml` 注入。开发联调时公钥由后端 `GET /sys/rsaPublicKey` 动态下发（后端 dev/test 启动时生成一次性密钥对），**仓库不存任何密钥字面量**，也没有示例公钥可供比对

## 七、待填占位符

当前无待填占位符。（早期 `{{文档站路径}}` 占位已收敛：使用者文档位于独立文档站，本仓不再引用具体路径。）

<!-- END: 项目信息 -->
