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
    :header="titleMap[mode as keyof typeof titleMap]"
    :width="640"
    destroy-on-close
    @closed="emit('closed')"
  >
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-form-item :label="t('common.title')" name="title">
        <t-input v-model="form.title" :placeholder="t('pages.demo.common.placeholder.title')" clearable />
      </t-form-item>
      <t-form-item :label="t('common.status')" name="status">
        <t-switch v-model="form.status" :custom-value="[1, 0]" />
      </t-form-item>
      <t-form-item :label="t('common.remark')" name="remark">
        <t-input v-model="form.remark" :placeholder="t('pages.demo.common.placeholder.remark')" clearable />
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button theme="default" @click="visible = false">{{ t('common.cancel') }}</t-button>
      <t-button v-if="mode !== 'show'" theme="primary" :loading="isSaving" @click="onSubmit">{{
        t('common.confirm')
      }}</t-button>
    </template>
  </t-dialog>
</template>
<script lang="ts" setup>
import type { FormRule } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/demo';
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
  title: [{ required: true, message: t('pages.demo.common.placeholder.title'), trigger: 'blur' }],
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
    title: '',
    status: 1,
    remark: '',
  },
});

const onSubmit = async () => {
  const res = await formSubmit(api.demoTenantExample);
  if (res && res.code === 200) {
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  }
};

defineExpose({ open, setData });
</script>
