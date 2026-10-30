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

import { ViewModuleIcon } from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import Layout from '@/layouts/index.vue';

export default [
  {
    path: '/demo',
    component: Layout,
    redirect: '/demo/example',
    name: 'demo',
    meta: {
      title: {
        zh_CN: '示例模块',
        en_US: 'Demo',
      },
      icon: shallowRef(ViewModuleIcon),
      orderNo: 2,
    },
    children: [
      {
        path: 'example',
        name: 'DemoExample',
        component: () => import('@/pages/demo/demoExample/index.vue'),
        meta: {
          title: {
            zh_CN: '示例管理',
            en_US: 'Example',
          },
          // 与 sql/demo_init_data.sql 的菜单 201/202 一致
          perm: 'demo:example:view',
        },
      },
      {
        path: 'leave',
        name: 'DemoLeaveApplication',
        component: () => import('@/pages/demo/leaveApplication/index.vue'),
        meta: {
          title: {
            zh_CN: '请假申请',
            en_US: 'Leave Application',
          },
          // 与 sql/demo_init_data.sql 的菜单 205（demo:leave:view）一致：
          // 不声明时任意登录用户都能打开页面，接口随后 403。
          perm: 'demo:leave:view',
        },
      },
      {
        path: 'tenant-example',
        name: 'DemoTenantExample',
        component: () => import('@/pages/demo/demoTenantExample/index.vue'),
        meta: {
          title: {
            zh_CN: '租户隔离示例',
            en_US: 'Tenant Demo',
          },
          // 与 sql/demo_init_data.sql 的菜单 204 一致
          perm: 'demo:tenant-example:view',
        },
      },
      {
        path: 'components',
        name: 'Components',
        component: () => import('@/pages/demo/componentShowcase/index.vue'),
        meta: {
          title: {
            zh_CN: '组件示例',
            en_US: 'Components',
          },
          perm: 'demo:components:view',
        },
      },
    ],
  },
] satisfies RouteRecordRaw[];
