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
  <div v-if="generatedCode" class="preview-section">
    <div class="preview-header">
      <div class="preview-header-actions">
        <t-tag v-if="generatedCode.genType === 'tree'" theme="primary" variant="light" size="small">
          {{ t('pages.system.codegen.preview.treeMode') }}
        </t-tag>
        <t-tag v-if="moduleName" theme="success" variant="light" size="small">
          {{ t('pages.system.codegen.preview.saveTo') }}{{ moduleName }}
        </t-tag>
        <t-button v-if="isLocal" theme="warning" :loading="saveLoading" @click="emit('save-local')">
          {{ t('pages.system.codegen.preview.saveLocal') }}
        </t-button>
      </div>
    </div>

    <t-tabs :value="activeTab" @change="emit('update:active-tab', $event)">
      <t-tab-panel v-for="(label, key) in visibleCodeTypes" :key="key" :value="key" :label="label">
        <div class="code-actions">
          <t-button size="small" theme="primary" @click="handleCopy">
            {{ t('pages.system.codegen.preview.copyCode') }}
          </t-button>
          <t-button size="small" @click="handleDownload">
            {{ t('pages.system.codegen.preview.downloadFile') }}
          </t-button>
        </div>
        <t-textarea :value="generatedCode[key] || ''" readonly autosize class="code-preview" />
      </t-tab-panel>

      <t-tab-panel value="hints" :label="t('pages.system.codegen.preview.manualTab')">
        <t-alert theme="warning" style="margin-bottom: 16px">
          <template #message>{{ t('pages.system.codegen.preview.manualTip') }}</template>
        </t-alert>

        <t-collapse :default-value="['menu']">
          <t-collapse-panel value="menu" :header="t('pages.system.codegen.preview.menuSqlTitle')">
            <p class="hint-desc">
              {{ t('pages.system.codegen.preview.hintSql1') }}<code>parent_id</code
              >{{ t('pages.system.codegen.preview.hintSql2') }}<code>sort</code
              >{{ t('pages.system.codegen.preview.hintSql3') }}
            </p>
            <t-textarea :value="generatedCode.menuSql || ''" readonly autosize class="code-preview" />
          </t-collapse-panel>
        </t-collapse>
      </t-tab-panel>
    </t-tabs>
  </div>
  <t-empty v-else :description="t('pages.system.codegen.preview.empty')" />
</template>
<script lang="ts" setup>
import { MessagePlugin } from 'tdesign-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  generatedCode: Record<string, any> | null;
  moduleName: string;
  isLocal: boolean;
  saveLoading: boolean;
  activeTab: string;
  tableName: string;
}>();
const emit = defineEmits<{
  'update:active-tab': [tab: any];
  'save-local': [];
}>();

const { t } = useI18n();

// 代码类型标签随语言切换更新
const allCodeTypeLabels = computed<Record<string, string>>(() => ({
  entity: t('pages.system.codegen.codeLabel.entity'),
  mapper: t('pages.system.codegen.codeLabel.mapper'),
  service: t('pages.system.codegen.codeLabel.service'),
  controller: t('pages.system.codegen.codeLabel.controller'),
  frontendApi: t('pages.system.codegen.codeLabel.frontendApi'),
  frontendIndexPage: t('pages.system.codegen.codeLabel.frontendIndexPage'),
  frontendSavePage: t('pages.system.codegen.codeLabel.frontendSavePage'),
  frontendRouter: t('pages.system.codegen.codeLabel.frontendRouter'),
  dtoRequest: t('pages.system.codegen.codeLabel.dtoRequest'),
  dtoQueryRequest: t('pages.system.codegen.codeLabel.dtoQueryRequest'),
}));

const treeCodeTypeLabels = computed<Record<string, string>>(() => ({
  ...allCodeTypeLabels.value,
  frontendIndexPage: t('pages.system.codegen.codeLabel.treeFrontendIndexPage'),
  frontendSavePage: t('pages.system.codegen.codeLabel.treeFrontendSavePage'),
}));

const visibleCodeTypes = computed(() => {
  const result: Record<string, any> = {};
  if (!props.generatedCode) return result;
  const labels = props.generatedCode.genType === 'tree' ? treeCodeTypeLabels.value : allCodeTypeLabels.value;
  for (const [key, label] of Object.entries(labels)) {
    if (props.generatedCode[key] != null) {
      result[key] = label;
    }
  }
  return result;
});

function getCurrentCode() {
  if (!props.generatedCode) return '';
  return props.generatedCode[props.activeTab] || '';
}

function handleCopy() {
  const code = getCurrentCode();
  if (!code) return;
  navigator.clipboard
    .writeText(code)
    .then(() => {
      MessagePlugin.success(t('pages.system.codegen.preview.message.copied'));
    })
    .catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      MessagePlugin.success(t('pages.system.codegen.preview.message.copied'));
    });
}

function handleDownload() {
  const code = getCurrentCode();
  if (!code) return;

  const fileName = getFileName();
  const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  MessagePlugin.success(t('pages.system.codegen.preview.message.downloadSuccess'));
}

function getFileName() {
  if (!props.generatedCode || !props.tableName) return 'code.txt';

  const className = props.tableName
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  const extMap: Record<string, string> = {
    entity: '.java',
    mapper: '.java',
    service: '.java',
    controller: '.java',
    dtoRequest: '.java',
    dtoQueryRequest: '.java',
    frontendApi: '.js',
    frontendIndexPage: '.vue',
    frontendSavePage: '.vue',
    frontendRouter: '.txt',
  };

  const suffixMap: Record<string, string> = {
    entity: '',
    mapper: 'Mapper',
    service: 'Service',
    controller: 'Controller',
    dtoRequest: 'Request',
    dtoQueryRequest: 'QueryRequest',
    frontendApi: '',
    frontendIndexPage: '.index',
    frontendSavePage: '.save',
    frontendRouter: '.router',
  };

  const ext = extMap[props.activeTab] || '.txt';
  const suffix = suffixMap[props.activeTab] || '';
  return `${className}${suffix}${ext}`;
}
</script>
<style scoped lang="less">
.preview-section {
  padding: 8px 0;
}

.preview-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 12px;
}

.preview-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.code-preview {
  :deep(textarea) {
    font-family: Consolas, Monaco, 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    background-color: #1e1e1e;
    color: #d4d4d4;
    min-height: 400px;
  }
}

.hint-desc {
  margin-bottom: 8px;
  color: #666;
  font-size: 13px;

  code {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
  }
}
</style>
