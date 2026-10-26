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

import {
  BLANK_LAYOUT,
  EXCEPTION_COMPONENT,
  IFRAME,
  LAYOUT,
  PAGE_NOT_FOUND_ROUTE,
  PARENT_LAYOUT,
} from '@/utils/route/constant';

/** 路由组件在解析前后的三种形态：字符串占位 → 懒加载函数 / 已解析的组件对象 */
type RouteComponent = string | ((...args: never[]) => unknown) | object;

interface RouteItem {
  name: string;
  path: string;
  /** 后端菜单可以没有 component（纯目录/占位菜单），由 asyncImportRoute 兜底 */
  component?: RouteComponent;
  redirect?: string;
  meta?: Record<string, unknown>;
  children?: RouteItem[];
}

const LayoutMap = new Map<string, () => Promise<typeof import('*.vue')>>();

LayoutMap.set('LAYOUT', LAYOUT);
LayoutMap.set('BLANK', BLANK_LAYOUT);
LayoutMap.set('IFRAME', IFRAME);

let dynamicViewsModules: Record<string, () => Promise<Recordable>> = {};
const viewsModulesPrefixes: string[] = [];

export function setupViewsModules(modules: Record<string, () => Promise<Recordable>>, prefix = '../../pages') {
  dynamicViewsModules = { ...dynamicViewsModules, ...modules };
  if (!viewsModulesPrefixes.includes(prefix)) {
    viewsModulesPrefixes.push(prefix);
  }
}

function stripPrefix(key: string): string {
  for (const prefix of viewsModulesPrefixes) {
    if (key.startsWith(prefix)) {
      return key.replace(prefix, '');
    }
  }
  return key;
}

function asyncImportRoute(routes: RouteItem[] | undefined) {
  if (!routes) return;

  routes.forEach(async (item) => {
    const { component, name } = item;
    const { children } = item;

    if (typeof component === 'string' && component) {
      const layoutFound = LayoutMap.get(component.toUpperCase());
      if (layoutFound) {
        item.component = layoutFound as RouteComponent;
      } else {
        item.component = dynamicImport(dynamicViewsModules, component) as RouteComponent;
      }
    } else if (name) {
      item.component = PARENT_LAYOUT() as RouteComponent;
    }

    children && asyncImportRoute(children);
  });
}

function dynamicImport(modules: Record<string, () => Promise<Recordable>>, component: string) {
  if (!modules || Object.keys(modules).length === 0) {
    console.warn('viewsModules is empty, please call setupViewsModules() first');
    return EXCEPTION_COMPONENT;
  }
  const keys = Object.keys(modules);
  const matchKeys = keys.filter((key) => {
    const k = stripPrefix(key);
    const startFlag = component.startsWith('/');
    const endFlag = component.endsWith('.vue') || component.endsWith('.tsx');
    const startIndex = startFlag ? 0 : 1;
    const lastIndex = endFlag ? k.length : k.lastIndexOf('.');
    return k.substring(startIndex, lastIndex) === component;
  });
  if (matchKeys?.length === 1) {
    const matchKey = matchKeys[0];
    return modules[matchKey];
  }
  if (matchKeys?.length > 1) {
    // Prefer the match with the shorter prefix (Pro's ./pages over Base's ../pages)
    const sorted = matchKeys.sort((a, b) => {
      const prefixA = viewsModulesPrefixes.find((p) => a.startsWith(p)) || '';
      const prefixB = viewsModulesPrefixes.find((p) => b.startsWith(p)) || '';
      return prefixB.length - prefixA.length;
    });
    console.warn(`Found multiple matches for ${component}, preferred: ${sorted[0]}`);
    return modules[sorted[0]];
  }

  console.warn(`Can't find ${component} in pages folder`);
  return EXCEPTION_COMPONENT;
}

export function transformObjectToRoute<T = RouteItem>(routeList: RouteItem[]): T[] {
  routeList.forEach(async (route) => {
    const component = route.component as string;

    if (component) {
      if (component.toUpperCase() === 'LAYOUT') {
        route.component = LayoutMap.get(component.toUpperCase()) as RouteComponent;
      } else {
        route.children = [cloneDeep(route)];
        route.component = LAYOUT as RouteComponent;
        route.name = `${route.name}Parent`;
        route.path = '';
        route.meta = route.meta || {};
      }
    } else {
      // 2026-10-17 兜底：component 缺省 = 目录类菜单（children 来自数据库）。
      // 原实现直接 throw，异常穿透路由构建 → permission.ts catch 强制登出，
      // 一旦库里存在一条无 component 的菜单，任何登录都会崩回 /login（浏览器实测回归）。
      // 目录类（有子节点）走父布局占位；叶子（无子节点）走 404 组件兜底。
      if (route.children && route.children.length > 0) {
        route.component = PARENT_LAYOUT() as RouteComponent;
        route.meta = route.meta || {};
      } else {
        route.component = EXCEPTION_COMPONENT as RouteComponent;
        route.meta = route.meta || {};
      }
      console.warn(
        `[menu-route] ${String(route.name ?? route.path)}: 无 component，已用` +
          `${route.children && route.children.length > 0 ? '父布局占位' : '404 兜底'}` +
          `，请修正 sys_menu 数据`,
      );
    }

    route.children && asyncImportRoute(route.children);
  });

  return [PAGE_NOT_FOUND_ROUTE, ...routeList] as unknown as T[];
}
