/*
 * Copyright 2024-2026 jffast
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * 站内通知 WebSocket 客户端。
 *
 * 后端为 jffast-starter-web 的 `WebSocketService`：
 * - 握手地址与接口同源：`${VITE_API_URL}/ws`（dev 下由 vite 代理到后端，代理规则需 `ws: true`）
 * - 认证：优先通过**握手子协议** `Sec-WebSocket-Protocol: jffast-token.<token>` 传递，
 *   服务端回显该子协议后浏览器才认定握手成功（不回显时浏览器会直接判失败）；
 *   若子协议方式握手失败（如旧服务端 / 不透明代理剥离响应头），**仅本次连接**降级为 `?token=`（兼容），
 *   之后的重连仍优先尝试子协议，不会永久把 token 放进 URL
 * - 文本帧为 JSON：`{ type: 'notification', data: {...} }`
 * - 心跳：客户端每 25s 发 `ping`（服务端回 `pong`）；**收不到任何帧超过 2.5 个周期即判定连接僵死并重连**
 *
 * 本模块是**单例**：整个应用只维持一条连接，多个组件通过订阅回调共享。
 * ⚠️ 因此**组件卸载时不要调用 `closeNotificationSocket()`**（布局切换 / HMR 都会触发卸载，
 * 那会把全应用的推送静默断开 —— 2026-09-24 评审发现）。连接生命周期只由两件事决定：
 * ① token 变化（登出自动断开、换账号自动重连）；② 显式登出流程。
 */

export interface WsMessage {
  type: string;
  data?: unknown;
  [key: string]: unknown;
}

export type WsMessageHandler = (message: WsMessage) => void;
export type WsStateHandler = (connected: boolean) => void;

/** 心跳间隔：小于常见网关 60s 空闲断连阈值；同时用它做 token 变化的巡检周期 */
const HEARTBEAT_INTERVAL = 25_000;
/** 僵尸连接判定：超过该时长没收到**任何**帧（含 pong）就认为链路已死 */
const STALE_TIMEOUT = HEARTBEAT_INTERVAL * 2.5;
/** 快速重连的最大次数 */
const MAX_RETRY = 6;
/** 重连基础退避（毫秒），实际等待 = BASE * 重试次数，上限 30s */
const RETRY_BASE_DELAY = 3_000;
const RETRY_MAX_DELAY = 30_000;
/** 快速重连用尽后的**慢速兜底重连**间隔：绝不"永久静默"（否则推送会一直缺失且无人知晓） */
const RETRY_SLOW_DELAY = 5 * 60_000;
/** 握手子协议前缀（服务端据此从 `Sec-WebSocket-Protocol` 取 token） */
const TOKEN_SUBPROTOCOL = 'jffast-token.';

/**
 * 降级标记：**只对下一次连接尝试生效**。子协议握手失败后按 query 重试一次，
 * 之后的重连恢复到子协议，避免 token 永久出现在 URL / 代理日志里。
 */
let forceQueryNext = false;

let socket: WebSocket | null = null;
let retryCount = 0;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
/** 主动关闭标记：主动关闭后不再自动重连 */
let manuallyClosed = false;
/** 建连时使用的 token —— 用来发现"换了登录身份但连接还是旧的" */
let connectedToken = '';
/** 本次连接是否成功 open 过（用于判断"子协议握手失败"并降级） */
let openedOnce = false;
/** 最近一次收到任何帧的时间（僵尸连接检测） */
let lastFrameAt = 0;
/** 慢速兜底模式的提示是否已打过（避免每 5 分钟刷一条日志） */
let slowModeNotified = false;

const messageHandlers = new Set<WsMessageHandler>();
const stateHandlers = new Set<WsStateHandler>();

/** 读取登录 token（唯一来源 localStorage['token']，与 shared/utils/request.ts 保持一致） */
function getToken(): string {
  return localStorage.getItem('token') || '';
}

/**
 * 解析 WebSocket 地址。
 *
 * @param withTokenQuery 是否把 token 放到 query 串（仅在降级模式 / 兼容旧服务端时为 true）。
 *   **默认 false**：token 出现在 URL 会被网关/代理访问日志、浏览器历史记录留存，应尽量走子协议。
 */
export function resolveWebSocketUrl(withTokenQuery = false): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const basePath = (import.meta.env.VITE_API_URL as string) || '';
  const wsPath = basePath ? `${basePath}/ws` : '/ws';
  const token = getToken();
  const query = withTokenQuery && token ? `?token=${encodeURIComponent(token)}` : '';
  if (query) {
    console.warn('[ws] 已降级为 query 传 token，token 会出现在 URL 中（可能被代理日志留存），仅作旧服务端兼容');
  }
  return `${protocol}//${window.location.host}${wsPath}${query}`;
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      // 僵尸连接检测：对端已死（半开连接）时 send 不会立刻报错，只能靠"长时间收不到任何帧"判断
      if (lastFrameAt > 0 && Date.now() - lastFrameAt > STALE_TIMEOUT) {
        console.warn('[ws] 连接已僵死（长时间未收到任何帧），强制重连');
        reconnect(false);
        return;
      }
      socket.send('ping');
    }
    // 巡检：登录身份变了（换账号 / 登出）就重建或断开连接
    watchToken();
  }, HEARTBEAT_INTERVAL);
}

