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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="500" destroy-on-close @closed="emit('closed')">
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-form-item :label="t('pages.system.dict.dictName')" name="name">
        <t-input
          v-model="form.name"
          :placeholder="t('pages.system.dict.placeholder.name')"
          clearable
          @blur="onNameBlur"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.dict.dictCode')" name="code">
        <t-input v-model="form.code" :placeholder="t('pages.system.dict.placeholder.code')" clearable />
      </t-form-item>
      <t-form-item v-if="form.isType === 2" :label="t('pages.system.dict.dictValue')" name="value">
        <t-input v-model="form.value" :placeholder="t('pages.system.dict.placeholder.value')" clearable />
      </t-form-item>
      <t-form-item :label="t('common.sort')" name="sort">
        <t-input-number v-model="form.sort" :min="0" style="width: 100%" />
      </t-form-item>
      <t-form-item :label="t('common.remark')" name="remark">
        <t-textarea
          v-model="form.remark"
          :placeholder="t('pages.system.dict.placeholder.remark')"
          :autosize="{ minRows: 2 }"
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

import api from '@/api/system';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

const rules = computed<Record<string, FormRule[]>>(() => ({
  name: [{ required: true, message: t('pages.system.dict.placeholder.name'), trigger: 'blur' }],
  code: [{ required: true, message: t('pages.system.dict.placeholder.code'), trigger: 'blur' }],
}));

const {
  visible,
  mode,
  isSaving,
  formRef: dialogForm,
  form,
  open,
  setData,
  submit: _formSubmit,
} = useForm({
  defaultForm: {
    id: '',
    parentId: 0,
    name: '',
    code: '',
    value: '',
    sort: 0,
    isType: 2,
    remark: '',
  },
});

const setIsType = (isType: number) => {
  form.isType = isType;
};

const setParentId = (parentId: unknown) => {
  form.parentId = parentId as number;
};

const onNameBlur = async () => {
  if (form.name && !form.code) {
    const res = await api.dict.createDictCode(form.name);
    // 二次确认：blur 触发到响应返回之间存在窗口，用户可能已手输编码；
    // 无条件回填会静默覆盖用户输入（浏览器实测回归：提交被后端「编码已存在」拒绝）
    if (res?.data && !form.code) {
      form.code = res.data;
    }
  }
};

const onSubmit = async () => {
  let valid;
  try {
    valid = await (dialogForm.value as { validate: () => Promise<boolean> } | null)?.validate();
  } catch {
    valid = false;
  }
  if (valid !== true) return;

  const submitData = { ...form };
  if (submitData.id === '' || submitData.id === undefined || submitData.id === null) {
    delete submitData.id;
  }

  isSaving.value = true;
  try {
    const res = mode.value === 'add' ? await api.dict.create(submitData) : await api.dict.update(submitData);
    if (res && res.code === 200) {
      MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
      visible.value = false;
      emit('success', form, mode.value);
    }
  } finally {
    isSaving.value = false;
  }
};

defineExpose({ open, setData, setIsType, setParentId });
</script>
