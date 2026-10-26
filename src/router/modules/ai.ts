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

import { ChatIcon } from 'tdesign-icons-vue-next';
import { shallowRef } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import Layout from '@/layouts/index.vue';

export default [
  {
    path: '/ai',
    component: Layout,
    redirect: '/ai/knowledge',
    name: 'ai',
    meta: {
      title: {
        zh_CN: 'AI 中心',
        en_US: 'AI',
      },
      icon: shallowRef(ChatIcon),
      orderNo: 20,
    },
    children: [
      // ⚠️ 本模块路由是**静态注册**的，而守卫原先只判"路由是否注册" ⇒ 手输 URL 即可直达页面。
      //    因此这里用 `meta.perm` 声明页面级权限（守卫会校验，见 src/permission.ts），
      //    权限标识与菜单种子（`sql/ai_knowledge.sql` 的 9001-9003）保持一致。
      {
        path: 'knowledge',
        name: 'AiKnowledgeBase',
        component: () => import('@/pages/ai/knowledgeBase/index.vue'),
        meta: {
          title: {
            zh_CN: '知识库',
            en_US: 'Knowledge Base',
          },
          perm: 'ai:knowledge-base:view',
        },
      },
      {
        path: 'document',
        name: 'AiDocument',
        component: () => import('@/pages/ai/document/index.vue'),
        meta: {
          title: {
            zh_CN: '文档管理',
            en_US: 'Documents',
          },
          perm: 'ai:document:view',
        },
      },
      {
        path: 'conversation',
        name: 'AiConversation',
        component: () => import('@/pages/ai/conversation/index.vue'),
        meta: {
          title: {
            zh_CN: '对话记录',
            en_US: 'Conversations',
          },
          perm: 'ai:conversation:view',
        },
      },
    ],
  },
] satisfies RouteRecordRaw[];
