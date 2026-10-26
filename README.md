<div align="center">

# 🌪️ 疾风 (jffast) UI Base

> 极速开发，如风而至 —— 基于 Vue 3 + TDesign + Vite 的企业级中后台

[![Vue](https://img.shields.io/badge/Vue-3.5-brightgreen)](https://vuejs.org/)
[![TDesign](https://img.shields.io/badge/TDesign-1.19-blue)](https://tdesign.tencent.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue)](https://www.apache.org/licenses/LICENSE-2.0)

[快速开始](#快速开始) · [功能特性](#功能特性) · [开发指南](https://github.com/summerZstar/jffast/blob/master/docs/%E5%89%8D%E7%AB%AF%E5%BC%80%E5%8F%91%E6%8C%87%E5%8D%97.md)

</div>

---

## 🌟 项目简介

疾风 UI Base 是疾风框架的基础前端，采用 **Monorepo** 架构（npm workspaces），将公共代码和应用代码分离为 `shared` 与 `src` 两个包。

### 核心特性

| 特性                 | 说明                                                     |
| -------------------- | -------------------------------------------------------- |
| 🧩 **Monorepo 架构** | shared + src 双包，公共代码零重复                        |
| 🏭 **CRUD 工厂**     | createCrud 一行代码生成 API，useTable + useForm 搞定页面 |
| 🎨 **TDesign 组件**  | 腾讯 TDesign Vue Next，企业级 UI 组件库                  |
| 🌙 **暗黑模式**      | TDesign 主题切换，CSS 变量驱动                           |
| 🌐 **国际化**        | 中英文切换，i18n 方案                                    |
| 📱 **响应式布局**    | 多种布局模式，适配不同屏幕                               |

---

## 🏗️ Monorepo 结构

```
jffast-ui/
├── shared/                        @jfspeed/shared 公共包
│   └── src/
│       ├── api/core/              createCrud / http 适配层
│       ├── hooks/                 useTable / useForm / useDict
│       ├── utils/                 工具函数
│       ├── components/            公共组件
│       ├── store/                 Pinia 状态管理
│       ├── layouts/               布局组件
│       ├── style/                 全局样式
│       ├── locales/               国际化资源
│       ├── config/                配置
│       ├── constants/             常量
│       └── types/                 TypeScript 类型
├── src/                           Base 应用（pages / router / api / create-app.ts）
│   ├── pages/                     页面（dashboard/login/system/user/flow/ai）
│   ├── router/                    路由（modules/ 自动扫描）
│   ├── api/                       业务 API（system/codegen/flow/ai）
│   ├── assets/                    静态资源
│   ├── create-app.ts              createBaseApp 工厂函数
│   ├── main.ts                    启动入口
│   └── permission.ts              路由守卫
├── package.json                   Monorepo 根配置
└── vite.config.ts                 Vite 构建配置
```

---

## 🚀 快速开始

### 环境要求

| 依赖    | 版本                                                      |
| ------- | --------------------------------------------------------- |
| Node.js | `^22.22.1 \|\| ^24 \|\| >=26`（推荐 24 LTS，见 `.nvmrc`） |
| npm     | >= 10.x                                                   |

> **RSA 公钥**：开发模式由后端 `GET /sys/rsaPublicKey` 动态下发，无需配置。
> 生产构建（`npm run build` / `--mode release`）必须注入本次部署自己的公钥，缺失会被 `vite.config.ts` 直接拦截（见「构建生产版本」）；沿用仓库里那把示例公钥没有意义——它配不上你后端的私钥（登录必然失败），而任何公开过的示例密钥都应视为已泄露。

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:7201

> 默认账号：admin / test1234（公开测试填充值，登录后请立即修改；后端可用 `JFFAST_INIT_PASSWORD` 覆盖）。
> 首次登录前先按后端 README「初始化数据库」顺序导入 SQL 并以 dev profile 启动后端 7200，否则登录页无法获取菜单/字典。

### 3. 构建生产版本

```bash
VITE_RSA_PUBLIC_KEY=<公钥> npm run build
```

公钥**必填**：`vite.config.ts` 对 `VITE_RSA_PUBLIC_KEY` 做 fail-fast，为空或等于仓库公开的示例公钥时构建直接失败。

- 生产构建走 `--mode release`，依次读 `.env`、`.env.release`、`.env.release.local`
  （后两者**均不入库**，需要时自行创建；不存在则跳过，不影响构建）
- 公钥用后端工具类 `RsaKeyGenerator` 生成，后端 `RSA_PRIVATE_KEY` 必须成对更换
- 开发联调无需配置：公钥由后端 `GET /sys/rsaPublicKey` 动态下发

### 4. 构建镜像（可选）

```bash
docker build --build-arg VITE_RSA_PUBLIC_KEY=<公钥> -t jffast-web:latest .
```

镜像内 nginx 托管 `dist` 并反代后端。反代目标与前缀是**运行时**变量，改它不需要重新 build：

| 变量               | 默认值                | 说明                                          |
| ------------------ | --------------------- | --------------------------------------------- |
| `BACKEND_UPSTREAM` | `http://backend:7200` | 后端地址；K8s 里换成 Service DNS              |
| `API_PREFIX`       | `/jffast-api`         | 后端 context-path，须与后端的 `app.name` 对应 |

> ⚠️ `VITE_*` 是构建期烘焙的（`import.meta.env` 在 build 时静态替换），
> 容器启动后再改 `VITE_API_URL` 之类的 env **不会生效**。
> 但 `VITE_API_URL` 默认是同源相对路径，只要反代前缀不变，同一镜像可直接部署到任意域名。

编排样例见 `deploy/docker-compose.yml`（与后端栈通过外部网络 `jffast-net` 互通）；
后端侧的部署方式见 jffast 仓库的 `deploy/README.md`。

---

## 🚀 部署（两种方式）

| 方式                     | 适用场景                           | nginx 从哪来 | 你要做的                                               |
| ------------------------ | ---------------------------------- | ------------ | ------------------------------------------------------ |
| **A 容器化（一条命令）** | 新机器、演示；后端栈也在 Docker 里 | 镜像自带     | `bash deploy/init.sh` → `docker compose up -d --build` |
| **B 只打 dist 包**       | 已有 nginx，只要静态资源           | 自备         | `npm run build` → 拷 `dist/` → 渲染 nginx 配置         |

> **硬约束**：`VITE_RSA_PUBLIC_KEY` 必须与后端 `RSA_PRIVATE_KEY` **同一对**，
> 否则页面能打开、接口能通，但登录一定失败。公钥**只能来自后端那对** —— 本仓的 `init.sh` 不会也不能凭空生成。

### 方式 A：容器化部署（推荐）

前置：Docker 24+ / Compose v2；后端仓已起（或至少已跑过它的 `deploy/init.sh`）。

**1）两仓并列 clone**（`init.sh` 靠这个并列关系自动取公钥）：

```
<你的工作目录>/
├── jffast/       ← 后端仓
└── jffast-ui/    ← 本仓
```

```bash
git clone https://github.com/summerZstar/jffast.git
git clone https://github.com/summerZstar/jffast-ui.git
docker network create jffast-net        # 两栈共用的外部网络，只需建一次
```

**2）先起后端**（公钥的来源）：

```bash
cd jffast
bash deploy/init.sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

**3）本仓：一条命令准备 `.env` 并起栈**

```bash
cd ../jffast-ui
bash deploy/init.sh
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

`deploy/init.sh` 做四件事：从 `.env.example` 生成 `.env`；按「已填 → 并列后端仓的 `.env` → 报错退出」的优先级拿到公钥；跑 `docker compose config` 自检；打印访问地址与启动命令。
两仓不在同一台机时：把后端 `.env` 里 `RSA_PUBLIC_KEY` 的值手工填进本仓 `.env` 的 `VITE_RSA_PUBLIC_KEY` 再跑即可。

**4）访问**：<http://localhost:7201/>

| 项                | 默认值                | 变量               | 改动何时生效                       |
| ----------------- | --------------------- | ------------------ | ---------------------------------- |
| 页面端口          | `7201`                | `WEB_HOST_PORT`    | 运行时（改 `.env` 重启容器）       |
| 后端地址          | `http://backend:7200` | `BACKEND_UPSTREAM` | 运行时（改它不用重建）             |
| 后端 context-path | `/jffast-api`         | `API_PREFIX`       | 运行时（须与后端 `app.name` 对应） |
| DNS               | `127.0.0.11`          | `RESOLVER`         | 运行时（K8s 换集群 DNS）           |
| 对外 API 前缀     | `/jffast-api`         | `VITE_API_URL`     | **构建期**（改了要重建镜像）       |

> ⚠️ `VITE_*` 由 Vite 在 **build 时静态烘焙**进产物（`import.meta.env` 编译期替换），容器启动后再改 env 不生效。
> 只有 `BACKEND_UPSTREAM` / `API_PREFIX` / `RESOLVER` 这三个是 nginx 启动时 `envsubst` 渲染的运行时变量。

升级：`git pull && docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build`

> ⚠️ `deploy/.env` 含公钥与部署配置，不要提交（`.gitignore` 已忽略）。

### 方式 B：只打 dist，用自己的 nginx 托管

**1）打包**（`VITE_*` 必须在这里注入，产物才带正确的公钥与 API 前缀）

```bash
npm ci
VITE_RSA_PUBLIC_KEY='<后端那对的公钥>' npm run build
# 产物：dist/
```

**2）部署静态资源**

```bash
rm -rf /usr/share/nginx/html/*
cp -r dist/* /usr/share/nginx/html/
```

**3）渲染 nginx 配置**（直接复用仓内模板，3 个变量一次替换）

```bash
cp docker/nginx-ws-map.conf /etc/nginx/conf.d/00-ws-map.conf    # WebSocket 升级头映射，00- 前缀保证先加载

BACKEND_UPSTREAM=http://127.0.0.1:7200 API_PREFIX=/jffast-api RESOLVER=127.0.0.11 \
envsubst '${BACKEND_UPSTREAM} ${API_PREFIX} ${RESOLVER}' \
  < docker/nginx.conf.template > /etc/nginx/conf.d/jffast.conf

nginx -t && nginx -s reload
```

`envsubst` 后面的变量白名单是必须的：模板里还有 `$uri` / `$host` 等 nginx 自身变量，全量替换会把它们清空。

**4）nginx 主配置里放开上传大小**（否则附件上传会被 nginx 先拒）

```nginx
http {
    client_max_body_size 25M;   # 后端 multipart 上限 20MB，nginx 默认只有 1MB
}
```

模板里已经处理好的三件事：history 路由刷新回退 `index.html`、静态资源长缓存、`/upload/` 前缀改写后反代到后端。

---

## 📖 开发指南

> 目录结构、请求链路、CRUD 工厂、权限、二开步骤与常见问题：[docs/README.md](docs/README.md)。

### 创建一个业务模块（3 个文件）

**1. API（1 行代码）**

```javascript
// src/api/order.js
import { createCrud } from '@/api/core/crud';
export const orderApi = createCrud('/biz/order');
```

**2. 列表页**

```vue
<!-- src/pages/biz/order/index.vue -->
<script setup>
import { useTable } from '@/hooks';
import { orderApi } from '@/api/order';
import Save from './save.vue';

const {
  loading,
  searchForm,
  dialog,
  saveRef,
  pageParams,
  handleSearch,
  resetSearch,
  fetchData,
  handlePageChange,
  handleSizeChange,
  add,
  edit,
  handleDelete,
  handleSaveSuccess,
} = useTable(orderApi);
</script>

<template>
  <t-card>
    <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
      <t-form-item label="关键字" name="keyword">
        <t-input v-model="searchForm.keyword" clearable />
      </t-form-item>
      <t-form-item>
        <t-button theme="default" type="reset">重置</t-button>
        <t-button theme="primary" type="submit">查询</t-button>
        <t-button theme="success" @click="add">新增</t-button>
      </t-form-item>
    </t-form>

    <t-table :loading="loading" :data="pageParams.list" row-key="id" />
    <t-pagination
      :current="pageParams.pageNum"
      :page-size="pageParams.pageSize"
      :total="pageParams.total"
      @current-change="handlePageChange"
      @page-size-change="handleSizeChange"
    />

    <Save v-if="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />
  </t-card>
</template>
```

**3. 表单弹窗**

```vue
<!-- src/pages/biz/order/save.vue -->
<script setup>
import { useForm } from '@/hooks';
import { orderApi } from '@/api/order';

const emit = defineEmits(['success', 'closed']);
const { visible, mode, isSaving, formRef, form, rules, titleMap, open, setData, close, submit } = useForm({
  defaultForm: { orderNo: '', status: 1 },
  rules: {
    orderNo: [{ required: true, message: '请输入订单号' }],
  },
});

async function handleOk() {
  const res = await submit(orderApi);
  if (res) {
    close();
    emit('success');
  }
}

defineExpose({ open, setData });
</script>

<template>
  <t-dialog
    :header="titleMap[mode]"
    v-model:visible="visible"
    :confirm-btn="{ content: '确定', loading: isSaving }"
    @confirm="handleOk"
    @closed="emit('closed')"
  >
    <t-form ref="formRef" :data="form" :rules="rules">
      <t-form-item label="订单号" name="orderNo">
        <t-input v-model="form.orderNo" />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>
```

### 别名映射

| 别名           | 指向                  |
| -------------- | --------------------- |
| `@/api/core`   | shared/src/api/core   |
| `@/hooks`      | shared/src/hooks      |
| `@/utils`      | shared/src/utils      |
| `@/components` | shared/src/components |
| `@/store`      | shared/src/store      |
| `@/layouts`    | shared/src/layouts    |
| `@/style`      | shared/src/style      |
| `@/locales`    | shared/src/locales    |
| `@/config`     | shared/src/config     |
| `@/constants`  | shared/src/constants  |
| `@/types`      | shared/src/types      |
| `@/pages`      | src/pages             |
| `@/router`     | src/router            |
| `@/api`        | src/api               |
| `@/assets`     | src/assets            |
| `@`            | src                   |

---

## ⚙️ 配置说明

### Vite 代理配置

```javascript
// vite.config.ts
server: {
  port: 7201,
  host: '0.0.0.0',
  // 代理前缀 / 后端地址由 .env 的 VITE_API_URL / VITE_PROXY_TARGET 决定（默认 /jffast-api → http://localhost:7200）
  proxy: {
    [VITE_API_URL]: {
      target: VITE_PROXY_TARGET,
      changeOrigin: true,
      ws: true, // 站内通知 WebSocket 必须开启，否则推送不可达
    },
    '/upload': {
      target: `${VITE_PROXY_TARGET}${VITE_API_URL}`,
      changeOrigin: true,
    },
  },
}
```

---

## 📜 许可证

本项目基于 [Apache License 2.0](LICENSE) 开源。

---

## 🏛️ 相关项目

| 项目                                        | 说明      | 许可证     |
| ------------------------------------------- | --------- | ---------- |
| [jffast](https://github.com/summerZstar/jffast) | Base 后端 | Apache 2.0 |

完整开发约束（Monorepo、别名映射、组件/Hooks 准入、权限指令、i18n、样式、安全约束、测试）详见 [前端开发指南](https://github.com/summerZstar/jffast/blob/master/docs/%E5%89%8D%E7%AB%AF%E5%BC%80%E5%8F%91%E6%8C%87%E5%8D%97.md)。
