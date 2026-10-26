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
  <t-card class="demo-card" :bordered="true" size="small">
    <template #title>
      <span class="demo-card__title">{{ title }}</span>
      <t-tag v-if="tag" size="small" theme="primary" variant="light" class="demo-card__tag">{{ tag }}</t-tag>
    </template>
    <div class="demo-card__preview">
      <slot />
    </div>
    <t-collapse :default-expand-all="false" class="demo-card__code">
      <t-collapse-panel :header="t('pages.demo.showcase.viewCode')">
        <code-block :code="code" lang="vue" />
      </t-collapse-panel>
    </t-collapse>
  </t-card>
</template>
<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import CodeBlock from './CodeBlock.vue';

defineProps<{
  title: string;
  code: string;
  tag?: string;
}>();

const { t } = useI18n();
</script>
<style scoped>
.demo-card {
  margin-bottom: 16px;
}
.demo-card__title {
  font-weight: 600;
  font-size: 15px;
}
.demo-card__tag {
  margin-left: 8px;
}
.demo-card__preview {
  padding: 16px 4px;
  min-height: 40px;
}
.demo-card__code {
  margin-top: 8px;
}
</style>
