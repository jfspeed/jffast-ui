#!/usr/bin/env bash
#
# deploy/init.sh —— 生成/体检 deploy/.env（前端栈），并打印一份「起手清单」
#
# 本仓与后端仓（jffast）分别发布、各自自足；两栈通过外部网络 jffast-net 互通。
# 本脚本只准备**前端栈**的 .env。
#
# 做什么：
#   1. 从 deploy/.env.example 复制出 deploy/.env（已存在则只补缺，不覆盖）
#   2. 校验/补齐 VITE_RSA_PUBLIC_KEY —— 必须与后端私钥**同一对**（不成对 =
#      服务能启动但登录必失败）。公钥来源优先级：
#        a) .env 里已填 → 沿用
#        b) 同一台机上并列 clone 的后端仓 → 自动读取
#        c) 都没有 → 报错并给指引（公钥**不能**在本仓凭空生成）
#   3. 用 docker compose config 验证生成的 .env 真能被编排接受
#   4. 打印访问地址与启动命令
#
# 用法：
#   bash deploy/init.sh                      # 常规：生成或补齐 deploy/.env
#   bash deploy/init.sh --force              # 从样例重建（旧文件备份 .env.bak.<时间戳>；
#                                            #  公钥仍按上面的优先级重新获取，不会凭空造）
#   ENV_FILE=/tmp/x bash deploy/init.sh      # 写到别处（自检/CI 用）
#
# ── 复用说明（换环境时通常无需改本文件）──
# 仓库专属的两处都是**探测/通配**取值的，改 .env 即可，不必改脚本：
#   · 共享网络名   ：读 .env 里任意 *_NETWORK 键
#   · 后端仓位置   ：默认同级 jffast；找不到时自动探测同级含 RSA_PRIVATE_KEY 样例的仓；
#                    也可用 SIBLING_BE_REPO=xxx bash deploy/init.sh 指定
#
# ⚠️ 本文件不做任何「生成密钥」的事 —— 前端只有公钥，且必须来自后端那对。
#    新部署的正确顺序：先在后端仓跑 deploy/init.sh，再来跑本脚本（同机时公钥自动取到）。

set -euo pipefail

usage() {
  sed -n '3,34p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
example_file="$root_dir/deploy/.env.example"
env_file="${ENV_FILE:-$root_dir/deploy/.env}"
compose_file="$root_dir/deploy/docker-compose.yml"
force=0

case "${1:-}" in
  --force) force=1 ;;
  -h|--help) usage; exit 0 ;;
  "") ;;
  *) echo "[FATAL] 未知参数：$1（可用：--force / --help）" >&2; exit 1 ;;
esac

[ -f "$example_file" ] || { echo "[FATAL] 找不到样例文件 $example_file" >&2; exit 1; }

# 读/写指定 .env 的某个键（不做变量插值；写用整行重建，避免 sed 分隔符被 base64
# 的 / 吃掉；读剥离行尾 \r —— Windows 检出常带 CRLF，不剥会把 \r 拼进公钥值写坏它）
get_kv_from() {
  awk -v k="$2=" 'index($0, k) == 1 { v = substr($0, length(k) + 1); sub(/\r$/, "", v); print v; exit }' "$1"
}
set_kv_into() {
  local file="$1" key="$2" val="$3" tmp
  tmp="$(mktemp)"
  awk -v k="$key=" -v v="$val" '
    index($0, k) == 1 { print k v; seen = 1; next }
    { print }
    END { if (!seen) print k v }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}
get_kv() { get_kv_from "$env_file" "$1"; }
set_kv() { set_kv_into "$env_file" "$1" "$2"; }

action=""
if [ ! -f "$env_file" ]; then
  # 复制的同时规范化换行（Windows 检出的 example 是 CRLF，原样带入会让
  # 读到的公钥尾带 \r，build-arg 注入后前端产物里的公钥就是坏的）
  tr -d '\r' < "$example_file" > "$env_file"
  action="已生成"
elif [ "$force" = "1" ]; then
  backup="$env_file.bak.$(date '+%Y%m%d%H%M%S')"
  cp "$env_file" "$backup"
  tr -d '\r' < "$example_file" > "$env_file"
  action="已重新生成（旧文件备份到 $(basename "$backup")）"
else
  tr -d '\r' < "$env_file" > "$env_file.tmp" && mv "$env_file.tmp" "$env_file"
  action="已存在，只补缺失项（要全部重来加 --force）"
fi

# ── VITE_RSA_PUBLIC_KEY：必须来自后端那对，绝不凭空生成 ──
be_repo="${SIBLING_BE_REPO:-jffast}"
be_env_file=""
be_dir=""

