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

import cloneDeep from 'lodash/cloneDeep';
import { defineStore } from 'pinia';
import type { RouteRecordRaw } from 'vue-router';

import { getAuthApi, getFixedRouterList, getHomepageRouterList, requireRouter } from '@/runtime';
import { store, useUserStore } from '@/store';

interface RouteItem {
  name: string;
  path: string;
  component: string;
  redirect?: string;
  meta?: Record<string, unknown>;
  children?: RouteItem[];
}

/**
 * 多租户（商业版）专有菜单的 path 白名单，取值即后端 `sys_menu.path` 的实际形态。
 *
 * 2026-10-14 评审：旧实现是 `['tenant'].includes(route.path)` —— sys_menu 的 path 实际形如
 * `proTenantConfig` / `proSystemTenant`（顶层目录经 `getRouterPath` 还会带前导 `/`），
 * 精确匹配从不命中 ⇒ `VITE_ENABLE_MULTI_TENANT` 开关在路由层形同虚设。
 * 这里也**不能**放宽成「path 含 tenant」：开源版自有的演示菜单 `demoTenantExample`
 * （租户隔离示例）会被一起删掉。
 */
const PRO_ONLY_PATHS = ['tenant', 'protenantconfig', 'prosystemtenant', 'systemtenant', 'tenant-config'];

/** 登录失效错误：打上标记，路由守卫据此只提示一次（拦截器已经提示过同样的话） */
export type SessionExpiredError = Error & { sessionExpired: true };

function sessionExpiredError(): SessionExpiredError {
  const error = new Error('登录已失效，请重新登录') as SessionExpiredError;
  error.sessionExpired = true;
  return error;
}

/** 菜单 path 的前导 `/`（顶层目录由后端 `getRouterPath` 拼上） */
const LEADING_SLASH_RE = /^\/+/;

/** 归一化：去前导 `/`、转小写，使 `/proTenantConfig` 与 `proTenantConfig` 命中同一项 */
function normalizeMenuPath(path: unknown) {
  return typeof path === 'string' ? path.replace(LEADING_SLASH_RE, '').toLowerCase() : '';
}

function isProOnlyPath(path: unknown) {
  return PRO_ONLY_PATHS.includes(normalizeMenuPath(path));
}

function filterProRoutes(routes: RouteItem[]): RouteItem[] {
  return routes
    .filter((route) => !isProOnlyPath(route.path))
    .map((route) => {
      if (route.children) {
        return { ...route, children: route.children.filter((child) => !isProOnlyPath(child.path)) };
      }
      return route;
    })
    .filter((route) => {
      if (route.children && route.children.length === 0) return false;
      return true;
    });
}

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    whiteListRouters: ['/login'],
    routers: [] as RouteRecordRaw[],
    removeRoutes: [] as RouteRecordRaw[],
    asyncRoutes: [] as RouteRecordRaw[],
    useStaticRoutes: import.meta.env.VITE_USE_STATIC_ROUTES === 'true',
  }),
  actions: {
    async initRoutes() {
      const accessedRouters = this.asyncRoutes;
      if (this.useStaticRoutes) {
        this.routers = cloneDeep([...getHomepageRouterList(), ...accessedRouters, ...getFixedRouterList()]);
      } else {
        this.routers = cloneDeep([...accessedRouters]);
      }
    },
    async buildAsyncRoutes() {
      try {
        if (this.useStaticRoutes) {
          this.asyncRoutes = cloneDeep(getFixedRouterList());
          await this.initRoutes();
          return this.asyncRoutes;
        }

        const res = await getAuthApi().auth.getUserInfo();
        if (res && res.code === 200 && res.data) {
          const data = res.data;

          if (data.permissions) {
            localStorage.setItem('user_permissions', JSON.stringify(data.permissions));
          }

          // 回填当前登录用户信息：页面刷新后姓名/头像取自后端，不靠登录页残留
          if (data.user) {
            useUserStore().setUserInfo(data.user);
            useUserStore().getUserInfo();
          }

          if (data.menuRoutes) {
            let asyncRoutes: RouteItem[] = data.menuRoutes as RouteItem[];
            if (import.meta.env.VITE_ENABLE_MULTI_TENANT !== 'true') {
              asyncRoutes = filterProRoutes(asyncRoutes);
            }
            this.asyncRoutes = transformObjectToRoute(asyncRoutes);
          } else {
            this.asyncRoutes = [PAGE_NOT_FOUND_ROUTE];
          }

          if (data.tenantId) {
            localStorage.setItem('tenantId', String(data.tenantId));
          }
        } else {
          if (res && res.code === 401) {
            throw sessionExpiredError();
          }
          this.asyncRoutes = [PAGE_NOT_FOUND_ROUTE];
        }

        await this.initRoutes();
        return this.asyncRoutes;
      } catch (error) {
        this.asyncRoutes = [PAGE_NOT_FOUND_ROUTE];
        await this.initRoutes();
        // 不要把原始错误吞掉换成 "Can't build routes"：路由守卫会把这个 message 直接提示给用户，
        // 登录失效时应当是中文的“登录已失效，请重新登录”，而不是这句英文。
        // HTTP 401 在 axios 响应拦截器里就被 reject 了，走不到上面 res.code === 401 的分支。
        if ((error as { response?: { status?: number } })?.response?.status === 401) {
          throw sessionExpiredError();
        }
        throw error instanceof Error ? error : new Error("Can't build routes");
      }
    },
    async restoreRoutes() {
      const router = requireRouter();
      this.asyncRoutes.forEach((item: RouteRecordRaw) => {
        if (item.name && router.hasRoute(item.name)) {
          router.removeRoute(item.name);
        }
      });
      this.asyncRoutes = [];
      localStorage.removeItem('user_permissions');
      localStorage.removeItem('tenantId');
    },
  },
});

import { transformObjectToRoute } from '@/utils/route';
import { PAGE_NOT_FOUND_ROUTE } from '@/utils/route/constant';

export function getPermissionStore() {
  return usePermissionStore(store);
}
