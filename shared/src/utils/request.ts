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

import type { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';
import { MessagePlugin } from 'tdesign-vue-next';

import { requireRouter } from '@/runtime';
import { buildLoginRoute, LOGIN_PATH, resolveLoginRedirectTarget } from '@/utils/login-redirect';

/**
 * 后端统一响应结构 {@code R<T>} 的前端映射。
 * 拦截器已保证：resolve 的必定是业务 code === 200 的响应，其余走 reject。
 */
export interface ApiResult<T = unknown> {
  /** 业务码，200 表示成功 */
  code: number;
  /** 业务数据 */
  data?: T;
  /** 提示信息（成功时可能为空） */
  message?: string;
  /** 链路追踪 ID（jffast.web.trace-id.enabled=true 时返回） */
  traceId?: string;
  [key: string]: unknown;
}

/**
 * 请求方法集合。
 * 与裸 axios 实例不同，这里的方法返回的是**拦截器解析后的业务结果**（ApiResult），
 * 调用方无需再剥一层 response.data。
 */
export interface Http {
  get: <T = unknown>(
    url: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig,
  ) => Promise<ApiResult<T>>;
  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<ApiResult<T>>;
  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<ApiResult<T>>;
  delete: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig) => Promise<ApiResult<T>>;
  upload: <T = unknown>(url: string, formData: FormData, config?: AxiosRequestConfig) => Promise<ApiResult<T>>;
  download: (
    url: string,
    params?: Record<string, unknown>,
    filename?: string,
    config?: AxiosRequestConfig,
  ) => Promise<Blob>;
}

const baseURL =
  import.meta.env.VITE_IS_REQUEST_PROXY === 'true'
    ? import.meta.env.VITE_API_URL || '/jffast-api'
    : import.meta.env.VITE_API_URL || '';

const service: AxiosInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 登录失效提示去重：刷新页面（token 已失效）时，路由守卫和响应拦截器都会走到
// 「登录失效」分支，不加节流就会弹出两条一模一样的 toast。
let sessionExpiredNotifiedAt = 0;

/** 统一的「登录已失效」提示（去重，5s 内只提示一次） */
export function notifySessionExpired() {
  const now = Date.now();
  if (now - sessionExpiredNotifiedAt < 5000) return;
  sessionExpiredNotifiedAt = now;
  MessagePlugin.error('登录已失效，请重新登录');
}

/** 401 处理是否已在执行（单飞）：并发多个 401 只清一次、只跳一次 */
let sessionExpiredHandling = false;

/** 兜底文案：仅在消息为空或疑似技术细节时使用 */
const SYSTEM_ERROR_MESSAGE = '服务器繁忙，请稍后重试';

/**
 * 疑似技术细节（堆栈 / 类名 / SQL 片段等）。命中时一律折叠成通用文案，避免内部信息外泄。
 * 后端兜底异常处理器已把未捕获异常收敛为「系统异常，请联系管理员」等安全文案，
 * 但个别 controller 仍会直接 R.error(e.getMessage())，这里再兜一层。
 */
