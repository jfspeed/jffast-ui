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
 * 登录跳转 `redirect` 参数的**唯一**读写入口。
 *
 * 2026-09-29 缺陷修复（`test_logout_session_401` 第 7 步：重新登录回不到原页面）：
 * `redirect` 此前散落在 6 处各自 `encodeURIComponent` / `decodeURIComponent`，
 * 其中 401 处理取的是 `router.currentRoute.fullPath` —— 冷启动时首次导航尚未完成，
 * 该值还是 Vue Router 的 START location（`/`），于是 `redirect` 被覆盖成 `/`，
 * 重新登录只能落到首页；覆盖与写入的时序不同，结果还时好时坏。
 *
 * 约定：编码、解码、白名单校验、构造「去登录页」location 全部收敛在本文件，
 * 调用方只允许调用这里的函数，禁止自行拼 `encodeURIComponent` / `decodeURIComponent`。
 */

/** 登录页路径 */
export const LOGIN_PATH = '/login';

/** 没有回跳地址时的兜底落点（与 `/` 的静态重定向语义一致） */
export const DEFAULT_LOGIN_REDIRECT = '/dashboard';

/**
 * 只放行站内绝对路径：挡空值、`//evil.com`、`http(s)://…`，
 * 以及登录页自身（防止「跳登录页 → 又带 redirect 指回登录页」的自环）。
 */
function sanitizePath(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return undefined;
  if (value === LOGIN_PATH || value.startsWith(`${LOGIN_PATH}?`) || value.startsWith(`${LOGIN_PATH}/`)) {
    return undefined;
  }
  return value;
}

/**
 * 写：把目标路径编码成 `redirect` 的 query 值。
 * 目标可能带查询串（`fullPath` 里有 `&` / `=`），必须整体编码，
 * 否则 vue-router 的 query 序列化会把它们当作分隔符拆开。
 * 非法目标返回 `undefined` ⇒ 调用方不带 `redirect`。
 */
export function encodeLoginRedirect(fullPath: unknown): string | undefined {
  const target = sanitizePath(fullPath);
  return target === undefined ? undefined : encodeURIComponent(target);
}

/**
 * 读：解码 + 白名单校验；缺失或非法一律回落 `fallback`（不会跳到站外或登录页自环）。
 * 与 `encodeLoginRedirect` 成对：写入编码一次，读取解码一次。
 */
export function decodeLoginRedirect(value: unknown, fallback: string = DEFAULT_LOGIN_REDIRECT): string {
  let decoded: unknown = value;
  if (typeof value === 'string') {
    try {
      decoded = decodeURIComponent(value);
    } catch {
      decoded = value;
    }
  }
  return sanitizePath(decoded) ?? fallback;
}

/**
 * 构造「去登录页」的路由 location（唯一入口，编码在内部完成）。
 * 没有合法回跳目标时返回不带 query 的登录页。
 */
export function buildLoginRoute(fullPath?: unknown): { path: string; query?: Record<string, string> } {
  const redirect = encodeLoginRedirect(fullPath);
  return redirect === undefined ? { path: LOGIN_PATH } : { path: LOGIN_PATH, query: { redirect } };
}

/**
 * 401 / 登出时决定「回跳地址取自哪里」：
 * ① 路由已完成首次导航且不在登录页 ⇒ 用当前路由（最准确）；
 * ② 否则（冷启动：`currentRoute` 还是 START location `/`；或已被并发导航切到登录页）
 *    ⇒ 退回浏览器地址栏 —— 它从页面加载起就是用户真正打开的地址。
 * 两者都不合法时返回 `undefined`（不带 redirect 登录）。
 */
export function resolveLoginRedirectTarget(
  current?: { fullPath?: string; path?: string; matched?: readonly unknown[] } | null,
): string | undefined {
  if (current && current.matched && current.matched.length > 0) {
    const target = sanitizePath(current.fullPath ?? current.path);
    if (target !== undefined) return target;
  }
  if (typeof window === 'undefined') return undefined;
  return sanitizePath(`${window.location.pathname}${window.location.search}`);
}
