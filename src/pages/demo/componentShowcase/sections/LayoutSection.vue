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
  <section id="layout" class="showcase-section">
    <h2 class="section-title">{{ t('pages.demo.showcase.section.layout') }}</h2>

    <demo-card
      :title="t('pages.demo.showcase.layout.cardGridTitle')"
      :tag="t('pages.demo.showcase.layout.cardGridTag')"
      :code="codeRowCol"
    >
      <t-row :gutter="[16, 16]">
        <t-col :span="8"><div class="grid-box">span=8</div></t-col>
        <t-col :span="8"><div class="grid-box">span=8</div></t-col>
        <t-col :span="8"><div class="grid-box">span=8</div></t-col>
      </t-row>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.layout.cardCardTitle')" :code="codeCard">
      <t-card :title="t('pages.demo.showcase.layout.basicCard')" :bordered="true" style="max-width: 360px">
        <p>{{ t('pages.demo.showcase.layout.cardDesc') }}</p>
      </t-card>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.layout.cardSpaceTitle')" :code="codeSpace">
      <t-space>
        <t-button>{{ t('pages.demo.showcase.layout.button1') }}</t-button>
        <t-button theme="primary">{{ t('pages.demo.showcase.layout.button2') }}</t-button>
        <t-button theme="success">{{ t('pages.demo.showcase.layout.button3') }}</t-button>
      </t-space>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.layout.cardDividerTitle')" :code="codeDivider">
      <t-divider>{{ t('pages.demo.showcase.layout.dividerCenter') }}</t-divider>
      <t-divider align="left">{{ t('pages.demo.showcase.layout.dividerLeft') }}</t-divider>
    </demo-card>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import DemoCard from '../DemoCard.vue';

const { t } = useI18n();

const codeRowCol = `<t-row :gutter="[16, 16]">
  <t-col :span="8"><div class="box">span=8</div></t-col>
  <t-col :span="8"><div class="box">span=8</div></t-col>
  <t-col :span="8"><div class="box">span=8</div></t-col>
</t-row>`;

// 代码片段随语言切换
const codeCard = computed(
  () => `<t-card title="${t('pages.demo.showcase.layout.basicCard')}" :bordered="true">
  <p>${t('pages.demo.showcase.layout.cardDescShort')}</p>
</t-card>`,
);

const codeSpace = computed(
  () => `<t-space>
  <t-button>${t('pages.demo.showcase.layout.button1')}</t-button>
  <t-button theme="primary">${t('pages.demo.showcase.layout.button2')}</t-button>
  <t-button theme="success">${t('pages.demo.showcase.layout.button3')}</t-button>
</t-space>`,
);

const codeDivider = computed(
  () => `<t-divider>${t('pages.demo.showcase.layout.dividerCenter')}</t-divider>
<t-divider align="left">${t('pages.demo.showcase.layout.dividerLeft')}</t-divider>`,
);
</script>
<style scoped>
.section-title {
  margin: 8px 0 16px;
  font-size: 20px;
}
.grid-box {
  background: var(--td-brand-color-light, #e0eaff);
  border: 1px solid var(--td-brand-color, #0052d9);
  border-radius: 4px;
  text-align: center;
  padding: 16px 0;
  color: var(--td-brand-color, #0052d9);
}
</style>
