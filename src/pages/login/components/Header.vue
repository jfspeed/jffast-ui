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
  <header class="login-header">
    <div class="login-logo-container">
      <img :src="logoFullIcon" class="logo" />
      <span class="logo-title">{{ appTitle }}</span>
    </div>
    <div class="operations-container">
      <t-button theme="default" shape="square" variant="text" @click="navToGitHub">
        <t-icon name="logo-github" class="icon" />
      </t-button>
      <t-button theme="default" shape="square" variant="text" @click="navToHelper">
        <t-icon name="help-circle" class="icon" />
      </t-button>
      <language-switcher />
      <t-button theme="default" shape="square" variant="text" @click="toggleSettingPanel">
        <t-icon name="setting" class="icon" />
      </t-button>
    </div>
  </header>
</template>
<script setup lang="ts">
const appTitle = import.meta.env.VITE_APP_TITLE || '疾风管理系统'; // 与登录页同源：产品在 .env 覆盖 VITE_APP_TITLE
import logoFullIcon from '@/assets/assets-jp-logo.png';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { useSettingStore } from '@/store';

const settingStore = useSettingStore();

const toggleSettingPanel = () => {
  settingStore.updateConfig({
    showSettingPanel: true,
  });
};

// 统一补 noopener,noreferrer：即便目标是固定的 GitHub 地址，也不让新页面拿到 window.opener
const navToGitHub = () => {
  window.open('https://github.com/jfspeed/jffast', '_blank', 'noopener,noreferrer');
};

const navToHelper = () => {
  window.open('https://github.com/jfspeed/jffast/tree/main/docs', '_blank', 'noopener,noreferrer');
};
</script>
<style lang="less" scoped>
.login-header {
  padding: 0 var(--td-comp-paddingLR-xl);
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(10px);
  color: var(--td-text-color-primary);
  height: var(--td-comp-size-xxxl);

  .operations-container {
    display: flex;
    align-items: center;

    .t-button {
      margin-left: var(--td-comp-margin-l);
    }
  }

  .logo {
    height: 40px;
    width: auto;
  }
}
</style>
