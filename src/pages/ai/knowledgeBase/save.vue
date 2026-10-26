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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="640" destroy-on-close @closed="emit('closed')">
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-form-item :label="t('pages.ai.knowledgeBase.name')" name="name">
        <t-input v-model="form.name" :placeholder="t('pages.ai.knowledgeBase.placeholder.name')" clearable />
      </t-form-item>

      <t-form-item :label="t('common.code')" name="code">
        <t-input v-model="form.code" :placeholder="t('pages.ai.knowledgeBase.placeholder.code')" clearable />
      </t-form-item>

      <t-form-item :label="t('pages.ai.knowledgeBase.embeddingModel')" name="embeddingModel">
        <t-input
          v-model="form.embeddingModel"
          :placeholder="t('pages.ai.knowledgeBase.placeholder.embeddingModel')"
          clearable
        />
      </t-form-item>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.knowledgeBase.chunkSize')" name="chunkSize">
            <t-input-number v-model="form.chunkSize" :min="1" style="width: 100%" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.ai.knowledgeBase.chunkOverlap')" name="chunkOverlap">
            <t-input-number v-model="form.chunkOverlap" :min="0" style="width: 100%" />
          </t-form-item>
        </t-col>
      </t-row>

      <t-form-item :label="t('common.status')" name="status">
        <t-switch v-model="form.status" :custom-value="[1, 0]" />
      </t-form-item>

      <t-form-item :label="t('common.description')" name="description">
        <t-textarea
          v-model="form.description"
          :placeholder="t('pages.ai.knowledgeBase.placeholder.description')"
          :autosize="{ minRows: 3 }"
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/ai';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

// 本地标题映射（响应语言切换，覆盖 useForm 内置中文 titleMap）
const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

// 本地校验规则（响应语言切换）
const rules = computed<Record<string, FormRule[]>>(() => ({
  name: [{ required: true, message: t('pages.ai.knowledgeBase.placeholder.name'), trigger: 'blur' }],
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
    name: '',
    code: '',
    description: '',
    embeddingModel: '',
    chunkSize: 500,
    chunkOverlap: 50,
    status: 1,
  },
});

const onSubmit = async () => {
  const res = await formSubmit(api.knowledgeBase);
  if (res && res.code === 200) {
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  }
};

defineExpose({ open, setData });
</script>
