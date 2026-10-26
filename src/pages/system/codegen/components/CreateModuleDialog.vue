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
    :header="t('pages.system.codegen.createDialog.title')"
    :confirm-btn="{ content: t('pages.system.codegen.createDialog.confirmBtn'), loading }"
    width="520px"
    @update:visible="(v: boolean) => emit('update:visible', v)"
    @confirm="emit('confirm')"
  >
    <t-alert theme="warning" style="margin-bottom: 16px">
      <template #message>{{ t('pages.system.codegen.createDialog.warnTip') }}</template>
    </t-alert>

    <t-form label-width="100px">
      <t-form-item :label="t('pages.system.codegen.createDialog.projectType')">
        <t-tag theme="primary" variant="light">{{ projectTypeLabel }}</t-tag>
      </t-form-item>
      <t-form-item :label="t('pages.system.codegen.createDialog.moduleName')">
        <t-input v-model="moduleName" :placeholder="t('pages.system.codegen.createDialog.placeholder.moduleName')" />
      </t-form-item>
      <t-form-item :label="t('pages.system.codegen.createDialog.fullModuleName')">
        <t-tag theme="success" variant="light">{{ fullModuleName }}</t-tag>
      </t-form-item>
      <t-form-item :label="t('pages.system.codegen.createDialog.savePath')">
        <code class="module-path-preview">{{ modulePath }}</code>
      </t-form-item>
      <t-form-item :label="t('pages.system.codegen.createDialog.filesToCreate')">
        <ul class="module-files-list">
          <li>{{ t('pages.system.codegen.createDialog.fileItem1') }}</li>
          <li>{{ t('pages.system.codegen.createDialog.fileItem2') }}</li>
          <li>{{ t('pages.system.codegen.createDialog.fileItem3') }}</li>
        </ul>
      </t-form-item>
    </t-form>
  </t-dialog>
</template>
<script lang="ts" setup>
import { useI18n } from 'vue-i18n';

defineProps<{
  visible: boolean;
  loading: boolean;
  projectTypeLabel: string;
  fullModuleName: string;
  modulePath: string;
}>();

const emit = defineEmits<{
  'update:visible': [v: boolean];
  confirm: [];
}>();

const { t } = useI18n();

const moduleName = defineModel<string>('moduleName', { default: '' });
</script>
<style scoped lang="less">
.module-path-preview {
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  word-break: break-all;
}

.module-files-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #666;
  line-height: 1.8;
}
</style>
