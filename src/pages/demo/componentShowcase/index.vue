<!--
Copyright 2024-2026 jffast

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

<template>
  <div class="component-showcase">
    <div class="cs-layout">
      <!-- 左侧分类导航 -->
      <aside class="cs-nav">
        <div class="cs-nav__title">{{ t('pages.demo.showcase.navTitle') }}</div>
        <ul>
          <li v-for="item in navs" :key="item.id">
            <a :href="`#${item.id}`" @click.prevent="scrollTo(item.id)">{{ item.label }}</a>
          </li>
        </ul>
      </aside>

      <!-- 右侧内容 -->
      <main class="cs-content">
        <header class="cs-header">
          <h1>{{ t('pages.demo.showcase.title') }}</h1>
          <p>
            {{ t('pages.demo.showcase.desc') }}
          </p>
        </header>

        <layout-section />
        <form-section />
        <data-section />
        <feedback-section />
        <nav-section />
        <shared-section />
      </main>
    </div>
  </div>
</template>
<script setup lang="ts">
// 组件名必须与路由名一致（`Content.vue` 的 keep-alive :include 用的就是 route.name，
// 而 Vue 按**组件名**匹配）。路由名来自后端菜单：`upperFirst(sys_menu.path)`，
// 与静态路由 modules/*.ts 的 name 字段同源。缺这句时页签保活静默失效。
defineOptions({
  name: 'Components',
});
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import DataSection from './sections/DataSection.vue';
import FeedbackSection from './sections/FeedbackSection.vue';
import FormSection from './sections/FormSection.vue';
import LayoutSection from './sections/LayoutSection.vue';
import NavSection from './sections/NavSection.vue';
import SharedSection from './sections/SharedSection.vue';

const { t } = useI18n();

// 分类导航（响应语言切换）
const navs = computed(() => [
  { id: 'layout', label: t('pages.demo.showcase.menu.layout') },
  { id: 'form', label: t('pages.demo.showcase.menu.form') },
  { id: 'data', label: t('pages.demo.showcase.menu.data') },
  { id: 'feedback', label: t('pages.demo.showcase.menu.feedback') },
  { id: 'nav', label: t('pages.demo.showcase.menu.nav') },
  { id: 'shared', label: t('pages.demo.showcase.menu.shared') },
]);

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>
<style scoped>
.component-showcase {
  padding: 16px;
}

.cs-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.cs-nav {
  position: sticky;
  top: 16px;
  width: 180px;
  flex-shrink: 0;
  background: var(--td-bg-color-container, #fff);
  border: 1px solid var(--td-component-border, #e7e7e7);
  border-radius: 8px;
  padding: 12px 0;
}

.cs-nav__title {
  font-weight: 600;
  padding: 0 16px 8px;
  color: #888;
  font-size: 13px;
}

.cs-nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cs-nav li a {
  display: block;
  padding: 8px 16px;
  color: var(--td-text-color-primary, #1a1a1a);
  text-decoration: none;
  font-size: 14px;
}

.cs-nav li a:hover {
  background: var(--td-brand-color-light, #e0eaff);
  color: var(--td-brand-color, #0052d9);
}

.cs-content {
  flex: 1;
  min-width: 0;
}

.cs-header {
  margin-bottom: 24px;
}

.cs-header h1 {
  font-size: 24px;
  margin: 0 0 8px;
}

.cs-header p {
  color: #666;
  line-height: 1.7;
  margin: 0;
}

.showcase-section {
  scroll-margin-top: 16px;
}
</style>
