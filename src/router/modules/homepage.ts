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

import { DashboardIcon, ViewListIcon } from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import Layout from '@/layouts/index.vue';

export default [
  {
    // 有意开放：登录用户首页，不声明 meta.perm（守卫对未声明路由保持原放行行为）。
    // 仅登录态可达，未登录由守卫统一跳登录页；需要控权限的子页面各自声明 perm。
    path: '/dashboard',
    component: Layout,
    redirect: '/dashboard/dashboardBase',
    name: 'dashboard',
    meta: {
      title: {
        zh_CN: '首页',
        en_US: 'Dashboard',
      },
      icon: shallowRef(DashboardIcon),
      orderNo: 0,
    },
    children: [
      {
        // path 必须与后端菜单 sys_menu.path 一致（驼峰 dashboardBase），
        // 否则与动态菜单生成的同名路由（name=DashboardBase, path=/dashboard/dashboardBase）
        // 形成两套 URL，且 addRoute 同名覆盖后本条失效。
        path: 'dashboardBase',
        name: 'DashboardBase',
        component: () => import('@/pages/dashboard/base/index.vue'),
        meta: {
          title: {
            zh_CN: '概览',
            en_US: 'Overview',
          },
          icon: shallowRef(ViewListIcon),
        },
      },
    ],
  },
] satisfies RouteRecordRaw[];