const TECH_ERROR_RE =
  /Exception|Error|Caused by|\bat\s+[\w.$]+\s*\(|java\.|javax\.|jakarta\.|org\.|com\.|cn\.|SQL|nested exception|空指针|NullPointer|Duplicate entry|Data integrity|Connection refused|Communications link failure|Deadlock|数据库连接/;

/**
 * 把后端返回的错误收敛为可对外展示的文案。
 *
 * <p>后端契约：业务校验失败默认 code=400（`R.error(msg)` / BusinessException），
 * code=500 只表示服务端真故障。但服务端仍可能把异常原文带回（如 SQL / 驱动消息），
 * 且 500 分支需要兜底，因此这里按「消息内容」判定：为空、过长/多行（堆栈）或命中
 * 技术指纹时折叠成通用文案；其余原文展示。原始消息仍先落控制台，便于排障。
 */
function resolveErrorMessage(res: Partial<ApiResult>): string {
  const raw = (res?.message || '').trim();
  if ((res?.code ?? 0) >= 500) {
    if (raw) {
      console.error('[request] 服务端错误：', res.code, raw);
    }
    if (!raw || raw.length > 200 || raw.includes('\n') || TECH_ERROR_RE.test(raw)) {
      return SYSTEM_ERROR_MESSAGE;
    }
    return raw;
  }
  return raw || '操作失败，请重试';
}

/**
 * 登录失效的统一处理：
 * ① 单飞去重 —— 页面并发发起多个请求同时 401 时，不会反复 replace(路由)；
 * ② 显式清理登录态（清 token / 权限缓存）；WS 的 token 巡检会因此自动断开连接，
 *    不再只依赖 permission.ts 的 afterEach 兜底（若跳转被并发打断，登录态会残留）。
 */
export async function handleSessionExpired() {
  if (sessionExpiredHandling) return;
  sessionExpiredHandling = true;
  try {
    // 动态 import：store 会间接依赖本模块，静态 import 会形成循环初始化
    const { useUserStore } = await import('@/store');
    await useUserStore().logout();
    const router = requireRouter();
    const current = router.currentRoute.value;
    if (current.path !== LOGIN_PATH) {
      // 回跳地址的取值来源与编码统一走 login-redirect：冷启动时 currentRoute 还是
      // START location（`/`），直接用它会把 redirect 覆盖成 `/`，登录后回不到原页面。
      router.replace(buildLoginRoute(resolveLoginRedirectTarget(current)));
    }
  } finally {
    // 给跳转留出时间窗，避免并发 401 在瞬间反复触发
    setTimeout(() => {
      sessionExpiredHandling = false;
    }, 1000);
  }
}

// 请求拦截器
service.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // token 唯一来源就是 localStorage['token']：user store 的 persist 也会把 token
  // 持久化到 localStorage['user']，但那是持久化的副产物，回退去读它会让已失效的
  // token 被重新捡起来继续发请求（登出后尤其明显）。
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.token = token;
  }

  // 多租户支持：如果启用了多租户，自动添加 tenantId
  const enableMultiTenant = import.meta.env.VITE_ENABLE_MULTI_TENANT === 'true';
  if (enableMultiTenant) {
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['X-Tenant-Id'] = tenantId;
    }
  }

  return config;
});

/** blob 的 MIME 是否可能是业务 JSON/文本（xlsx/pdf/zip 等二进制不会命中） */
const TEXTUAL_MIME_RE = /json|text/i;

/**
 * blob 响应里混入的 JSON 业务体（导出失败时后端仍返回 `R`，而非文件流）。
 * 不识别的话，用户会下载到一个内容是 `{"code":500,...}` 的 .xlsx —— 既不报错也打不开。
 * @returns 解析出的业务体；不是 JSON / 无 code 字段时返回 null（说明确实是文件流）
 */
async function parseBlobBusinessBody(blob: Blob): Promise<ApiResult | null> {
  if (!TEXTUAL_MIME_RE.test(blob.type || '')) return null;
  try {
    const res = JSON.parse(await blob.text()) as ApiResult;
    return typeof res?.code === 'number' ? res : null;
  } catch {
    return null;
  }
}

/** 错误响应体：`responseType: 'blob'` 时 axios 给的 data 也是 Blob，按对象取 `message` 恒为 undefined */
async function readErrorBody(data: unknown): Promise<Partial<ApiResult>> {
  if (data instanceof Blob) {
    return (await parseBlobBusinessBody(data)) ?? {};
  }
  return (data as Partial<ApiResult>) || {};
}

