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
  <div v-if="isDemoMode" class="demo-mode-banner">
    演示环境：增删改可操作，数据不会保存；文件上传与定时任务触发不可用
  </div>
  <l-header
    v-if="settingStore.showHeader"
    :show-logo="settingStore.showHeaderLogo"
    :theme="settingStore.displayMode"
    :layout="settingStore.layout"
    :is-fixed="settingStore.isHeaderFixed"
    :menu="headerMenu"
    :is-compact="settingStore.isSidebarCompact"
  />
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { usePermissionStore, useSettingStore } from '@/store';
import type { MenuRoute } from '@/types/interface';

import LHeader from './Header.vue';

const permissionStore = usePermissionStore();
const settingStore = useSettingStore();
// 上线演示站横幅：构建时注入 VITE_DEMO_MODE=true（见 jffast/docs/demo-mode.md）
const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
const { routers: menuRouters } = storeToRefs(permissionStore);
const headerMenu = computed<MenuRoute[]>(() => {
  if (settingStore.layout === 'mix') {
    if (settingStore.splitMenu) {
      return menuRouters.value.map((menu) => ({ ...menu, children: [] })) as unknown as MenuRoute[];
    }
    return [];
  }
  return menuRouters.value as unknown as MenuRoute[];
});
</script>
<style scoped>
.demo-mode-banner {
  background: var(--td-warning-color-light, #fff1e0);
  color: var(--td-warning-color, #e37318);
  text-align: center;
  font-size: 13px;
  line-height: 32px;
}
</style>
