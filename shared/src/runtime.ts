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

import type { Router, RouteRecordRaw } from 'vue-router';

import type { UserInfo } from '@/types/interface';

/**
 * shared 运行时依赖注入：shared 不得静态 import 应用侧的 router / 业务 API。
 * 由 createBaseApp（src/create-app.ts）在应用启动时调用 setAppRuntime 注入。
 */

/** 统一响应结构：共享层只关心 code 与 data */
export interface ApiResult<T = unknown> {
  code?: number;
  message?: string;
  data?: T;
}

/** 后端 getUserInfo 返回的数据体（构建动态路由所需） */
export interface AuthRouteData {
  permissions?: string[];
  user?: Partial<UserInfo>;
  /** 后端下发的菜单路由树（结构由应用侧 transformObjectToRoute 消费） */
  menuRoutes?: unknown;
  tenantId?: number | string;
}

/** 共享层用到的应用侧鉴权 API 片段（真实实现由 createBaseApp 注入） */
export interface AuthApi {
  auth: {
    getUserInfo: () => Promise<ApiResult<AuthRouteData>>;
    logout: () => Promise<unknown>;
  };
}

/** 站内通知项：后端 UserNotificationVO / SysNotification / WS payload 的公共字段 */
export interface NotificationPayload {
  id?: number | string;
  title?: string;
  content?: string;
  type?: string;
  level?: string;
  isRead?: number;
  sendTime?: string;
  createTime?: string;
  sender?: string;
  [key: string]: unknown;
}

/** 共享层用到的应用侧系统 API 片段（真实实现由 createBaseApp 注入） */
export interface SystemApi {
  notification: {
    userNotifications: () => Promise<ApiResult<NotificationPayload[]>>;
    unreadCount: () => Promise<ApiResult<number>>;
    markAsRead: (id: number | string) => Promise<unknown>;
    markAllAsRead: () => Promise<unknown>;
  };
  dept: {
    deptUserTree: () => Promise<ApiResult<unknown[]>>;
  };
}

export interface AppRuntime {
  router: Router;
  fixedRouterList: RouteRecordRaw[];
  homepageRouterList: RouteRecordRaw[];
  authApi: AuthApi;
  systemApi: SystemApi;
}

let runtime: Partial<AppRuntime> = {};

export function setAppRuntime(partial: Partial<AppRuntime>): void {
  runtime = { ...runtime, ...partial };
}

function missing(name: keyof AppRuntime): never {
  throw new Error(`[jffast] shared runtime 缺少依赖 "${name}"，请在 createBaseApp 中调用 setAppRuntime 注入`);
}

export function requireRouter(): Router {
  return runtime.router ?? missing('router');
}

export function getFixedRouterList(): RouteRecordRaw[] {
  return runtime.fixedRouterList ?? missing('fixedRouterList');
}

export function getHomepageRouterList(): RouteRecordRaw[] {
  return runtime.homepageRouterList ?? missing('homepageRouterList');
}

export function getAuthApi(): AuthApi {
  return runtime.authApi ?? missing('authApi');
}

export function getSystemApi(): SystemApi {
  return runtime.systemApi ?? missing('systemApi');
}

/** 与 src/router 的 getActive 同语义：截取前 maxLevel 段路径 */
export function getActive(maxLevel = 3): string {
  const route = requireRouter().currentRoute.value;
  if (!route.path) return '';
  return route.path
    .split('/')
    .filter((_item: string, index: number) => index <= maxLevel && index > 0)
    .map((item: string) => `/${item}`)
    .join('');
}
