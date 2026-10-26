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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="560" destroy-on-close @closed="emit('closed')">
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-form-item :label="t('pages.flow.category.categoryCode')" name="categoryCode">
        <t-input
          v-model="form.categoryCode"
          :placeholder="t('pages.flow.category.placeholder.code')"
          clearable
          :disabled="mode === 'edit'"
        />
      </t-form-item>
      <t-form-item :label="t('pages.flow.category.categoryName')" name="categoryName">
        <t-input
          v-model="form.categoryName"
          :placeholder="t('pages.flow.category.placeholder.categoryName')"
          clearable
        />
      </t-form-item>
      <t-form-item :label="t('common.sort')" name="sort">
        <t-input-number v-model="form.sort" :min="0" :max="9999" theme="normal" />
      </t-form-item>
      <t-form-item :label="t('common.status')" name="status">
        <t-switch
          v-model="form.status"
          :custom-value="[0, 1]"
          :label="[t('pages.flow.common.statusMap.enabled'), t('pages.flow.common.statusMap.disabled')]"
        />
      </t-form-item>
      <t-form-item :label="t('common.remark')" name="remark">
        <t-textarea
          v-model="form.remark"
          :autosize="{ minRows: 2, maxRows: 4 }"
          :placeholder="t('pages.flow.category.placeholder.remark')"
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

import { category } from '@/api/flow';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

const CODE_PATTERN = /^[a-z][\w-]{0,49}$/i;

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
    categoryCode: '',
    categoryName: '',
    sort: 1,
    status: 0,
    remark: '',
  },
});

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

const rules = computed<Record<string, FormRule[]>>(() => ({
  categoryCode: [
    { required: true, message: t('pages.flow.category.placeholder.categoryCode'), trigger: 'blur' },
    {
      pattern: CODE_PATTERN,
      message: t('pages.flow.category.rules.codePattern'),
      trigger: 'blur',
    },
  ],
  categoryName: [{ required: true, message: t('pages.flow.category.placeholder.categoryName'), trigger: 'blur' }],
}));

const onSubmit = async () => {
  const res = await formSubmit(mode.value === 'add' ? category.create : category.update);
  if (res && res.code === 200) {
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  }
};

defineExpose({ open, setData });
</script>
