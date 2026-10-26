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
    :visible="visible"
    :header="t('pages.system.codegen.saveDialog.title')"
    :confirm-btn="{ content: t('pages.system.codegen.saveDialog.confirmBtn'), loading }"
    width="640px"
    @update:visible="(v: boolean) => emit('update:visible', v)"
    @confirm="emit('confirm')"
  >
    <t-alert v-if="!moduleName" theme="warning" style="margin-bottom: 12px">
      {{ t('pages.system.codegen.saveDialog.noModuleTip') }}
    </t-alert>
    <t-alert v-else theme="success" style="margin-bottom: 12px">
      {{ t('pages.system.codegen.saveDialog.saveToModule') }}<strong>{{ moduleName }}</strong>
    </t-alert>

    <div class="file-checkbox-list">
      <t-checkbox :checked="allSelected" @change="(checked: boolean) => emit('toggle-all', checked)">
        {{ t('pages.system.codegen.saveDialog.selectAll') }}
      </t-checkbox>
      <div v-for="item in fileItems" :key="item.key" class="file-checkbox-item">
        <t-checkbox
          :value="item.key"
          :disabled="item.disabled"
          :checked="selectedFiles.includes(item.key)"
          @change="(checked: boolean) => emit('toggle-item', item.key, checked)"
        >
          {{ item.label }}
        </t-checkbox>
        <span :class="item.disabled ? 'file-path-exists' : item.exists ? 'file-path-append' : 'file-path-new'">
          {{ item.path }}
          <template v-if="item.disabled">{{ t('pages.system.codegen.saveDialog.mark.included') }}</template>
          <template v-else-if="item.exists && (item.key === 'frontendApi' || item.key === 'frontendRouter')">{{
            t('pages.system.codegen.saveDialog.mark.append')
          }}</template>
          <template v-else-if="item.exists">{{ t('pages.system.codegen.saveDialog.mark.overwrite') }}</template>
        </span>
      </div>
    </div>
  </t-dialog>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

defineProps<{
  visible: boolean;
  loading: boolean;
  moduleName: string;
  fileItems: Array<{
    key: string;
    label: string;
    path: string;
    exists: boolean;
    contentExists: boolean;
    disabled: boolean;
  }>;
  selectedFiles: string[];
  allSelected: boolean;
}>();

const emit = defineEmits<{
  'update:visible': [v: boolean];
  confirm: [];
  'toggle-all': [checked: boolean];
  'toggle-item': [key: string, checked: boolean];
}>();

const { t } = useI18n();
</script>
<style scoped lang="less">
.file-checkbox-list {
  .file-checkbox-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
}

.file-path-new {
  color: #2ba471;
  font-size: 12px;
}

.file-path-append {
  color: #0052d9;
  font-size: 12px;
}

.file-path-exists {
  color: #e37318;
  font-size: 12px;
}
</style>
