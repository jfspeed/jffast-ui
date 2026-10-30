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

import isObject from 'lodash/isObject';
import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

import { setupViewsModules } from '@/utils/route';

const viewsModules = import.meta.glob('../pages/**/*.vue');
setupViewsModules(viewsModules as Record<string, () => Promise<Recordable>>, '../pages');

const homepageModules = import.meta.glob('./modules/**/homepage.ts', { eager: true });
const fixedModules = import.meta.glob('./modules/**/!(homepage).ts', { eager: true });

const defaultRouterList: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/login/index.vue'),
  },
  {
    path: '/',
    redirect: '/dashboard/dashboardBase',
  },
  {
    // 旧首页路径（改名前的静态路由）兜底：存量标签页 / 书签 / localStorage 里仍是它，
    // 而菜单生成的路由 path 是驼峰 dashboardBase。无 name ⇒ 不参与同名覆盖。
    path: '/dashboard/base',
    redirect: '/dashboard/dashboardBase',
  },
  {
    // 社交账号授权回调的中转页：OAuth 平台按 `redirect-uri` 回跳到本页，
    // 由本页把 code/state 交回发起绑定的那个同源窗口（兑换授权码仍由后端完成）。
    // 静态注册（不走菜单）⇒ 未登录时也要能打开，见 shared permission store 的 whiteListRouters。
    path: '/social/callback',
    name: 'socialCallback',
    component: () => import('@/pages/social/callback.vue'),
  },
  {
    // 404 落点页必须是**真实路由**：PAGE_NOT_FOUND_ROUTE（/:w+）与守卫多处
    // next({ path: '/result/404' }) 都指向这里。此前它只存在于常量的 redirect 目标里，
    // 从无记录注册 ⇒ /result/404 又被 /:w+ 匹配 ⇒ redirect 回自身 ⇒
    // pushWithRedirect 无限递归 RangeError: Maximum call stack size exceeded（整页空白）。
    path: '/result/404',
    name: 'result404',
    component: () => import('@/pages/result/404/index.vue'),
  },
  // 403 / 500 两个页面此前只有 .vue 文件、**没有任何路由记录**，直接访问会被下面的
  // catch-all 吃掉渲染成 404 页 —— 「页面画了却到不了」的死资源。这里补注册，
  // 供守卫在「已登录但无权限」/「服务异常」时落到对应页。
  {
    path: '/result/403',
    name: 'result403',
    component: () => import('@/pages/result/403/index.vue'),
  },
  {
    path: '/result/500',
    name: 'result500',
    component: () => import('@/pages/result/500/index.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/pages/result/404/index.vue'),
  },
];

export const homepageRouterList: Array<RouteRecordRaw> = mapModuleRouterList(homepageModules);
export const fixedRouterList: Array<RouteRecordRaw> = mapModuleRouterList(fixedModules);

export const allRoutes = [...homepageRouterList, ...fixedRouterList, ...defaultRouterList];

export function mapModuleRouterList(modules: Record<string, unknown>): Array<RouteRecordRaw> {
  const routerList: Array<RouteRecordRaw> = [];
  Object.keys(modules).forEach((key) => {
    const routeModule = modules[key];
    if (isObject(routeModule) && 'default' in routeModule) {
      const route = routeModule.default;
      const routes = Array.isArray(route) ? [...route] : [route];
      routerList.push(...routes);
    }
  });
  return routerList;
}

export const getActive = (maxLevel = 3): string => {
  const route = router.currentRoute.value;
  if (!route.path) return '';
  return route.path
    .split('/')
    .filter((_item: string, index: number) => index <= maxLevel && index > 0)
    .map((item: string) => `/${item}`)
    .join('');
};

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes: allRoutes,
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