# 三种布局都要能命中（仓内子目录 / 同级 / 跨一级），见后端 init.sh 同名注释
find_sibling_deploy() {
  local marker="$1" d cand
  for d in "$root_dir" "$(dirname "$root_dir")" "$(dirname "$(dirname "$root_dir")")"; do
    for cand in "$d"/*/deploy; do
      [ -f "$cand/.env.example" ] || continue
      grep -q "$marker" "$cand/.env.example" || continue
      printf '%s' "$cand"
      return 0
    done
  done
  return 1
}

for d in "$root_dir" "$(dirname "$root_dir")" "$(dirname "$(dirname "$root_dir")")"; do
  if [ -d "$d/$be_repo/deploy" ]; then be_dir="$d/$be_repo/deploy"; break; fi
done
if [ -z "$be_dir" ]; then
  be_dir="$(find_sibling_deploy '^RSA_PRIVATE_KEY=' || true)"
  if [ -n "$be_dir" ]; then be_repo="$(basename "$(dirname "$be_dir")")"; fi
fi
be_env_file="$be_dir/.env"
pub="$(get_kv VITE_RSA_PUBLIC_KEY)"
if [ -n "$pub" ]; then
  rsa_state="沿用 .env 里已填的公钥"
elif [ -f "$be_env_file" ]; then
  pub="$(get_kv_from "$be_env_file" RSA_PUBLIC_KEY)"
  if [ -n "$pub" ]; then
    set_kv VITE_RSA_PUBLIC_KEY "$pub"
    rsa_state="已自动从 $be_repo/deploy/.env 读取（同一对）"
  else
    echo "[FATAL] 后端仓的 deploy/.env 存在但 RSA_PUBLIC_KEY 为空 —— 先在后端仓跑 bash deploy/init.sh，再来跑本脚本。" >&2
    exit 1
  fi
else
  echo "[FATAL] VITE_RSA_PUBLIC_KEY 未填，且本机没有并列的后端仓可读。" >&2
  echo "        前端公钥必须与后端私钥同一对（不成对 = 服务能启动但登录必失败），不能在本仓凭空生成。" >&2
  echo "        二选一：" >&2
  echo "          1) 在后端仓跑 bash deploy/init.sh，然后把它的 deploy/.env 里 RSA_PUBLIC_KEY" >&2
  echo "             的值填进本文件（$env_file）的 VITE_RSA_PUBLIC_KEY" >&2
  echo "          2) 两仓 clone 到同一台机的同一目录层级下（并列），再重跑本脚本（自动读取）" >&2
  exit 1
fi
chmod 600 "$env_file" 2>/dev/null || true

# ── 端口（想改就 export 后重跑）──
if [ -n "${WEB_HOST_PORT:-}" ]; then set_kv WEB_HOST_PORT "$WEB_HOST_PORT"; fi

# ── 编排接受性自检 ──
compose_check="跳过（本机没有可用的 docker 守护进程）"
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  if docker compose -f "$compose_file" --env-file "$env_file" config --quiet 2>/dev/null; then
    compose_check="通过（编排里所有必填项都已填上）"
  else
    err="$(docker compose -f "$compose_file" --env-file "$env_file" config 2>&1 | tail -3)"
    echo "[FATAL] docker compose config 校验失败：$err" >&2
    exit 1
  fi
fi

# ── 起手清单 ──
net_name="$(awk -F= '/_NETWORK=/{v=$2; sub(/\r$/,"",v); print v; exit}' "$env_file")"
[ -n "$net_name" ] || net_name="jffast-net"
web_port="$(get_kv WEB_HOST_PORT)"; [ -n "$web_port" ] || web_port=7201
api_prefix="$(get_kv API_PREFIX)"; [ -n "$api_prefix" ] || api_prefix=/jffast-api
base_url="$(get_kv VITE_BASE_URL)"; [ -n "$base_url" ] || base_url=/
upstream="$(get_kv BACKEND_UPSTREAM)"; [ -n "$upstream" ] || upstream="http://backend:7200"
lan_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"; [ -n "$lan_ip" ] || lan_ip="127.0.0.1"
project="$(awk '$1=="name:"{v=$2; sub(/\r$/,"",v); print v; exit}' "$compose_file")"
[ -n "$project" ] || project="$(basename "$(dirname "$compose_file")")"

echo
echo "══════════════════════════════════════════════════════════════"
echo " $env_file —— $action"
echo "   RSA 公钥：$rsa_state"
echo "   compose 校验：$compose_check"
echo "══════════════════════════════════════════════════════════════"
echo "【前提】后端栈要先起来（${be_repo} 仓：bash deploy/init.sh 后 compose up），"
echo "        且已执行 docker network create $net_name（只需一次）。"
echo
echo "【启动】执行后就起来了（首次会在服务器上编译前端镜像，约 3~5 分钟）"
echo "  docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build"
echo
echo "【访问】"
printf '  页面          http://%s:%s%s      （浏览器打开这个）\n' "$lan_ip" "$web_port" "$base_url"
printf '  对外 API      http://%s:%s%s\n' "$lan_ip" "$web_port" "$api_prefix"
printf '  反代目标      %s\n' "$upstream"
echo
echo "【提醒】"
echo  "  VITE_BASE_URL / VITE_API_URL 是**构建期烘焙**的：改子路径前缀要 --force 重建镜像，"
echo  "  只改反代目标（BACKEND_UPSTREAM）运行时改 env 即可。"
echo  "  项目名（命名卷前缀）：$project"
echo
echo "【升级】git pull && docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build"
echo "══════════════════════════════════════════════════════════════"
