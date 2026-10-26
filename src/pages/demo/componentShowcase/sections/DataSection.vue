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
  <section id="data" class="showcase-section">
    <h2 class="section-title">{{ t('pages.demo.showcase.section.data') }}</h2>

    <demo-card :title="t('pages.demo.showcase.data.cardTableTitle')" :code="tableCode">
      <t-table :data="tableData" :columns="columns" row-key="id" size="small" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.data.cardEnhancedTitle')" :code="enhancedCode">
      <t-enhanced-table :data="tableData" :columns="columns" row-key="id" :pagination="{ pageSize: 5 }" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.data.cardDescTitle')" :code="descriptionsCode">
      <t-descriptions :data="descData" :title="t('pages.demo.showcase.data.descTitle')" :column="2" bordered />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.data.cardTagTitle')" :code="tagCode">
      <t-space>
        <t-tag>{{ t('pages.demo.showcase.word.default') }}</t-tag>
        <t-tag theme="success">{{ t('pages.demo.showcase.word.success') }}</t-tag>
        <t-tag theme="warning">{{ t('pages.demo.showcase.word.warning') }}</t-tag>
        <t-tag theme="danger">{{ t('pages.demo.showcase.word.danger') }}</t-tag>
        <t-tag theme="primary" variant="light">{{ t('pages.demo.showcase.word.primary') }}</t-tag>
      </t-space>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.data.cardAlertTitle')" :code="alertCode">
      <t-space direction="vertical" style="width: 100%">
        <t-alert theme="info" :message="t('pages.demo.showcase.data.alertInfo')" />
        <t-alert theme="warning" :message="t('pages.demo.showcase.data.alertWarning')" />
        <t-alert theme="success" :message="t('pages.demo.showcase.data.alertSuccess')" />
      </t-space>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.data.cardEmptyTitle')" :code="emptyCode">
      <t-empty :description="t('pages.demo.showcase.data.empty')" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.data.cardResultTitle')" :code="resultCode">
      <t-result
        theme="success"
        :title="t('pages.demo.showcase.data.resultTitle')"
        :subtitle="t('pages.demo.showcase.data.resultSubtitle')"
        style="padding: 16px 0"
      />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.data.cardThumbnailTitle')" tag="shared" :code="thumbnailCode">
      <thumbnail :src="imgUrl" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.data.cardColorTitle')" tag="shared" :code="colorCode">
      <color-dot :value="pickColor" />
      <span style="margin-left: 12px">{{ t('pages.demo.showcase.data.currentColor', { v: pickColor }) }}</span>
    </demo-card>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import colorDot from '@/components/color/index.vue';
import thumbnail from '@/components/thumbnail/index.vue';

import DemoCard from '../DemoCard.vue';

const { t } = useI18n();

const tableCode = `<t-table :data="tableData" :columns="columns" row-key="id" />`;

const enhancedCode = `<t-enhanced-table
  :data="tableData"
  :columns="columns"
  row-key="id"
  :pagination="{ pageSize: 5 }"
/>`;

// 代码片段随语言切换
const descriptionsCode = computed(
  () => `<t-descriptions :data="descData" title="${t('pages.demo.showcase.data.descTitle')}" :column="2" bordered />`,
);

const tagCode = computed(
  () => `<t-tag>${t('pages.demo.showcase.word.default')}</t-tag>
<t-tag theme="success">${t('pages.demo.showcase.word.success')}</t-tag>
<t-tag theme="warning">${t('pages.demo.showcase.word.warning')}</t-tag>
<t-tag theme="danger">${t('pages.demo.showcase.word.danger')}</t-tag>`,
);

const alertCode = computed(
  () => `<t-alert theme="info" message="${t('pages.demo.showcase.data.alertInfo')}" />
<t-alert theme="warning" message="${t('pages.demo.showcase.data.alertWarningShort')}" />`,
);

const emptyCode = computed(() => `<t-empty description="${t('pages.demo.showcase.data.empty')}" />`);

const resultCode = computed(
  () =>
    `<t-result theme="success" title="${t('pages.demo.showcase.data.resultTitle')}" subtitle="${t('pages.demo.showcase.data.resultSubtitle')}" />`,
);

const thumbnailCode = `<thumbnail :src="imgUrl" />`;

const colorCode = `<color-dot :value="pickColor" />`;

// 示例数据（响应语言切换）
const tableData = computed(() => [
  {
    id: 1,
    name: t('pages.demo.showcase.data.user1'),
    role: t('pages.demo.showcase.data.roleAdmin'),
    status: t('common.normal'),
  },
  {
    id: 2,
    name: t('pages.demo.showcase.data.user2'),
    role: t('pages.demo.showcase.data.roleEditor'),
    status: t('common.normal'),
  },
  {
    id: 3,
    name: t('pages.demo.showcase.data.user3'),
    role: t('pages.demo.showcase.data.roleVisitor'),
    status: t('pages.demo.showcase.data.stateDisabled'),
  },
]);
const columns = computed(() => [
  { colKey: 'id', title: 'ID', width: 80 },
  { colKey: 'name', title: t('common.realName') },
  { colKey: 'role', title: t('pages.demo.showcase.data.role') },
  { colKey: 'status', title: t('common.status') },
]);
const descData = computed(() => [
  { label: t('common.realName'), content: t('pages.demo.showcase.data.user1') },
  { label: t('pages.demo.showcase.data.role'), content: t('pages.demo.showcase.data.roleAdmin') },
  { label: t('pages.demo.showcase.data.dept'), content: t('pages.demo.showcase.data.deptRd') },
  { label: t('common.email'), content: 'zhangsan@example.com' },
]);

const imgUrl = computed(
  () =>
    `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90'><rect width='120' height='90' rx='6' fill='#0052d9'/><text x='50%' y='52%' fill='#fff' font-size='14' text-anchor='middle'>${t('pages.demo.showcase.data.sampleImage')}</text></svg>`,
    )}`,
);
const pickColor = ref('#0052d9');
</script>
<style scoped>
.section-title {
  margin: 8px 0 16px;
  font-size: 20px;
}
</style>
