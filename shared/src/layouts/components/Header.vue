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
  <div :class="layoutCls">
    <t-head-menu :class="menuCls" :theme="menuTheme" expand-type="popup" :value="active">
      <template #logo>
        <div class="header-left-container">
          <!-- 移动端汉堡按钮：点击弹出抽屉式导航（桌面端不显示，保持原有布局） -->
          <t-button
            v-if="isMobile"
            class="header-hamburger-btn"
            theme="default"
            shape="square"
            variant="text"
            :aria-label="t('common.openNavMenu')"
            @click="toggleNavDrawer"
          >
            <menu-icon />
          </t-button>
          <span v-if="showLogo" class="header-logo-container" @click="handleNav('/dashboard/dashboardBase')">
            <img :src="logoFull" class="jffast-logo" />
            <span class="header-logo-title">{{ appTitle }}</span>
          </span>
          <div v-else class="header-operate-left">
            <search v-if="!isMobile" :layout="layout" />
          </div>
        </div>
      </template>
      <template v-if="layout !== 'side'" #default>
        <!-- 移动端顶部菜单收进抽屉，避免窄屏溢出 -->
        <menu-content v-if="!isMobile" class="header-menu" :nav-data="menu" />
      </template>
      <template #operations>
        <div class="operations-container">
          <!-- 搜索框 -->
          <search v-if="layout !== 'side' && !isMobile" :layout="layout" />

          <!-- 全局通知 -->
          <notice />

          <t-tooltip v-if="!isMobile" placement="bottom" :content="t('layout.header.code')">
            <t-button theme="default" shape="square" variant="text" @click="navToGitHub">
              <t-icon name="logo-github" />
            </t-button>
          </t-tooltip>
          <t-tooltip v-if="!isMobile" placement="bottom" :content="t('layout.header.help')">
            <t-button theme="default" shape="square" variant="text" @click="navToHelper">
              <t-icon name="help-circle" />
            </t-button>
          </t-tooltip>
          <!-- <language-switcher /> -->
          <t-dropdown :min-column-width="120" trigger="click">
            <template #dropdown>
              <t-dropdown-item class="operations-dropdown-container-item" @click="handleNav('/user/index')">
                <user-circle-icon />{{ t('layout.header.user') }}
              </t-dropdown-item>
              <!-- 移动端把次要入口收进用户菜单 -->
              <t-dropdown-item v-if="isMobile" class="operations-dropdown-container-item" @click="navToGitHub">
                <t-icon name="logo-github" />{{ t('layout.header.code') }}
              </t-dropdown-item>
              <t-dropdown-item v-if="isMobile" class="operations-dropdown-container-item" @click="navToHelper">
                <t-icon name="help-circle" />{{ t('layout.header.help') }}
              </t-dropdown-item>
              <t-dropdown-item class="operations-dropdown-container-item" @click="handleLogout">
                <poweroff-icon />{{ t('layout.header.signOut') }}
              </t-dropdown-item>
            </template>
            <t-button class="header-user-btn" theme="default" variant="text">
              <template #icon>
                <t-icon class="header-user-avatar" name="user-circle" />
              </template>
              <div v-if="!isMobile" class="header-user-account">
                {{ (user.userInfo as any)?.userName || t('common.admin') }}
              </div>
              <template #suffix><chevron-down-icon /></template>
            </t-button>
          </t-dropdown>
          <t-tooltip placement="bottom" :content="t('layout.header.setting')">
            <t-button theme="default" shape="square" variant="text" @click="toggleSettingPanel">
              <setting-icon />
            </t-button>
          </t-tooltip>
        </div>
      </template>
    </t-head-menu>
    <!-- 移动端抽屉式导航：点菜单项 / 遮罩后自动收起 -->
    <mobile-nav-drawer v-if="isMobile" v-model:visible="navDrawerVisible" :menu="navMenu" />
  </div>
</template>
<script setup lang="ts">
const { theme, layout, showLogo, menu, isFixed, isCompact } = defineProps({
  theme: {
    type: String,
    default: 'light',
  },
  layout: {
    type: String,
    default: 'top',
  },
  showLogo: {
    type: Boolean,
    default: true,
  },
  menu: {
    type: Array as PropType<MenuRoute[]>,
    default: () => [],
  },
  isFixed: {
    type: Boolean,
    default: false,
  },
  isCompact: {
    type: Boolean,
    default: false,
  },
  maxLevel: {
    type: Number,
    default: 3,
  },
});
const appTitle = import.meta.env.VITE_APP_TITLE || '疾风管理系统'; // 与登录页同源：产品在 .env 覆盖 VITE_APP_TITLE
import { ChevronDownIcon, MenuIcon, PoweroffIcon, SettingIcon, UserCircleIcon } from 'tdesign-icons-vue-next';
import type { PropType } from 'vue';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { prefix } from '@/config/global';
import { useResponsive } from '@/hooks/useResponsive';
import { t } from '@/locales';
import { getActive, getAuthApi } from '@/runtime';
import { usePermissionStore, useSettingStore, useUserStore } from '@/store';
import type { MenuRoute, ModeType } from '@/types/interface';
import { buildLoginRoute } from '@/utils/login-redirect';

import logoFull from '../../assets/assets-jp-logo.png';
import MenuContent from './MenuContent.vue';
import MobileNavDrawer from './MobileNavDrawer.vue';
import Notice from './Notice.vue';
import Search from './Search.vue';

const router = useRouter();
const settingStore = useSettingStore();
const permissionStore = usePermissionStore();
const user = useUserStore();