function notifyState(connected: boolean) {
  stateHandlers.forEach((handler) => {
    try {
      handler(connected);
    } catch {
      // 单个订阅者异常不影响其它订阅者
    }
  });
}

function dispatch(message: WsMessage) {
  messageHandlers.forEach((handler) => {
    try {
      handler(message);
    } catch {
      // 同上
    }
  });
}

function scheduleReconnect() {
  if (manuallyClosed || !getToken()) {
    return;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  const fast = retryCount < MAX_RETRY;
  if (fast) {
    retryCount += 1;
  } else if (!slowModeNotified) {
    // 不再"6 次之后永久静默"：改为每 RETRY_SLOW_DELAY 兜底重试一次，直到连上或登出
    slowModeNotified = true;
    console.info(`[ws] 快速重连 ${MAX_RETRY} 次仍未成功，转入每 ${RETRY_SLOW_DELAY / 60_000} 分钟的兜底重试`);
  }
  const delay = fast ? Math.min(RETRY_BASE_DELAY * retryCount, RETRY_MAX_DELAY) : RETRY_SLOW_DELAY;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectNotificationSocket();
  }, delay);
}

/** 拆掉当前连接（不触发重连逻辑，供 close / reconnect 复用） */
function teardownSocket() {
  stopHeartbeat();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
    try {
      socket.close();
    } catch {
      // 已经是关闭态，忽略
    }
    socket = null;
  }
}

/**
 * 断开当前连接（可选立刻用新 token 重连）。
 *
 * @param closeOnly true=只断开不再重连（登出）；false=断开后立刻按当前 token 重连（换账号 / 僵死恢复）
 */
function reconnect(closeOnly: boolean) {
  manuallyClosed = true;
  teardownSocket();
  notifyState(false);
  if (closeOnly) {
    return;
  }
  retryCount = 0;
  slowModeNotified = false;
  forceQueryNext = false;
  connectNotificationSocket();
}

/** token 变化巡检：登出则断开，换账号则用新 token 重连 */
function watchToken() {
  const token = getToken();
  if (token === connectedToken) {
    return;
  }
  reconnect(!token);
}

/**
 * 建立（或复用）通知 WebSocket 连接。
 * 已连接/正在连接时直接返回，不会重复建连。
 */
export function connectNotificationSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  const token = getToken();
  if (!token) {
    // 未登录不建连，避免握手必然失败造成的重试噪音
    return;
  }

  manuallyClosed = false;
  connectedToken = token;
  openedOnce = false;
  lastFrameAt = 0;
  const useQuery = forceQueryNext;
  forceQueryNext = false;

  try {
    if (!useQuery) {
      // 子协议方式：token 不出现在 URL（避免被网关/代理日志、浏览器历史记录留存）
      socket = new WebSocket(resolveWebSocketUrl(false), [`${TOKEN_SUBPROTOCOL}${encodeURIComponent(token)}`]);
    } else {
      socket = new WebSocket(resolveWebSocketUrl(true));
    }
  } catch (e) {
    if (!useQuery) {
      console.warn('[ws] 子协议方式建连失败，本次连接降级为 query 传 token 后重试', e);
      forceQueryNext = true;
    }
    socket = null;
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    retryCount = 0;
    slowModeNotified = false;
    openedOnce = true;
    lastFrameAt = Date.now();
    startHeartbeat();
    notifyState(true);
  };

  socket.onmessage = (event) => {
    lastFrameAt = Date.now();
    if (typeof event.data !== 'string' || event.data === 'pong') {
      return;
    }
    try {
      const message = JSON.parse(event.data);
      if (message && typeof message.type === 'string') {
        dispatch(message);
      }
    } catch {
      // 非 JSON 帧忽略
    }
  };

  socket.onerror = () => {
    // onerror 后浏览器必定触发 onclose，重连逻辑统一放在 onclose
    socket?.close();
  };

  socket.onclose = () => {
    stopHeartbeat();
    socket = null;
    notifyState(false);
    if (!openedOnce && !useQuery) {
      // 从未成功握手 ⇒ 很可能是服务端还不支持子协议取 token：仅本次改用 query 重试
      console.warn('[ws] 子协议握手未成功，本次连接降级为 query 传 token 后重试（后续重连仍优先子协议）');
      forceQueryNext = true;
    }
    scheduleReconnect();
  };
}

/** 主动关闭连接并停止重连（**只在显式登出时调用**；组件卸载不要调用，见文件头说明） */
export function closeNotificationSocket() {
  manuallyClosed = true;
  retryCount = 0;
  slowModeNotified = false;
  connectedToken = '';
  reconnect(true);
}

/** 手动重试一次（供"连接已断开"提示上的重试按钮使用） */
export function retryNotificationSocketNow() {
  reconnect(false);
}

/** 订阅业务消息，返回取消订阅函数 */
export function onNotificationMessage(handler: WsMessageHandler): () => void {
  messageHandlers.add(handler);
  return () => messageHandlers.delete(handler);
}

/** 订阅连接状态，返回取消订阅函数 */
export function onNotificationStateChange(handler: WsStateHandler): () => void {
  stateHandlers.add(handler);
  return () => stateHandlers.delete(handler);
}

/** 当前是否已连接 */
export function isNotificationSocketConnected(): boolean {
  return !!socket && socket.readyState === WebSocket.OPEN;
}