// 响应拦截器：把 AxiosResponse 剥成业务结果，失败统一 reject 业务体
service.interceptors.response.use(
  async (response: AxiosResponse<ApiResult>) => {
    // blob 响应（文件下载/导出）直接返回二进制数据，不走业务 code 检查
    if (response.config?.responseType === 'blob') {
      const blob = response.data as unknown as Blob;
      const res = await parseBlobBusinessBody(blob);
      if (!res) {
        return blob as unknown as AxiosResponse;
      }
      // HTTP 200 + 业务失败：与 JSON 分支同一口径处理（静默标记一致生效）
      const silent = response.config?.headers?.['X-Silent-Error'] === 'true';
      if (!silent) {
        MessagePlugin.error(resolveErrorMessage(res));
      }
      return Promise.reject(res);
    }
    const res = response.data;
    if (res.code !== 200) {
      // 调用方显式要求静默时（如登录前探测 RSA 公钥）不弹全局错误，由调用方自行提示
      const silent = response.config?.headers?.['X-Silent-Error'] === 'true';
      if (!silent) {
        MessagePlugin.error(resolveErrorMessage(res));
      }
      return Promise.reject(res);
    }
    // 拦截器已经把 AxiosResponse 换成了业务结果；对外类型通过 Http / ApiResult 描述，
    // 这里用断言只是适配 axios 拦截器的既有签名。
    return res as unknown as AxiosResponse;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const body = await readErrorBody(error.response.data);
      if (status === 404) {
        // 404 由调用方自行处理，不弹全局提示
      } else if (status === 403) {
        MessagePlugin.error(body?.message || '权限不足，无法执行此操作！');
      } else if (status === 500) {
        // 兜底异常处理已把未捕获异常收敛为安全文案（如「系统异常，请联系管理员」）；
        // 走同一套收敛规则，既能展示安全原文，也能避免堆栈 / 内部表名外泄。
        const raw = body?.message;
        if (raw) {
          console.error('[request] HTTP 500 详情：', raw);
        }
        MessagePlugin.error(resolveErrorMessage({ code: 500, message: raw }));
      } else if (status === 401) {
        // 401 只表示「未登录 / 登录已失效」，不代表「无权限」（那是 403）。
        // 早先这里弹的模态框写的是「无权限访问」，语义错位；而且 401 一定伴随跳转登录页，
        // 模态框还要求用户再点一次「确认」才走，纯属多余。现在只提示一次 toast + 直接跳登录页。
        notifySessionExpired();
        handleSessionExpired();
      } else {
        MessagePlugin.error(error.message || `Status:${status}，未知错误！`);
      }
    } else {
      MessagePlugin.error('请求服务器无响应！');
    }
    return Promise.reject(error);
  },
);

export { service as request };
export default service;

/**
 * 常用请求方法集合。
 * 实现上只是给 service 换了个更顺手的参数顺序；返回值已被响应拦截器
 * 换成业务结果，因此这里显式断言为 Promise<ApiResult>。
 */
export const http: Http = {
  get: <T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) =>
    service.get(url, { params, ...config }) as unknown as Promise<ApiResult<T>>,
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    service.post(url, data, config) as unknown as Promise<ApiResult<T>>,
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    service.put(url, data, config) as unknown as Promise<ApiResult<T>>,
  delete: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    service.delete(url, { data, ...config }) as unknown as Promise<ApiResult<T>>,
  upload: <T>(url: string, formData: FormData, config?: AxiosRequestConfig) =>
    service.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...config,
    }) as unknown as Promise<ApiResult<T>>,
  download: (
    url: string,
    params?: Record<string, unknown>,
    filename?: string,
    config?: AxiosRequestConfig,
  ): Promise<Blob> =>
    service
      .get(url, {
        params,
        responseType: 'blob',
        ...config,
      })
      .then((res) => {
        // 拦截器对 blob 响应返回的就是 Blob 本身（业务失败已在拦截器 reject），
        // 不必再 `new Blob([res])` 整份复制一遍文件内容
        const blob = res as unknown as Blob;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        return blob;
      }),
};