// 移动端判定统一走 useResponsive（断点 ≤768px），抽屉导航只在移动端出现
const { isMobile } = useResponsive();
const navDrawerVisible = ref(false);
const toggleNavDrawer = () => {
  navDrawerVisible.value = !navDrawerVisible.value;
};
// 窗口拉宽回桌面时收起抽屉，避免遮罩残留
watch(isMobile, (mobile) => {
  if (!mobile) {
    navDrawerVisible.value = false;
  }
});

// 抽屉里展示完整菜单树，移动端无论哪种布局都从这里进入功能
const navMenu = computed(() => permissionStore.routers as unknown as MenuRoute[]);

const toggleSettingPanel = () => {
  settingStore.updateConfig({
    showSettingPanel: true,
  });
};

const active = computed(() => getActive());

const layoutCls = computed(() => [`${prefix}-header-layout`]);

const menuCls = computed(() => {
  return [
    {
      [`${prefix}-header-menu`]: !isFixed,
      [`${prefix}-header-menu-fixed`]: isFixed,
      [`${prefix}-header-menu-fixed-side`]: layout === 'side' && isFixed,
      [`${prefix}-header-menu-fixed-side-compact`]: layout === 'side' && isFixed && isCompact,
    },
  ];
});
const menuTheme = computed(() => theme as ModeType);

// 切换语言
const handleNav = (url: string) => {
  router.push(url);
};

const handleLogout = async () => {
  try {
    // 先让后端吊销会话（删除 Redis 中的 token/session），否则旧 token 在有效期内仍可访问接口
    await getAuthApi().auth.logout();
  } catch {
    // 后端不可用时不阻塞退出，本地状态照常清理
  }
  // 只调后端登出会留下 pinia 内存态、localStorage 与已注入的动态路由：
  // 同标签页重新登录会沿用上一账号的菜单/权限，必须一并清理。
  await user.logout();
  await permissionStore.restoreRoutes();
  router.replace(buildLoginRoute(router.currentRoute.value.fullPath));
};

const navToGitHub = () => {
  window.open('https://github.com/summerZstar/jffast');
};

const navToHelper = () => {
  window.open('https://github.com/summerZstar/jffast/tree/master/docs');
};
</script>
<style lang="less" scoped>
.@{starter-prefix}-header {
  &-menu-fixed {
    position: fixed;
    top: 0;
    z-index: 1001;

    :deep(.t-head-menu__inner) {
      padding-right: var(--td-comp-margin-xl);
    }

    &-side {
      left: 232px;
      right: 0;
      z-index: 10;
      width: auto;
      transition: all 0.3s;

      &-compact {
        left: 64px;
      }
    }
  }

  &-logo-container {
    cursor: pointer;
    display: inline-flex;
  }
}

.header-menu {
  flex: 1 1 auto;
  display: inline-flex;

  :deep(.t-menu__item) {
    min-width: unset;
  }
}

.operations-container {
  display: flex;
  align-items: center;

  .t-popup__reference {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .t-button {
    margin-left: var(--td-comp-margin-l);
  }
}

.header-operate-left {
  display: flex;
  align-items: normal;
  line-height: 0;
}

.header-left-container {
  display: flex;
  align-items: center;
  // 抵消 t-menu__logo > * 的默认缩进，缩进由内部元素自己控制，桌面端观感与改造前一致
  margin-left: 0;

  .header-operate-left {
    margin-left: var(--td-comp-margin-xxl);
  }
}

.header-logo-container {
  display: flex;
  align-items: center;
  margin-left: 12px;
  color: var(--td-text-color-primary);
  gap: 8px;

  .t-logo {
    width: 28px;
    height: 28px;
  }

  .header-logo-title {
    font: var(--td-font-title-large);
    white-space: nowrap;
  }

  &:hover {
    cursor: pointer;
  }
}

.header-user-account {
  display: inline-flex;
  align-items: center;
  color: var(--td-text-color-primary);
}

:deep(.t-head-menu__inner) {
  border-bottom: 1px solid var(--td-component-stroke);
}

.t-menu--light {
  .header-user-account {
    color: var(--td-text-color-primary);
  }
}

.t-menu--dark {
  .t-head-menu__inner {
    border-bottom: 1px solid var(--td-gray-color-10);
  }

  .header-user-account {
    color: rgb(255 255 255 / 55%);
  }
}

.operations-dropdown-container-item {
  width: 100%;
  display: flex;
  align-items: center;

  :deep(.t-dropdown__item-text) {
    display: flex;
    align-items: center;
  }

  .t-icon {
    font-size: var(--td-comp-size-xxxs);
    margin-right: var(--td-comp-margin-s);
  }

  :deep(.t-dropdown__item) {
    width: 100%;
    margin-bottom: 0;
  }

  &:last-child {
    :deep(.t-dropdown__item) {
      margin-bottom: 8px;
    }
  }
}

// 移动端顶栏压缩（断点口径同 shared/src/hooks/useResponsive.ts 的 RESPONSIVE_BREAKPOINTS.mobile）
@media (width <= 768px) {
  // 侧边栏已改为抽屉，顶栏不再避让固定侧栏宽度
  .@{starter-prefix}-header {
    &-menu-fixed-side,
    &-menu-fixed-side-compact {
      left: 0;
    }
  }

  .header-left-container {
    .header-logo-container {
      margin-left: 4px;
      gap: 6px;

      .header-logo-title {
        font: var(--td-font-body-large);
      }
    }
  }

  .operations-container {
    .t-button {
      margin-left: 4px;
      // 触摸友好：可点击目标不小于 40px
      min-width: 40px;
      min-height: 40px;
    }
  }
}
</style>
<!-- eslint-disable-next-line vue-scoped-css/enforce-style-type -->
<style lang="less">
.operations-dropdown-container-item {
  .t-dropdown__item-text {
    display: flex;
    align-items: center;
  }
}
</style>
