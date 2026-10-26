# jffast-ui Dockerfile（Base 前端）
# 多阶段构建：Node 编译 dist → nginx 托管静态资源并反代后端
#
# 构建上下文必须是 jffast-ui/ 仓库根目录：
#   shared/ 是 workspace 子包（@jfspeed/shared），不一起拷进去会解析不到依赖。
#
# 构建（RSA 公钥必填，见下）：
#   cd jffast-ui
#   docker build --build-arg VITE_RSA_PUBLIC_KEY="$(cat .env.release.local | grep VITE_RSA_PUBLIC_KEY | cut -d= -f2- | tr -d ' ')" \
#     -t jffast-web:latest .
#
# 运行：
#   docker run -d --name jffast-web -p 7201:80 \
#     -e BACKEND_UPSTREAM=http://<后端地址>:7200 \
#     jffast-web:latest
#
# ⚠️ VITE_* 是**构建期烘焙**的：`import.meta.env` 在 build 时就被静态替换进产物，
#    容器启动后再改环境变量不会生效，改配置必须重新 build 镜像。
#    但 VITE_API_URL 默认是同源相对路径 /jffast-api，只要反代前缀不变，
#    同一个镜像可以直接部署到任意域名，无需重建。
#
# ⚠️ BACKEND_UPSTREAM / API_PREFIX 是**运行时**变量（nginx 启动渲染），
#    所以同一个镜像在 compose 与 K8s 里都能用，只换 env 即可。

# ─── Stage 1: Node 构建 ───
FROM node:24-alpine AS builder
WORKDIR /build

# 先装依赖再拷源码：源码变动时复用这一层缓存
COPY package.json package-lock.json ./
COPY shared/package.json shared/
RUN npm ci

COPY . .

# 构建期变量。VITE_API_URL 默认 /jffast-api（同源相对路径），
# 与后端 server.servlet.context-path=/${app.name}-api 对应
ARG VITE_API_URL=/jffast-api
ARG VITE_BASE_URL=/
ARG VITE_ENABLE_MULTI_TENANT=false
ARG VITE_RSA_PUBLIC_KEY=""
# 注意：不要在这里透传 VITE_APP_TITLE —— ARG 默认空串经 ENV 传入后会覆盖
# .env 文件里的标题（loadEnv 中 process.env 优先）。需要改标题直接改入库的 .env。

# Vite 的 loadEnv 会合并 process.env 里带 VITE_ 前缀的变量（且优先于 .env 文件），
# 所以这里用 ENV 透传 ARG 即可生效 —— CI 里的注入方式与此一致。
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_BASE_URL=${VITE_BASE_URL} \
    VITE_ENABLE_MULTI_TENANT=${VITE_ENABLE_MULTI_TENANT} \
    VITE_RSA_PUBLIC_KEY=${VITE_RSA_PUBLIC_KEY}

# 在 Docker 层就拦住，而不是等 vite 抛错：
# 公钥缺失的产物会在登录时退化成明文密码，等于没有任何登录保护
RUN if [ -z "${VITE_RSA_PUBLIC_KEY}" ]; then \
      echo '[FATAL] --build-arg VITE_RSA_PUBLIC_KEY is required.' >&2; \
      echo '        生成方式见 jffast/deploy/gen-rsa.sh（后端私钥必须与它成对）' >&2; \
      exit 1; \
    fi

RUN npm run build

# ─── Stage 2: nginx 托管 ───
FROM nginx:1.27-alpine

# WebSocket 升级头的 map 必须定义在 http 上下文，而渲染后的 server 块在 conf.d 里；
# 用 00- 前缀保证它先于 default.conf 被 include（nginx 按文件名顺序加载 conf.d）。
COPY docker/nginx-ws-map.conf /etc/nginx/conf.d/00-ws-map.conf

# nginx 官方镜像会把 /etc/nginx/templates/*.template 用 envsubst 渲染到
# /etc/nginx/conf.d/ 下同名文件，因此无需自定义 entrypoint。
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=builder /build/dist /usr/share/nginx/html

# 运行时变量：同一个镜像适配不同编排，按环境改这三个即可。
#   BACKEND_UPSTREAM
#     compose：默认 http://backend:7200（compose 服务名）
#     K8s    ：http://<service>.<ns>.svc.cluster.local:7200
#     自有 nginx：http://<后端地址>:7200
#   RESOLVER：上游主机名由 nginx 运行时解析，需要指定 DNS
#     Docker：127.0.0.11（内嵌 DNS，自定义网络下可用）
#     K8s   ：集群 DNS，例如 10.96.0.10（见 pod 内 /etc/resolv.conf）
ENV BACKEND_UPSTREAM=http://backend:7200 \
    API_PREFIX=/jffast-api \
    RESOLVER=127.0.0.11

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
