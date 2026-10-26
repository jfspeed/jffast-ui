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
  <section id="nav" class="showcase-section">
    <h2 class="section-title">{{ t('pages.demo.showcase.section.nav') }}</h2>

    <demo-card :title="t('pages.demo.showcase.navigation.cardTabsTitle')" :code="tabsCode">
      <t-tabs v-model="tab" @change="onTabChange">
        <t-tab-panel value="a" :label="t('pages.demo.showcase.navigation.tab1')">{{
          t('pages.demo.showcase.navigation.content1')
        }}</t-tab-panel>
        <t-tab-panel value="b" :label="t('pages.demo.showcase.navigation.tab2')">{{
          t('pages.demo.showcase.navigation.content2')
        }}</t-tab-panel>
        <t-tab-panel value="c" :label="t('pages.demo.showcase.navigation.tab3')">{{
          t('pages.demo.showcase.navigation.content3')
        }}</t-tab-panel>
      </t-tabs>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.navigation.cardLinkTitle')" :code="linkCode">
      <t-space>
        <t-link theme="primary" href="javascript:void(0)">{{ t('pages.demo.showcase.navigation.linkPrimary') }}</t-link>
        <t-link theme="success" href="javascript:void(0)">{{ t('pages.demo.showcase.navigation.linkSuccess') }}</t-link>
        <t-link underline href="javascript:void(0)">{{ t('pages.demo.showcase.navigation.linkUnderline') }}</t-link>
      </t-space>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.navigation.cardPaginationTitle')" :code="paginationCode">
      <t-pagination :total="100" :page-size="10" :current="page" show-jumper @current-change="onPageChange" />
    </demo-card>
  </section>
</template>
<script setup lang="ts">
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import DemoCard from '../DemoCard.vue';

const { t } = useI18n();

// 代码片段随语言切换
const tabsCode = computed(
  () => `<t-tabs v-model="tab" @change="onChange">
  <t-tab-panel value="a" label="${t('pages.demo.showcase.navigation.tab1')}">${t('pages.demo.showcase.navigation.content1')}</t-tab-panel>
  <t-tab-panel value="b" label="${t('pages.demo.showcase.navigation.tab2')}">${t('pages.demo.showcase.navigation.content2')}</t-tab-panel>
  <t-tab-panel value="c" label="${t('pages.demo.showcase.navigation.tab3')}">${t('pages.demo.showcase.navigation.content3')}</t-tab-panel>
</t-tabs>`,
);

const linkCode = computed(
  () => `<t-link theme="primary" href="javascript:void(0)">${t('pages.demo.showcase.navigation.linkPrimary')}</t-link>
<t-link theme="success">${t('pages.demo.showcase.navigation.linkSuccess')}</t-link>
<t-link underline>${t('pages.demo.showcase.navigation.linkUnderline')}</t-link>`,
);

const paginationCode = `<t-pagination :total="100" :page-size="10" :current="current" @current-change="onChange" />`;

const tab = ref('a');
const onTabChange = (val: any) => MessagePlugin.info(t('pages.demo.showcase.navigation.switchTo', { val }));
const page = ref(1);
const onPageChange = (val: number) => (page.value = val);
</script>
<style scoped>
.section-title {
  margin: 8px 0 16px;
  font-size: 20px;
}
</style>
