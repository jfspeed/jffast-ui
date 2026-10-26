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
  <t-dropdown trigger="click">
    <t-button theme="default" shape="square" variant="text">
      <translate-icon />
    </t-button>
    <t-dropdown-menu>
      <t-dropdown-item
        v-for="(lang, index) in languageList"
        :key="index"
        :value="lang.value"
        @click="(options: any) => changeLang(options.value as string)"
        >{{ lang.content }}</t-dropdown-item
      ></t-dropdown-menu
    >
  </t-dropdown>
</template>
<script setup lang="ts">
import { TranslateIcon } from 'tdesign-icons-vue-next';

import { languageList } from '@/locales';
import { useLocale } from '@/locales/useLocale';

const { changeLocale } = useLocale();

const changeLang = (lang: string) => {
  changeLocale(lang);
};
</script>
