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

import { SettingIcon } from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import Layout from '@/layouts/index.vue';

/**
 * 系统管理模块路由。
 *
 * ⚠️ 本模块路由是**静态注册**的（`router/index.ts` 用 `import.meta.glob` 收集全部 modules），
 * 而路由守卫只能判断"路由是否注册" ⇒ 只要知道 URL 就能直达页面。因此这里用 `meta.perm`
 * 声明**页面级权限**（守卫 `src/permission.ts` 会校验；超管自动放行）。
 *
 * 取值原则：与菜单种子（`jffast/sql/system_init_data.sql` 的 1001-1011、`jffast/sql/sys_post.sql` 的 1012）一一对应。
 * **没有对应菜单权限的页面（如系统监控/缓存管理/OAuth2 接入配置）不声明** —— 声明了会让
 * 除超管外的人全部无法访问，而这些页面本就没有菜单权限可授。
 */
export default [
  {
    path: '/system',
    component: Layout,
    redirect: '/system/user',
    name: 'system',
    meta: {
      title: {
        zh_CN: '系统管理',
        en_US: 'System',
      },
      icon: shallowRef(SettingIcon),
      orderNo: 10,
    },
    children: [
      {
        path: 'user',
        name: 'SystemUser',
        component: () => import('@/pages/system/user/index.vue'),
        meta: {
          title: {
            zh_CN: '用户管理',
            en_US: 'User',
          },
          perm: 'system:user:view',
        },
      },
      {
        path: 'role',
        name: 'SystemRole',
        component: () => import('@/pages/system/role/index.vue'),
        meta: {
          title: {
            zh_CN: '角色管理',
            en_US: 'Role',
          },
          perm: 'system:role:view',
        },
      },
      {
        path: 'menu',
        name: 'SystemMenu',
        component: () => import('@/pages/system/menu/index.vue'),
        meta: {
          title: {
            zh_CN: '菜单管理',
            en_US: 'Menu',
          },
          perm: 'system:menu:view',
        },
      },
      {
        path: 'dept',
        name: 'SystemDept',
        component: () => import('@/pages/system/dept/index.vue'),
        meta: {
          title: {
            zh_CN: '部门管理',
            en_US: 'Department',
          },
          perm: 'system:dept:view',
        },
      },
      {
        path: 'dict',
        name: 'SystemDict',
        component: () => import('@/pages/system/dict/index.vue'),
        meta: {
          title: {
            zh_CN: '字典管理',
            en_US: 'Dictionary',
          },
          perm: 'system:dict:view',
        },
      },
      {
        path: 'post',
        name: 'SystemPost',
        component: () => import('@/pages/system/post/index.vue'),
        meta: {
          title: {
            zh_CN: '岗位管理',
            en_US: 'Post',
          },
          perm: 'system:post:view',
        },
      },
      {
        path: 'systemTask',
        name: 'SystemTask',
        component: () => import('@/pages/system/task/index.vue'),
        meta: {
          title: {
            zh_CN: '异步任务',
            en_US: 'Async Task',
          },
          perm: 'system:task:view',
        },
      },
      {
        path: 'systemFile',
        name: 'SystemFile',
        component: () => import('@/pages/system/file/index.vue'),
        meta: {
          title: {
            zh_CN: '文件管理',
            en_US: 'File',
          },
          perm: 'system:file:view',
        },
      },
      {
        path: 'log',
        name: 'SystemLog',
        component: () => import('@/pages/system/log/index.vue'),
        meta: {
          title: {
            zh_CN: '日志管理',
            en_US: 'Log',
          },
          perm: 'system:log:view',
        },
      },
      {
        path: 'config',
        name: 'SystemConfig',
        component: () => import('@/pages/system/config/index.vue'),
        meta: {
          title: {
            zh_CN: '参数配置',
            en_US: 'Config',
          },
          perm: 'system:config:view',
        },
      },
      {
        path: 'oauth2-client/index',
        name: 'SystemOAuth2Client',
        component: () => import('@/pages/system/oauth2-client/index.vue'),
        meta: {
          title: {
            zh_CN: 'OAuth2接入配置',
            en_US: 'OAuth2 Client',
          },
          perm: 'system:oauth2client:view',
        },
      },
      {
        path: 'online',
        name: 'SystemOnline',
        component: () => import('@/pages/system/online/index.vue'),
        meta: {
          title: {
            zh_CN: '在线用户',
            en_US: 'Online User',
          },
          perm: 'system:online:view',
        },
      },
      {
        path: 'monitor',
        name: 'SystemMonitor',
        component: () => import('@/pages/system/monitor/index.vue'),
        meta: {
          title: {
            zh_CN: '系统监控',
            en_US: 'System Monitor',
          },
          perm: 'system:monitor:view',
        },
      },
      {
        path: 'cache',
        name: 'SystemCache',
        component: () => import('@/pages/system/cache/index.vue'),
        meta: {
          title: {
            zh_CN: '缓存管理',
            en_US: 'Cache',
          },
          perm: 'system:cache:view',
        },
      },
      {
        path: 'codegen',
        name: 'SystemCodegen',
        component: () => import('@/pages/system/codegen/index.vue'),
        meta: {
          title: {
            zh_CN: '代码生成',
            en_US: 'Code Generator',
          },
          perm: 'system:codegen:view',
        },
      },
      {
        path: 'notification',
        name: 'SystemNotification',
        component: () => import('@/pages/system/notification/index.vue'),
        meta: {
          title: {
            zh_CN: '通知管理',
            en_US: 'Notification',
          },
          perm: 'system:notification:view',
        },
      },
      {
        path: 'job',
        name: 'SystemJob',
        component: () => import('@/pages/system/job/index.vue'),
        meta: {
          title: {
            zh_CN: '定时任务',
            en_US: 'Scheduled Job',
          },
          perm: 'system:job:view',
        },
      },
      {
        path: 'job/log',
        name: 'SystemJobLog',
        component: () => import('@/pages/system/job/log.vue'),
        meta: {
          title: {
            zh_CN: '任务日志',
            en_US: 'Job Log',
          },
          hidden: true,
          // 任务日志是"定时任务"页的下钻页面，沿用同一权限
          perm: 'system:job:view',
        },
      },
    ],
  },
] satisfies RouteRecordRaw[];
