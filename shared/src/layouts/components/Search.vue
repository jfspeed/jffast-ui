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
  <t-popup
    v-model:visible="showPanel"
    placement="bottom"
    trigger="focus"
    :overlay-style="{ minWidth: '320px', maxWidth: '420px' }"
  >
    <template #content>
      <div class="search-result-panel" @mousedown.prevent>
        <div v-if="searchResults.length === 0 && searchData" class="search-empty">未找到匹配的菜单</div>
        <div
          v-for="(item, index) in searchResults"
          :key="item.path"
          class="search-result-item"
          :class="[{ active: activeIndex === index }]"
          @click="handleSelect(item)"
          @mouseenter="activeIndex = index"
        >
          <t-icon :name="item.icon || 'precise-monitor'" size="16" />
          <span class="search-result-title">{{ item.title }}</span>
          <span class="search-result-path">{{ item.path }}</span>
        </div>
      </div>
    </template>
    <t-input
      v-model="searchData"
      class="header-search-input"
      :class="[layout === 'side' ? 'side-style' : 'top-style']"
      :placeholder="t('layout.searchPlaceholder')"
      clearable
      @focus="handleFocus"
      @blur="handleBlur"
      @enter="handleEnter"
    >
      <template #prefix-icon>
        <t-icon name="search" size="16" />
      </template>
    </t-input>
  </t-popup>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { t } from '@/locales';
import { usePermissionStore } from '@/store';

defineProps({
  layout: {
    type: String,
    default: '',
  },
});

const router = useRouter();
const permissionStore = usePermissionStore();

const searchData = ref('');
const isFocus = ref(false);
const activeIndex = ref(-1);

interface SearchMenuItem {
  path: string;
  title: string;
  icon: string;
}

/** 搜索用的菜单节点：只取用 path / meta.title / meta.icon / meta.hidden / children */
interface MenuNode {
  path: string;
  meta?: Record<string, unknown>;
  children?: MenuNode[];
}

const flattenMenus = (routes: MenuNode[], parentPath = ''): SearchMenuItem[] => {
  const result: SearchMenuItem[] = [];
  for (const route of routes) {
    const meta = route.meta || {};
    const rawTitle = meta.title;
    let title = '';
    if (typeof rawTitle === 'object' && rawTitle !== null) {
      title = (rawTitle as Record<string, string>).zh_CN || '';
    } else if (typeof rawTitle === 'string') {
      title = rawTitle;
    }
    let path = route.path;
    if (!path.startsWith('/')) {
      path = `${parentPath}/${path}`;
    }
    if (title && !meta.hidden) {
      result.push({
        path,
        title,
        icon: (meta.icon as string) || 'precise-monitor',
      });
    }
    if (route.children && route.children.length > 0) {
      result.push(...flattenMenus(route.children, path));
    }
  }
  return result;
};

const allMenuItems = computed(() => {
  return flattenMenus(permissionStore.routers as unknown as MenuNode[]);
});

const searchResults = computed(() => {
  if (!searchData.value) return [];
  const keyword = searchData.value.toLowerCase();
  return allMenuItems.value
    .filter((item) => item.title.toLowerCase().includes(keyword) || item.path.toLowerCase().includes(keyword))
    .slice(0, 8);
});

const showPanel = computed(() => {
  return isFocus.value && searchData.value.length > 0;
});

watch(searchData, () => {
  activeIndex.value = -1;
});

const handleFocus = () => {
  isFocus.value = true;
};

const handleBlur = () => {
  setTimeout(() => {
    isFocus.value = false;
    activeIndex.value = -1;
  }, 200);
};

const handleEnter = () => {
  if (activeIndex.value >= 0 && activeIndex.value < searchResults.value.length) {
    handleSelect(searchResults.value[activeIndex.value]);
  } else if (searchResults.value.length > 0) {
    handleSelect(searchResults.value[0]);
  }
};

const handleSelect = (item: SearchMenuItem) => {
  router.push(item.path);
  searchData.value = '';
  isFocus.value = false;
  activeIndex.value = -1;
};
</script>
<style lang="less" scoped>
.header-search-input {
  width: 200px;
}

.side-style {
  :deep(.t-input) {
    border: none;
    outline: none;
    box-shadow: none;
    background: transparent;
    transition: background 0.2s;

    .t-input__inner {
      background: transparent;
    }

    &:hover,
    &:focus-within {
      background: var(--td-bg-color-secondarycontainer);

      .t-input__inner {
        background: var(--td-bg-color-secondarycontainer);
      }
    }
  }
}

.top-style {
  :deep(.t-input) {
    border: 0;
    background: var(--td-bg-color-input);

    &:focus-within {
      background: var(--td-bg-color-container);
      box-shadow: 0 0 0 1px var(--td-brand-color);
    }
  }
}

.search-result-panel {
  padding: 4px 0;
}

.search-empty {
  padding: 16px;
  text-align: center;
  color: var(--td-text-color-placeholder);
  font-size: 14px;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--td-text-color-primary);
  transition: background 0.15s;

  &:hover,
  &.active {
    background: var(--td-bg-color-container-hover);
  }

  .search-result-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-result-path {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
    flex-shrink: 0;
  }
}
</style>
