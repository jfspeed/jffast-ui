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

import type { RouteRecordRaw } from 'vue-router';

export default [
  {
    path: '/user',
    redirect: '/user/index',
    component: () => import('@/layouts/index.vue'),
    children: [
      {
        path: 'index',
        name: 'PersonalCenter',
        component: () => import('@/pages/user/index.vue'),
        meta: { title: { zh_CN: '个人中心', en_US: 'Personal Center' }, hidden: true },
      },
      {
        path: 'notification',
        name: 'MyNotification',
        component: () => import('@/pages/user/notification.vue'),
        meta: { title: { zh_CN: '我的通知', en_US: 'My Notifications' }, hidden: true },
      },
    ],
  },
] satisfies RouteRecordRaw[];
