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
  <t-dialog
    v-model:visible="visible"
    :header="t('pages.flow.definition.diagram')"
    :width="900"
    :footer="false"
    destroy-on-close
  >
    <t-loading :loading="loading" style="width: 100%">
      <div class="diagram-wrapper">
        <img v-if="url" :src="url" :alt="t('pages.flow.definition.diagram')" class="diagram-img" />
        <t-empty v-else-if="!loading" :description="t('pages.flow.definition.noDiagram')" />
      </div>
    </t-loading>
  </t-dialog>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

defineProps<{ loading: boolean; url: string }>();

const { t } = useI18n();

const visible = defineModel<boolean>('visible', { default: false });
</script>
<style scoped lang="less">
.diagram-wrapper {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.diagram-img {
  max-width: 100%;
  height: auto;
}
</style>
