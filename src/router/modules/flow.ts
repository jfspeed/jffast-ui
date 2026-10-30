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

import { PreciseMonitorIcon } from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import Layout from '@/layouts/index.vue';

/**
 * 工作流模块路由。
 *
 * <p>为什么补这个文件：`VITE_USE_STATIC_ROUTES=true`（静态路由模式）下，菜单路由来自
 * `import.meta.glob('./modules/**\/*.ts')` 收集的模块清单，而此前 modules 里只有
 * ai / demo / homepage / system / user —— **没有 flow**。结果是一旦开启该开关，
 * 工作流整个模块不可达（菜单种了 3001-3006、页面 `src/pages/flow/**` 也在，但路由从未注册，
 * 访问只会落到 `/result/404`）。2026-10-29 补上。
 *
 * <p>其它约定与 {@code modules/system.ts} 完全一致：
 * <ul>
 *   <li>静态注册的**页面级权限**用 `meta.perm` 声明（守卫会校验，超管自动放行）；</li>
 *   <li>取值与菜单种子一一对应 —— 本文件对应 `jffast/sql/flow_sql.sql` 的 3001-3006；</li>
 *   <li>没有枚举出来的页面不声明 perm，否则会让除超管外所有人都进不去。</li>
 * </ul>
 */
export default [
  {
    path: '/flow',
    component: Layout,
    redirect: '/flow/task/todo',
    name: 'flow',
    meta: {
      title: {
        zh_CN: '工作流管理',
        en_US: 'Workflow',
      },
      icon: shallowRef(PreciseMonitorIcon),
      // 与 flow_sql.sql 目录 3000 的 sort 一致
      orderNo: 15,
    },
    children: [
      {
        path: 'task/todo',
        name: 'FlowTaskTodo',
        component: () => import('@/pages/flow/task/todo.vue'),
        meta: {
          title: {
            zh_CN: '待办任务',
            en_US: 'Todo Tasks',
          },
          perm: 'flow:task:view',
        },
      },
      {
        path: 'task/done',
        name: 'FlowTaskDone',
        component: () => import('@/pages/flow/task/done.vue'),
        meta: {
          title: {
            zh_CN: '已办任务',
            en_US: 'Done Tasks',
          },
          perm: 'flow:task:view',
        },
      },
      {
        path: 'category/index',
        name: 'FlowCategory',
        component: () => import('@/pages/flow/category/index.vue'),
        meta: {
          title: {
            zh_CN: '流程分类',
            en_US: 'Category',
          },
          perm: 'flow:category:view',
        },
      },
      {
        path: 'definition/index',
        name: 'FlowDefinition',
        component: () => import('@/pages/flow/definition/index.vue'),
        meta: {
          title: {
            zh_CN: '流程定义',
            en_US: 'Definition',
          },
          perm: 'flow:process:view',
        },
      },
      {
        path: 'instance/index',
        name: 'FlowInstance',
        component: () => import('@/pages/flow/instance/index.vue'),
        meta: {
          title: {
            zh_CN: '流程实例',
            en_US: 'Instance',
          },
          perm: 'flow:process:view',
        },
      },
      {
        path: 'designer/index',
        name: 'FlowDesigner',
        component: () => import('@/pages/flow/designer/index.vue'),
        meta: {
          title: {
            zh_CN: '流程设计器',
            en_US: 'Designer',
          },
          perm: 'flow:process:deploy',
        },
      },
    ],
  },
] satisfies RouteRecordRaw[];
