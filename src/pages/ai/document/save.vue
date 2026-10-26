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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="760" destroy-on-close @closed="emit('closed')">
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.common.kb')" name="kbId">
            <t-select
              v-model="form.kbId"
              :placeholder="t('pages.ai.document.placeholder.kb')"
              clearable
              filterable
              :options="kbOptions"
              style="width: 100%"
            />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.document.title')" name="title">
            <t-input v-model="form.title" :placeholder="t('pages.ai.document.placeholder.title')" clearable />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.document.contentType')" name="contentType">
            <t-select v-model="form.contentType" :options="contentTypeOptions" style="width: 100%" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.document.sourceType')" name="sourceType">
            <t-select v-model="form.sourceType" :options="sourceTypeOptions" style="width: 100%" />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.document.sourceUrl')" name="sourceUrl">
            <t-input v-model="form.sourceUrl" :placeholder="t('pages.ai.document.placeholder.sourceUrl')" clearable />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.document.filePath')" name="filePath">
            <t-input v-model="form.filePath" :placeholder="t('pages.ai.document.placeholder.filePath')" clearable />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.document.chunkCountForm')" name="chunkCount">
            <t-input-number v-model="form.chunkCount" :min="0" style="width: 100%" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.document.tokenCount')" name="tokenCount">
            <t-input-number v-model="form.tokenCount" :min="0" style="width: 100%" />
          </t-form-item>
        </t-col>
      </t-row>

      <t-form-item :label="t('common.status')" name="status">
        <t-select v-model="form.status" :options="statusOptions" style="width: 200px" />
      </t-form-item>

      <t-form-item :label="t('pages.ai.document.content')" name="content">
        <t-textarea
          v-model="form.content"
          :placeholder="t('pages.ai.document.placeholder.content')"
          :autosize="{ minRows: 6 }"
        />
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button variant="outline" @click="visible = false">{{ t('common.dialogCancel') }}</t-button>
      <t-button v-if="mode !== 'show'" theme="primary" :loading="isSaving" @click="onSubmit">{{
        t('common.dialogSave')
      }}</t-button>
    </template>
  </t-dialog>
</template>
<script lang="ts" setup>
import type { FormRule } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import type { PropType } from 'vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/ai';
import { useForm } from '@/hooks/useForm';

defineProps({
  kbOptions: {
    type: Array as PropType<{ label: string; value: any }[]>,
    default: () => [],
  },
});

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

// 本地下拉选项（响应语言切换）
const contentTypeOptions = computed(() => [
  { label: t('pages.ai.document.contentTypeMap.text'), value: 'text' },
  { label: t('pages.ai.document.contentTypeMap.markdown'), value: 'markdown' },
  { label: t('pages.ai.document.contentTypeMap.html'), value: 'html' },
  { label: t('pages.ai.document.contentTypeMap.pdf'), value: 'pdf' },
]);

const sourceTypeOptions = computed(() => [
  { label: t('pages.ai.document.sourceTypeMap.manual'), value: 'manual' },
  { label: t('pages.ai.document.sourceTypeMap.file'), value: 'file' },
  { label: t('pages.ai.document.sourceTypeMap.url'), value: 'url' },
  { label: t('pages.ai.document.sourceTypeMap.api'), value: 'api' },
]);

const statusOptions = computed(() => [
  { label: t('pages.ai.common.statusMap.pending'), value: 0 },
  { label: t('pages.ai.common.statusMap.processed'), value: 1 },
  { label: t('pages.ai.common.statusMap.failed'), value: 2 },
]);

// 本地标题映射（响应语言切换，覆盖 useForm 内置中文 titleMap）
const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

// 本地校验规则（响应语言切换）
const rules = computed<Record<string, FormRule[]>>(() => ({
  title: [{ required: true, message: t('pages.ai.document.placeholder.title'), trigger: 'blur' }],
}));

const {
  visible,
  mode,
  isSaving,
  formRef: dialogForm,
  form,
  open,
  setData,
  submit: formSubmit,
} = useForm({
  defaultForm: {
    id: '',
    kbId: '',
    title: '',
    content: '',
    contentType: 'text',
    sourceType: 'manual',
    sourceUrl: '',
    filePath: '',
    chunkCount: 0,
    tokenCount: 0,
    status: 0,
  },
});

const onSubmit = async () => {
  const res = await formSubmit(api.document);
  if (res && res.code === 200) {
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  }
};

defineExpose({ open, setData });
</script>
