# jffast-ui 使用与二开文档

> 面向使用者和二次开发者。仓库根 [README.md](../README.md) 是快速开始，本文补充结构与约定。
> 后端说明见 [jffast](https://github.com/summerZstar/jffast)。

## 1 环境要求

| 依赖    | 版本                                                      |
| ------- | --------------------------------------------------------- |
| Node.js | `^22.22.1 \|\| ^24 \|\| >=26`（推荐 24 LTS，见 `.nvmrc`） |
| npm     | >= 10                                                     |

Node 23 **不可用**：`vitest` 与若干 ESLint 插件不支持该奇数版；仓库 `.npmrc` 开启 `engine-strict`，版本不符时 `npm ci` 会直接失败。

```bash
nvm use            # 读取 .nvmrc
npm ci
npm run dev        # http://localhost:7201，代理后端 /jffast-api
```

## 2 目录结构

```
jffast-ui/
├── shared/                  @jfspeed/shared 公共包（workspace）
│   └── src/
│       ├── api/             createCrud（通用 CRUD 工厂）/ http（axios 封装）
│       ├── hooks/           useTable / useForm / useDict / useResponsive
│       ├── components/      公共组件（含 Watermark）
│       ├── layouts/         布局与导航
│       ├── store/           Pinia（user / permission 等）
│       ├── locales/         中英文资源
│       ├── constants/       业务常量
│       ├── types/           全局类型声明
│       └── utils/           工具与纯函数（如 user-edit-rules）
└── src/                     Base 应用
    ├── api/                 业务接口（system / flow / codegen / ai / job …）
    ├── pages/               页面
    ├── router/modules/      路由模块（自动扫描注册）
    ├── permission.ts        路由守卫（登录态、动态路由注入）
    └── create-app.ts        createBaseApp 工厂（应用装配入口）
```

## 3 一次请求的完整链路

```
页面 → src/api/xxx.js → createCrud/http → VITE_API_URL(/jffast-api) → vite 代理或 nginx 反代 → 后端
```

- 统一响应结构 `{ code, message, data }`；`code === 200` 为成功，其余由 `shared/src/utils/request.ts` 的响应拦截器统一抛出
- 登录密码在提交前用后端下发的 RSA 公钥加密（`GET /sys/rsaPublicKey`），后端 BCrypt 存储
- 新增接口时只写 `src/api/`，不要在页面里直接 `axios`

### 3.1 CRUD 工厂

```js
// src/api/system.js
import { createCrud } from '@jfspeed/shared/api/crud';

export const userApi = createCrud('/sys/user');
// 自带 page / detail / add / update / delete
```

### 3.2 列表与表单

- `useTable`：分页、查询条件、加载态、刷新、导出
- `useForm`：新增/编辑共用表单、校验、提交锁（校验阶段即占用 `isSaving`，连续点击只提交一次）

## 4 权限

| 层   | 位置                               | 说明                                              |
| ---- | ---------------------------------- | ------------------------------------------------- |
| 路由 | `src/router/modules/*.ts`          | 与后端菜单 `component` 对应；登录后按菜单动态注入 |
| 按钮 | `v-permission="'system:user:add'"` | 与后端 `@SaCheckPermission` 同码                  |
| 数据 | 后端数据范围                       | 前端不做数据权限判断，只按后端返回渲染            |

新增页面后必须同时在后端菜单表登记（见后端 `sql/*.sql`），否则登录后不可达。

## 5 国际化与主题

- 文案放 `shared/src/locales/lang/{zh_CN,en_US}.json`，页面用 `t('key')`
- 暗黑模式由 TDesign CSS 变量驱动；自定义样式优先使用变量，不要写死色值

## 6 构建与部署

```bash
# 生产构建必须注入 RSA 公钥，缺失会被 vite.config.ts 直接拦截
VITE_RSA_PUBLIC_KEY=<公钥> npm run build   # 产物 dist/
```

- `VITE_*` 是**构建期**变量，构建后无法再改；`BACKEND_UPSTREAM` / `API_PREFIX` 是容器**运行时**变量
- 容器化：见 [Dockerfile](../Dockerfile) 与 [deploy/docker-compose.yml](../deploy/docker-compose.yml)
- 公钥必须与后端私钥成对，生成方式见后端 `deploy/gen-rsa.sh`

## 7 质量门禁

```bash
npm run lint        # ESLint，0 warning
npm run build:type  # vue-tsc --noEmit
npm test            # Vitest
npm run build       # 生产构建
```

CI 按 `.nvmrc` 安装 Node，四道门禁任一失败即红。

## 8 常见问题

| 现象                            | 原因与处理                                                             |
| ------------------------------- | ---------------------------------------------------------------------- |
| `npm ci` 报 `EBADENGINE`        | Node 版本不符，`nvm use` 切到 `.nvmrc` 指定版本                        |
| `npm run build` 报 RSA 公钥缺失 | 未注入 `VITE_RSA_PUBLIC_KEY`，按第 6 节注入                            |
| 登录一直失败但后端正常          | 前后端 RSA 密钥不成对，用 `gen-rsa.sh` 重新生成并同时更新两侧          |
| 17 位部门/角色 id 编辑后串号    | 不要对雪花 id 做 `Number()`，全链路用字符串（见 `user-edit-rules.ts`） |
