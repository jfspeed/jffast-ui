# 更新日志

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式，版本号遵循[语义化版本](https://semver.org/lang/zh-CN/)。

> **版本口径说明**：`package.json` 与 `shared/package.json` 已由发布指令统一从 `1.0.0-SNAPSHOT` 定版为 **`1.0.0`**（首发，见 [release-info.md](release-info.md)）。
> 下文的 `## [未发布]` 段落即首发内容，打 `v1.0.0` tag 时定版为该版本并标注日期。

## [未发布]

### 新增

- 前端第三方署名清单：新增根级 `NOTICE`（Vue / TDesign / ECharts / bpmn-js 等逐项署名，许可标识逐个按 `node_modules` 的 `package.json` 与 LICENSE 文件核验）
- 新增回归测试：`src/api/flow.test.ts`（流程图 blob 契约）、`src/api/system.test.ts`（请求体形状与后端签名对齐）、`shared/src/hooks/useTable.test.ts`（批量删除二次确认门控），共 9 条用例
- 用户表单「归属部门」：新增单一部门树选择（非超管仅可见自身数据范围内的部门），部门绑定多选仅超管可编辑；自助编辑时部门与角色控件只读
- 用户编辑规则抽为纯函数 `shared/src/utils/user-edit-rules.ts`（`normalizeDeptId` / `computeIsSelfEdit` / `computeSubmittedDeptIds` / `evaluateDeptBindingRules`）+ 34 项单测；`user-store` 新增 `isSuperAdmin` 派生 getter 与 8 项回归测试
- 共享层回归测试：`useForm.test.js`（校验阶段提交锁、add/update 分支、连续点击只提交一次）与 `websocket.test.ts`（子协议优先、一次性 query 降级、JSON 帧分发、显式关闭不再重连）
- 岗位管理：`src/pages/system/post/` 列表 / 表单页 + 路由与菜单（配套后端 `sql/sys_post.sql`）
- 文件管理：`src/pages/system/file/` 列表页（下载 / 批量删除）+ 路由与菜单（配套后端 `sql/sys_file.sql`）
- 异步任务：`src/pages/system/task/` 任务列表（进度跟踪 / 结果文件下载）+ 路由与菜单
- 通知发送：`src/pages/system/notification/send.vue` 发送通知页面
- 全局水印：登录后叠加「应用名 + 用户名 + 时间」水印（`shared/src/components/Watermark.vue`）
- 移动端适配：`useResponsive` 断点 Hook + 侧边栏抽屉 `MobileNavDrawer.vue` + 顶栏压缩
- 流程设计器可视化模式：bpmn-js 拖拽画布 + 右侧属性面板（元素 ID/名称/UserTask 审批人类型与取值，经 Flowable moddle 扩展读写），与 XML 代码模式双向同步，部署链路不变
- 审批人数据流打通：引擎按任务级扩展属性逐任务解析画布配置的审批人（此前仅支持流程变量方式），设计器说明文案同步
- 本地 echarts 依赖：仪表盘图表改走 npm `echarts`（`shared` 已有 ^6.1.0，本包显式声明），不再动态加载 CDN
- E2E：Playwright 冒烟用例（登录 / 系统列表 / 系统查询）与 `playwright.config.ts`
- 前端镜像与编排：`Dockerfile`（node 构建 dist → nginx 托管并反代后端）、`docker/nginx.conf.template`、`deploy/docker-compose.yml`（与后端栈经外部网络 `jffast-net` 互通）—— 此前前端没有任何容器化文件
  - 反代的 `BACKEND_UPSTREAM` / `API_PREFIX` / `RESOLVER` 是**运行时**变量（容器启动时渲染），同一镜像在 compose 与 K8s 下只换 env 即可，不需要重新 build
  - 上游地址走变量 + `resolver` 延迟解析：写成字面量 `proxy_pass` 会让 nginx 在启动时解析主机名，后端缺席时容器 `[emerg]` 直接退出，改为运行时解析后后端不在只是接口 502
  - 两个反代 location 加 `^~`：静态资源的正则 location 优先级高于前缀匹配，否则 `/upload/xxx.png` 会被当成磁盘静态文件返回 404

### 修复

- **按钮级权限码没有前端入口（19 个）**：种子 `sys_menu.perms` 有、后端 `@SaCheckPermission` 有，**前端却没有任何门控** —— 按钮对所有人显示，点下去被服务端 403，用户只看到一句"接口失败"。本次补齐：`demo:example:update|delete`（含批量删除与状态开关）、`demo:tenant-example:edit|delete`、`demo:leave:view|edit|delete`、`ai:document:edit|delete`、`ai:conversation:delete`、`system:config:update|delete`、`system:cache:delete`（清空全部 / 清空单个 / 删除键三处）、`system:oauth2client:update|delete|token`、`system:notification:template:view`；权限码与后端注解**逐条对齐**（oauth2 的「清除令牌缓存」复用后端的 `update` 权限）
- **系统日志「清理历史日志」没有入口**：后端 `DELETE /sys/log/clean`（`SysLogController#clean`，权限 `system:log:delete`）与种子权限行都已就位，前端**既无 API 也无按钮** ⇒ 能力等于半残。补 `api.log.cleanLog(days)` 与「清理历史日志」对话框（可填保留天数，默认 90 天），按钮带 `v-permission="'system:log:delete'"`
- **`<t-result>` 解析不到组件**：组件展示页用了 `<t-result>`，但本仓锁定的 `tdesign-vue-next 1.20.9` **没有 Result 组件**（其 `es/components.mjs` 导出表里没有）⇒ Vue 解析失败、只 `console.warn`，页面**少一块却没有任何报错**，编译 / 类型检查 / 单测全绿。改用确实存在的 `t-icon` + 文本组合出同样的结果态展示
- **`--mode production` 绕过 RSA 公钥 fail-fast**：`vite.config.ts` 原先只在 `command === 'build' && mode === 'release'` 时校验公钥，于是 `vite build --mode production` 完全跳过 ⇒ 产物里没有公钥 ⇒ 登录只能走**明文密码**分支。而仓里还留着一份**无人读取**的 `.env.production`（只在 `--mode production` 生效，仓内没有任何脚本用这个 mode），更容易让人以为"生产就该用 production 模式"。删除该死配置，并把校验改为「除 test 外所有 build 都校验」
- **i18n 死键清理**：中英两份语言包各 1581 个叶子键，其中 **534 个无人引用**（两个方向都不会坏，但中英副本会各自漂移、评审也看不出哪些还在用）。按「**全消费方并集**」清理——本包的语言文件被所有同源前端共用，只按本仓统计会把别的入口正在用的键当成死键删掉（实测就有一枚 Pro 登录页在用的键会被误删）；清理后两份各 1047 个叶子键、**零未使用**，且所有保留键的取值**一字未改**
- 定时任务「查看日志」按钮零反应：`(window as any).$router?.push(...)` —— 本仓**从未给 `window.$router` 赋值**（应用走 `app.use(router)` → `globalProperties.$router` 与 `requireRouter()` 注入），可选链短路 ⇒ 点击无跳转、无报错；任务日志页读 query 的同一写法导致从任务页跳过来时 `jobName`/`jobGroup` 预筛选永远不生效。两处改用 `useRouter()` / `useRoute()`
- 示例管理「导入」按钮不发请求：TDesign Upload 的 `onChange` 首参是**数组**（`onChange?: (value: Array<T>, context) => void`），原写法从首参解构 `{ file }` 恒为 `undefined` ⇒ 直接 return、永远不发请求且无任何提示。改为取数组首项的 `.raw`（与用户导入页同写法）
- **静态路由模式不再等于「免鉴权」**：`VITE_USE_STATIC_ROUTES=true` 时 `buildAsyncRoutes()` 此前直接 `return`，而这里是全仓**唯一**在路由初始化阶段向后端确认 token 有效性的位置（`auth.getUserInfo()`）。后果是双重的：① 已过期 / 已被踢出 / 已吊销的 token 仍能带着 localStorage 里的旧权限进全量路由树（首屏照渲染，直到后续接口 401 才被弹回）；② `user_permissions` 永不刷新，权限被回收后要等到显式登出才生效。现在该模式**只跳过「按后端菜单拼装路由树」**，仍然请求一次会话并用返回刷新权限缓存，401 与其它模式一样转成「登录已失效」。`.env.example` 同步标明「仅适合离线演示 / 截图」
- **CSP 收紧（实测验证）**：`index.html` 的内联脚本 `window.global = window` 外置为同源的 `public/global-shim.js`（等价执行顺序：经典脚本先于 `type="module"` 执行），从而可以把 `script-src` 从 `'self' 'unsafe-inline' 'unsafe-eval'` 收紧；同时移除 `connect-src` 里的 `http/https://localhost:*`（dev 跨域由 vite proxy 承接，浏览器侧始终同源）。**`unsafe-eval` 经实测必须保留**：TDesign 分步表单、其内置的 intlify 消息编译器、echarts 的 GeoJSON 解析三处都用 `new Function`，去掉后首屏 `EvalError`、**整页空白**，已在 `index.html` 注释里写明以免再次误删。产物已用 headless 渲染冒烟确认：0 内联脚本、无 CSP 违规、首屏正常
- **`window.open` 补齐 `noopener,noreferrer`**：文件管理预览（URL 来自后端记录）与菜单外链（后台可编辑，属不可信输入）缺 `noopener` 时新页面可通过 `window.opener` 反向操作本页（标签劫持），referer 也会外泄。社交绑定授权弹窗**刻意不加**：它依赖 `window.open` 的返回值做 `event.source` 身份校验，加了会被置空导致回调失效
- **监听器泄漏修复**：`layouts/setting.vue` 用匿名箭头函数 `addEventListener` 却没有 `onUnmounted`，无法解绑；该组件同时被登录页与主布局使用，来回切换会反复叠加监听器（HMR 下更明显）。改为保存元素引用 + 命名函数，成对解绑（全仓其余 8 处监听/定时器均已正确配对）
- **依赖升级并清零审计告警**：`vite` `6.4.3 → 6.4.5`（修 dev server 的任意文件可读 / 跨域脚本执行 / launch-editor 命令注入三个 High）、`happy-dom` `^20.14.5 → ^21.0.4`（CVE-2026-33943 未修完全的宿主代码执行，需跨大版本）、`npm audit fix` 处理 `fast-uri`（stylelint 链路）。至此含 dev 依赖在内 **`npm audit` 0 漏洞**
- **包元数据补齐**：根 `package.json` 补 `description` / `repository` / `homepage` / `bugs`（此前只有 `shared/package.json` 有，两边不一致）
- **版本定版：`1.0.0-SNAPSHOT` → `1.0.0`（首发）**，根 `package.json` 与 `shared/package.json` 同步
- BPMN 选文件完全失效：TDesign Upload **没有 `select` 事件**（emits 只有 `onChange` / `onSelectChange`），`@select` 被当作原生 DOM 事件落到根 `<div>`，选文件时永不触发；且形参期望 `{ files }` 而 `onChange` 给的是数组。流程定义部署弹窗与流程设计器的「导入BPMN」两处改为 `@change` + 取 `files[0].raw` —— **流程设计器此前无法导入任何 BPMN**
- 用户列表「创建时间」范围筛选静默失效：日期选择器的数组值经 axios 默认序列化变成 `createTime[]=…`（扁平数组统一加 `[]` 后缀），后端 `@RequestParam Map<String,Object>` 收到的键是 `"createTime[]"` ⇒ `map.get("createTime") instanceof List` 恒 false ⇒ `beginTime`/`endTime` 永不生成 ⇒ **筛选完全无效且无任何报错**。改按 log 页口径：选择器值落 `dateRange`，`@change` 归一化成 `beginTime`/`endTime`；导出与异步导出同步改为直接透传
- 代码生成器补「打包下载」：后端本就有 `POST /sys/codegen/download-zip`（其注释明写「JAR/Docker/K8s 部署同样可用」），前端却只实现了 `saveLocal`（JAR 下必然报错，并提示用户去用一个 UI 里并不存在的功能）。补 `downloadZip` 与「打包下载」按钮，payload 与 save-local 共用同一构造器
- 通知中心行操作补权限门控：编辑 / 发送 / 删除 / 统计 / 复制此前**无任何 `hasPermission` 判断**，只有 `system:notification:view` 的角色也能看到全部操作链接、点击后弹 403（同类页面 role/post/dept 均已门控）
- 部门备注与菜单高亮补齐表单字段：`SysDeptRequest.remark` 与 `SysMenuSaveRequest.activeMenu` 后端均已支持（后者会写进菜单 `MetaVo.activeMenu`），前端表单无对应字段 ⇒ 能力在 UI 上不可达
- `bpmn-moddle` 显式声明为 devDependency：此前仅靠 `bpmn-js` 的传递依赖命中，`bpmn-js` 升级后 `npm test` 可能直接失败
- 图标 sprite 第三方署名订正：`public/tdesign-icons-sprite.js` 原头部把 Tencent TDesign 图标（MIT）标为 jffast 的 Apache-2.0 ⇒ 改为保留上游 MIT 版权与许可声明（MIT 硬性要求），并注明产物来源；生成脚本随仓入库（`scripts/gen-tdesign-icon-sprite.cjs`），产物可复现
- NOTICE 补齐 bpmn.js 的**水印保留条款**与 `bpmn-moddle` 条目：bpmn-js 的许可不是纯 MIT —— 它额外要求「渲染图中的 bpmn.io 水印不得被移除或改动，且必须完整可见、不被其他元素视觉遮挡」。本仓使用 bpmn-js Modeler（会渲染该链接），故在 NOTICE 中如实记录该条款与合规方式
- 批量删除二次确认失效：`DialogPlugin.confirm` 返回的是 DialogInstance（不是 Promise），原 `await` 写法让「已确认」恒为真 ⇒ 点一下就真删、确认框形同虚设；`useTable.handleBatchDeleteConfirm` 改用 `onConfirm` 回调
- 文件批量删除 400：`http.delete(url, data)` 的 data 直接就是请求体，原写法 `{ data: ids }` 被包成 `{"data":[...]}`，与后端 `@RequestBody List<Long> ids` 不匹配；改为传裸数组
- 取消流程实例的取消原因丢失：后端 `reason` 是 `@RequestParam`（查询参数），前端却放进请求体 ⇒ Spring 收不到，流程实例里记成空而页面仍提示「取消成功」；改为走查询参数
- 任务日志清空按钮权限位由 `system:job:delete` 改为 `system:job:log:clean`，与后端端点及菜单种子对齐（此前授了 `log:clean` 的人看不到按钮，授了 `job:delete` 的人看得到却会被 403）
- 通知发送统计的「总计」：后端 `total` 是**筛选后**的条数（`isRead` 过滤已下推），与「已读 / 未读」不同源，界面三个数字对不上；摘要区的总计改用「已读 + 未读」，分页仍用筛选后的条数
- 流程图 PNG 100% 加载失败：全局响应拦截器对 `responseType: 'blob'` 的响应**直接返回 Blob 本身**（不是 AxiosResponse），原代码取 `res.data` 恒为 undefined，且异常被页面的空 catch 吞掉，用户只看到「无流程图」空状态
- 前端权限指令补齐（ai / demo / codegen 等），并加 `isSuperAdmin` 通配兜底（后端用户不返回 `roleList` 时超管身份会静默丢失）
- Node 版本要求与 `package.json` 的 `engines` 对齐（`.npmrc` 设了 `engine-strict=true`，版本不满足时 `npm install` 直接失败，原文档写的 `>= 20.19.0` 装不上）
- 雪花 id 精度：用户表单的部门/角色 id 全链路走字符串，禁止 `Number()` 归一 —— 17 位雪花 id 经 `Number()` 会被截断（实测 `13794145807417349` → `13794145807417348`），导致编辑命中错误部门
- 登出残留：`Header.vue` 只调后端登出会留下 Pinia 内存态、localStorage 与已注入的动态路由，同标签页重新登录沿用上一账号的菜单/权限；改为后端登出后清理 `user`、`permissionStore.restoreRoutes()` 再 `router.replace` 回登录页
- 重置密码结果：后端改为返回 `{userId,userName,password}` 对象后，前端弹窗展示一次性随机口令（关闭后不可再查看），不再只提示「成功」
- 社交绑定：回调透传 `state`，绑定改用后端签发的 `bindTicket`；绑定失败展示后端文案
- 登录页守卫：已登录用户访问 `/login` 改为重定向首页，不再被 `afterEach` 无条件登出并重置路由
- 修改密码：提交前先跑表单校验，规则与后端强口令（8-20 位、大小写、数字、特殊字符）同口径；补齐 `passwordFormRef`
- WebSocket：子协议握手失败只对**本次连接**降级为 `?token=`，后续重连仍优先子协议，token 不会永久落入 URL / 代理日志
- `useForm` 提交锁：校验阶段即占用 `isSaving`，并发点击不会重复提交，`finally` 统一复位
- 字典 / 角色保存：名称失焦的「异步回填编码」存在竞态——用户已经手输了编码/角色字符，但回填请求晚返回时会**无条件覆盖**用户输入（浏览器实测：偶发提交被后端「编码已存在」拒绝）。回填前二次确认目标字段仍为空
- 字典 / 角色「生成代号」请求参数名与后端对齐：接口方法改为 `createDictCode(dictName)`（调用方传的本来就是名称，旧代码把值挂在 `roleName` 键上，后端形参却是 `roleName` → 字典侧恒 NPE 500）
- 代码生成器：选中模块时自动推导包名（去 `jffast-` 前缀）——只覆盖「上一次自动推导的值」，用户手输过的包名保持不变；包名留空会生成非法包名 `cn.jfspeed..`
- 登录验证码：用户名失焦时提前检查是否需要验证码（配套后端免登录白名单补 `/sys/needCaptcha`）
- 路由权限：`system.ts` 补全 `oauth2-client` / `monitor` / `cache` 三条路由缺失的 `perm` 权限标识
- WebSocket：token 默认改走握手子协议传递（`resolveWebSocketUrl` 不再默认拼 query，避免网关日志泄露 token）
- 恢复 `vue/no-v-html: error` 规则（唯一受信静态文案块级豁免）
- 路由权限（冷加载绕过）：`src/permission.ts` 的动态路由分支里，「刷新 / 直接打开某个页面」这条路径只要路径和 `redirect` 一致就直接 `next()`，**没有过页面级 `meta.perm` 门控**，而「先点菜单再跳转」的热路径是过的——同一页面两种进出的权限结果不同，未授权用户刷新一次 URL 即可进入。现两条路径统一走同一个 `isDeniedByPerm()`；冷加载判定用 `router.resolve()` 而非 `to.meta`（动态路由此刻刚 `addRoute`，`to.meta` 是解析前的旧值）
- 导出下载：后端业务失败时返回的是 HTTP 200 + `R` JSON，而前端按 `responseType: 'blob'` 取响应，于是把「错误 JSON」原样存成 `.xlsx` —— 打开是乱码、界面无任何提示。现在 blob 分支先嗅探 `type`（仅 `json` / `text` 才尝试解析），解出 `code`/`msg` 就走统一错误提示且不落盘；HTTP 错误分支同样先解 Blob 体再取 `message`（此前 `error.response.data.message` 恒为 `undefined`）
- `http.download` 曾有两份逐字实现（`shared/src/utils/request.ts` 与 `shared/src/api/core/crud.js`），修一处漏一处；现 `crud.js` 直接复用同一份导出
- 多租户路由过滤 `filterProRoutes` 是死代码：判断写的是**精确等于** `'tenant'`，而菜单数据里的 path 是 `xxxTenantConfig` / `xxxSystemTenant` / `tenant-config` 这类形态，永远匹配不上 ⇒ 关掉多租户开关后多租户专有菜单仍然全部可见。现按「去前导斜杠 + 小写」归一化后比对白名单集合；注意**不能**放宽成「包含 tenant」，本仓自带的示例菜单会被一起删掉
- `.env.test`（测试模式）补齐 `VITE_ENABLE_MULTI_TENANT` / `VITE_USE_STATIC_ROUTES`：此前测试构建读不到开关会静默走默认值，表现为「测试包里租户菜单不见了」，与代码无关，极难归因
- dashboard 文案显示成原始 i18n 键（开源前复审批）：`dashboardBase` 下有两个同名的 `chart` 块，`JSON.parse` 静默保留后者 ⇒ 面板取键取到空对象。删掉零消费的那一块
- 代码生成器「下载成功」提示显示成原始键名：`codegen/index.vue` 引用 `pages.system.codegen.message.downloadZipSuccess`，而该键写在 `codegen.tablePanel.message` 下（命名空间错位），`MessagePlugin` 直接把键名当文案弹出。键移到被引用的路径
- 接口失败静默：`system/user/index.vue`（5 处）、`demo/demoExample/index.vue`（3 处）与 `shared/src/store/modules/user.ts`（动态 import 1 处）只写 `.then()` 不写 `.catch()` ⇒ 后端 5xx 时页面既不提示也可能卡在加载态。补齐 catch（与既有页面「注释说明 + 统一错误提示」的写法一致）
- 菜单表单补「备注」：`sys_menu` 有 `remark` 列、`SysMenu` 实体也有该字段，但编辑弹窗没有输入项，表单模型里的 `remark` 只是回填后原样提交 ⇒ 备注只能靠改 SQL 维护
- 站外死链与失效上报渠道（开源前复审批）：README / 登录页与布局的「帮助」按钮 / issue 表单模板 / PR 模板 / `shared/package.json` 引用的组织名与 `jffast.cc` 文档站域名当时都不可达 ⇒ 改为统一指向 GitHub 仓库与本仓 `docs/`；跨仓文档链接的 `/blob/main/` 改为 `/blob/master/`（后端默认分支是 `master`，原链接即使建仓也是 404）
- 新增 `shared/src/locales/locale-contract.test.ts`：① 同层重复键检测（必须按源文件原文逐行扫描——`JSON.parse` 对重复键静默保留最后一个，用解析结果自检永远看不出问题）② zh / en 叶子键集合一致 ③ 两份文件可解析。该门禁落地即抓到 `pages.login.register` 同时是「注册」文案和一个 25 键的孤儿注册表单文案包（全仓零消费），后者覆盖前者；孤儿包已删
- `LICENSE` 恢复为 Apache-2.0 **官方未修改正文**：此前正文被改写过（§4(b) "those notices" → "any notices"、§9 删去 "or different" 许可选项、APPENDIX 整段删除，10701 字节），与 README / NOTICE 声称的 Apache-2.0 不一致；改写版许可证不受 OSI 承认，等于「声称 Apache-2.0 实际不是」。现与官方文本逐字节一致（11357 字节，含首行多余空行也一并去掉；用本机 `node_modules` 内 6 份独立 Apache-2.0 副本 `cmp` 交叉核对）
- `.husky/pre-commit` 与 `.husky/commit-msg` 补执行位（100755）：Windows 上钩子照常运行，Linux / macOS 克隆后没有可执行位会**静默不触发**，提交规范门禁等于形同虚设

## [1.0.0] — 2026-09-07

首个公开版本。

### 新增

**技术栈**

- Vue 3.5 + TypeScript + Vite 6
- TDesign 组件库 + Pinia 状态管理 + Vue Router 4

**工程能力**

- Monorepo 结构：`shared/` 作为 `@jfspeed/shared` 公共包与 `src/` 应用代码分离
- `createCrud` 三件套：一个 API 定义 + 一个列表页 + 一个表单页完成 CRUD
- `http` 请求封装：统一响应拦截、Token 注入、登录失效跳回原页面、blob 下载放行
- 动态路由（后端下发）+ 静态路由开关 `VITE_USE_STATIC_ROUTES`
- 开发代理与多环境变量配置（`.env` / `.env.development` / `.env.production`）

**业务页面**

- 登录页：图形验证码、记住我、RSA 密码加密传输
- 系统管理：用户、角色、菜单、部门、字典、参数、通知、日志、代码生成器（岗位管理未实现）
- 工作流：流程分类、流程定义、流程实例、待办、已办、流程设计器
- 定时任务：任务管理与执行日志
