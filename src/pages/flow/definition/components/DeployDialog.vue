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
    :header="t('pages.flow.definition.deployDialog.title')"
    :width="720"
    destroy-on-close
    :confirm-btn="{ content: t('pages.flow.common.deploy'), loading: saving, onClick: handleDeploy }"
  >
    <t-form :data="form" label-width="100px">
      <t-form-item :label="t('pages.flow.common.deployName')" name="name">
        <t-input v-model="form.name" :placeholder="t('pages.flow.definition.placeholder.deployName')" />
      </t-form-item>
      <t-form-item :label="t('pages.flow.common.category')" name="category">
        <t-select v-model="form.category" :placeholder="t('pages.flow.common.placeholder.categorySelect')" clearable>
          <t-option
            v-for="c in categoryOptions"
            :key="c.categoryCode"
            :value="c.categoryCode"
            :label="c.categoryName"
          />
        </t-select>
      </t-form-item>
      <t-form-item :label="t('pages.flow.common.resourceName')" name="resourceName">
        <t-input v-model="form.resourceName" :placeholder="t('pages.flow.common.placeholder.resourceName')" />
      </t-form-item>
      <t-form-item label="BPMN XML" name="bpmnXml">
        <div style="display: flex; gap: 8px; width: 100%">
          <t-upload
            :auto-upload="false"
            :show-upload-progress="false"
            :max="1"
            accept=".xml,.bpmn,.bpmn20.xml"
            @change="handleFileSelect"
          >
            <t-button variant="outline">{{ t('pages.flow.definition.selectFile') }}</t-button>
          </t-upload>
          <t-textarea
            v-model="form.bpmnXml"
            :autosize="{ minRows: 8, maxRows: 16 }"
            :placeholder="t('pages.flow.definition.placeholder.bpmnXml')"
            style="flex: 1"
          />
        </div>
      </t-form-item>
    </t-form>
  </t-dialog>
</template>
<script lang="ts" setup>
import { MessagePlugin } from 'tdesign-vue-next';
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { process } from '@/api/flow';

defineProps<{ categoryOptions: { categoryCode: string; categoryName: string }[] }>();

const emit = defineEmits<{ success: [] }>();

const { t } = useI18n();

const visible = defineModel<boolean>('visible', { default: false });
const saving = ref(false);
const form = reactive({
  name: '',
  category: '',
  resourceName: '',
  bpmnXml: '',
});

const BPMN_EXT_RE = /\.(bpmn20\.xml|bpmn|xml)$/i;

const open = () => {
  form.name = '';
  form.category = '';
  form.resourceName = '';
  form.bpmnXml = '';
  visible.value = true;
};

const handleFileSelect = (files: any) => {
  // TDesign Upload 的 onChange 首参是**数组**（不是 { files } 对象），且 Upload 没有 select 事件。
  const file = (Array.isArray(files) ? files[0] : files)?.raw as File | undefined;
  if (!file) return;
  if (!form.resourceName) {
    form.resourceName = file.name;
  }
  if (!form.name) {
    form.name = file.name.replace(BPMN_EXT_RE, '');
  }
  const reader = new FileReader();
  reader.onload = () => {
    form.bpmnXml = String(reader.result || '');
  };
  reader.readAsText(file);
};

const handleDeploy = async () => {
  if (!form.bpmnXml) {
    MessagePlugin.warning(t('pages.flow.definition.message.needBpmnXml'));
    return;
  }
  saving.value = true;
  try {
    const res = await process.deploy({
      name: form.name || undefined,
      category: form.category || undefined,
      resourceName: form.resourceName || 'process.bpmn20.xml',
      bpmnXml: form.bpmnXml,
    });
    if (res && res.code === 200) {
      MessagePlugin.success(t('pages.flow.common.message.deploySuccess'));
      visible.value = false;
      emit('success');
    }
  } finally {
    saving.value = false;
  }
};

defineExpose({ open });
</script>
