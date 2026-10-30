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
  <t-drawer
    class="mobile-nav-drawer"
    :visible="visible"
    :footer="false"
    :close-btn="true"
    :show-overlay="true"
    :close-on-overlay-click="true"
    :close-on-esc-keydown="true"
    placement="left"
    size="264px"
    @update:visible="handleVisibleChange"
  >
    <template #header>
      <div class="mobile-nav-drawer-header">
        <img :src="logoIcon" class="mobile-nav-drawer-logo" alt="" />
        <span class="mobile-nav-drawer-title">{{ appTitle }}</span>
      </div>
    </template>
    <t-menu class="mobile-nav-drawer-menu" :theme="theme" :value="active" :expanded="expanded" @expand="onExpanded">
      <menu-content :nav-data="menu" />
    </t-menu>
  </t-drawer>
</template>
<script setup lang="ts">
const { visible, menu } = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  menu: {
    type: Array as PropType<MenuRoute[]>,
    default: () => [],
  },
});
const emit = defineEmits<{ 'update:visible': [value: boolean] }>();
const appTitle = import.meta.env.VITE_APP_TITLE || '疾风管理系统'; // 与登录页同源：产品在 .env 覆盖 VITE_APP_TITLE
import type { MenuValue } from 'tdesign-vue-next';
import type { PropType } from 'vue';
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { getActive } from '@/runtime';
import { useSettingStore } from '@/store';
import type { MenuRoute } from '@/types/interface';

import logoIcon from '../../assets/assets-jp-logo.png';
import MenuContent from './MenuContent.vue';

const route = useRoute();
const settingStore = useSettingStore();

const theme = computed(() => settingStore.displaySideMode);
const active = computed(() => getActive());

// 当前路由所在菜单链默认展开，抽屉打开就能看到高亮菜单项
const expanded = ref<MenuValue[]>([]);
const syncExpanded = () => {
  const parts = active.value.split('/').slice(1);
  expanded.value = parts.map((_, index) => `/${parts.slice(0, index + 1).join('/')}`);
};
syncExpanded();
watch(active, syncExpanded);

const onExpanded = (value: MenuValue[]) => {
  expanded.value = value;
};

const handleVisibleChange = (value: boolean) => {
  emit('update:visible', value);
};

// 点菜单项跳转路由后自动收起抽屉（点遮罩 / 关闭按钮 / ESC 由 t-drawer 自行收起）
watch(
  () => route.path,
  () => {
    emit('update:visible', false);
  },
);
</script>
<style lang="less" scoped>
.mobile-nav-drawer {
  :deep(.t-drawer__body) {
    padding: 0;
    overflow-y: auto;
  }

  // 菜单铺满抽屉面板高度，长菜单在面板内滚动
  .mobile-nav-drawer-menu {
    width: 100%;
    min-height: 100%;
  }

  .mobile-nav-drawer-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mobile-nav-drawer-logo {
    height: 32px;
    width: auto;
  }

  .mobile-nav-drawer-title {
    font: var(--td-font-title-large);
    color: var(--td-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
