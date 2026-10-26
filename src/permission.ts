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

import 'nprogress/nprogress.css';

import NProgress from 'nprogress';
import { MessagePlugin } from 'tdesign-vue-next';
import type { RouteRecordRaw } from 'vue-router';

import router from '@/router';
import { getPermissionStore, useUserStore } from '@/store';
import { buildLoginRoute, decodeLoginRedirect } from '@/utils/login-redirect';
import { hasPermission } from '@/utils/permission';
import { notifySessionExpired } from '@/utils/request';

NProgress.configure({ showSpinner: false });

let routesInitialized = false;
let retryCount = 0;
const MAX_RETRY = 2;

function isCatchAllRoute(route: { matched: Array<{ path: string }> }) {
  return route.matched.some((record) => record.path.includes(':pathMatch') || record.path.includes(':w+'));
}

/**
 * 路由级权限门控（2026-09-24 评审整改）：
 * 各业务模块的路由是**静态注册**的（router/index.ts 用 import.meta.glob 收集全部 modules），
 * 而守卫原先只判"路由是否存在" ⇒ 只要知道 URL 就能直达页面（菜单只控显隐）。
 * 现在：路由声明了 `meta.perm` 就补一次权限校验（未声明的保持原行为，避免影响存量路由）。
 */
function isDeniedByPerm(route: { meta?: Record<PropertyKey, unknown> }) {
  const required = route.meta?.perm as string | string[] | undefined;
  return required != null && !hasPermission(required);
}

router.beforeEach(async (to, from, next) => {
  NProgress.start();

  const permissionStore = getPermissionStore();
  const { whiteListRouters } = permissionStore;
  const userStore = useUserStore();

  if (userStore.token) {
    if (to.path === '/login') {
      // 已登录访问登录页：回首页，不能把现有会话登出（旧实现 afterEach 会无条件 logout）
      next({ path: '/', replace: true });
      return;
    }
    try {
      if (!routesInitialized) {
        routesInitialized = true;
        retryCount = 0;
        const routeList = await permissionStore.buildAsyncRoutes();
        routeList.forEach((item: RouteRecordRaw) => {
          router.addRoute(item);
        });

        if (isCatchAllRoute(to)) {
          next({ path: to.fullPath, replace: true, query: to.query });
          return;
        }

        const redirect = from.query.redirect ? decodeLoginRedirect(from.query.redirect, to.path) : to.path;
        if (to.path === redirect) {
          // 冷加载直连目标页时也必须过 perm 门控：走 warm 分支的校验是在**下一次**导航才发生，
          // 而这里原本直接 `next()` ⇒ 刷新页面可绕过权限（点击跳转会被拦，刷新不会，极难复现）。
          // 用 resolve 而非 to.meta：动态路由刚 addRoute，`to` 是 addRoute 之前解析的。
          if (isDeniedByPerm(router.resolve({ path: to.path }))) {
            next({ path: '/result/404', replace: true });
            return;
          }
          next();
        } else {
          next({ path: redirect, replace: true, query: to.query });
        }
        return;
      }

      if (isCatchAllRoute(to)) {
        if (retryCount < MAX_RETRY) {
          retryCount++;
          const resolved = router.resolve({ path: to.path });
          if (resolved.name !== to.name) {
            next({ path: to.fullPath, replace: true, query: to.query });
            return;
          }
        }
        next();
        return;
      }

      retryCount = 0;
      if (to.name != null && router.hasRoute(to.name)) {
        if (isDeniedByPerm(to)) {
          // 与"未注册路由"保持一致的落点：明确落到 404 页，问题可见，且不会形成重定向递归
          next({ path: '/result/404', replace: true });
          return;
        }
        next();
      } else if (to.path === '/result/404') {
        // 已经落到 404 页仍匹配不上：直接放行，避免任何形式的递归。
        next();
      } else {
        // 目标路由未注册（菜单缺失 / 组件解析失败 / 动态路由构建异常）。
        //
        // ⚠️ 这里**不要**用 `next('/')` 兜底：当首页同样未注册时，守卫会反复把导航重定向到 '/'，
        // 形成 pushWithRedirect 无限递归 → `RangeError: Maximum call stack size exceeded`，
        // 表现为**页面整片空白**且控制台只有一行 Vue Router warn，极难定位。
        // 2026-09-22 实测：工作流两个菜单缺失（菜单 ID 段冲突被 INSERT IGNORE 静默丢弃）时，
        // 访问 /flow/flowCategory 就是这种空白页。改为明确落到 404 页，让问题可见。
        next({ path: '/result/404', replace: true });
      }
    } catch (error) {
      routesInitialized = false;
      userStore.logout();
      // 401 的提示统一由 notifySessionExpired 出（去重），避免与响应拦截器弹两条一样的 toast
      if ((error as { sessionExpired?: boolean })?.sessionExpired) {
        notifySessionExpired();
      } else {
        MessagePlugin.error((error as Error)?.message || '获取用户信息失败');
      }
      next(buildLoginRoute(to.fullPath));
      NProgress.done();
    }
  } else {
    routesInitialized = false;
    if (whiteListRouters.includes(to.path)) {
      next();
    } else {
      next(buildLoginRoute(to.fullPath));
    }
    NProgress.done();
  }
});

router.afterEach((to) => {
  if (to.path === '/login') {
    const userStore = useUserStore();
    // 只有确实未登录时才清理路由与登录态；已登录用户被 beforeEach 重定向，不会走到这里
    if (!userStore.token) {
      const permissionStore = getPermissionStore();

      routesInitialized = false;
      retryCount = 0;
      userStore.logout();
      permissionStore.restoreRoutes();
    }
  }
  NProgress.done();
});
