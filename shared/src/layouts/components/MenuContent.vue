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
  <div>
    <template v-for="item in list" :key="item.path">
      <template v-if="!item.children || !item.children.length || item.meta?.single">
        <t-menu-item v-if="getHref(item)" :name="item.path" :value="getPath(item)" @click="openHref(getHref(item)![0])">
          <template #icon>
            <component :is="menuIcon(item, level)" class="t-icon"></component>
          </template>
          {{ renderMenuTitle(item.title) }}
        </t-menu-item>
        <t-menu-item v-else :name="item.path" :value="getPath(item)" :to="item.path">
          <template #icon>
            <component :is="menuIcon(item, level)" class="t-icon"></component>
          </template>
          {{ renderMenuTitle(item.title) }}
        </t-menu-item>
      </template>
      <t-submenu v-else :name="item.path" :value="item.path" :title="renderMenuTitle(item.title)">
        <template #icon>
          <component :is="menuIcon(item, level)" class="t-icon"></component>
        </template>
        <menu-content v-if="item.children" :nav-data="item.children" :level="level + 1" />
      </t-submenu>
    </template>
  </div>
</template>
<script setup lang="tsx">
import type { PropType } from 'vue';
import { computed } from 'vue';

import type { LocalizedTitle } from '@/locales';
import { useLocale } from '@/locales/useLocale';
import { getActive } from '@/runtime';
import type { MenuRoute } from '@/types/interface';

type ListItemType = MenuRoute;

const { navData, level = 1 } = defineProps({
  navData: {
    type: Array as PropType<MenuRoute[]>,
    default: () => [],
  },
  level: {
    type: Number,
    default: 1,
  },
});

// 一级菜单缺 icon 时用默认图标兜底，避免侧边栏收起后该行空白
const DEFAULT_MENU_ICON = 'folder';

const active = computed(() => getActive());

const { locale } = useLocale();

const list = computed(() => {
  return getMenuList(navData);
});

const menuIcon = (item: ListItemType, menuLevel: number) => {
  const icon = item.icon || (menuLevel === 1 ? DEFAULT_MENU_ICON : undefined);
  if (typeof icon === 'string') return <t-icon name={icon} />;
  return icon;
};

const renderMenuTitle = (title?: LocalizedTitle) => {
  if (!title) return '';
  return title[locale.value as keyof LocalizedTitle] || '';
};

function getMenuList(list: MenuRoute[], basePath?: string): MenuRoute[] {
  if (!list || list.length === 0) {
    return [];
  }
  // 如果meta中有orderNo则按照从小到大排序
  list.sort((a, b) => {
    return (a.meta?.orderNo || 0) - (b.meta?.orderNo || 0);
  });
  return list
    .map((item) => {
      const path = basePath && !item.path.includes(basePath) ? `${basePath}/${item.path}` : item.path;

      return {
        path,
        title: item.meta?.title as LocalizedTitle | undefined,
        icon: item.meta?.icon,
        children: getMenuList(item.children, path),
        meta: item.meta,
        redirect: item.redirect,
      } as MenuRoute;
    })
    .filter((item) => item.meta && item.meta.hidden !== true);
}

const HREF_URL_RE = /(https?):\/\/([\w.-]+)(?:\/\S*)?/;

const getHref = (item: MenuRoute) => {
  const { frameSrc, frameBlank } = item.meta;
  if (frameSrc && frameBlank) {
    return frameSrc.match(HREF_URL_RE);
  }
  return null;
};

const getPath = (item: ListItemType) => {
  const activeLevel = active.value.split('/').length;
  const pathLevel = item.path.split('/').length;
  if (activeLevel > pathLevel && active.value.startsWith(item.path)) {
    return active.value;
  }

  if (active.value === item.path) {
    return active.value;
  }

  return item.meta?.single ? item.redirect : item.path;
};

// url 取自菜单的外链配置（后台可编辑，属不可信输入）：
// noopener 防新页通过 window.opener 反向操作本页（标签劫持），noreferrer 防止 referer 携带后台地址外泄
const openHref = (url: string) => {
  window.open(url, '_blank', 'noopener,noreferrer');
};
</script>
