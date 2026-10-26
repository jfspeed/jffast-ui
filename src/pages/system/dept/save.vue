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
      <t-form-item :label="t('pages.system.dept.parent')" name="parentId">
        <t-tree-select
          v-model="form.parentId"
          :data="deptTreeOptions"
          :tree-props="{ keys: { label: 'deptName', value: 'id', children: 'children' } }"
          :placeholder="t('pages.system.dept.placeholder.parent')"
          clearable
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.dept.deptName')" name="deptName">
        <t-input v-model="form.deptName" :placeholder="t('pages.system.dept.placeholder.deptName')" clearable />
      </t-form-item>
      <t-form-item :label="t('common.remark')" name="remark">
        <t-input v-model="form.remark" :placeholder="t('common.pleaseInput')" clearable />
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
import type { FormRule, TreeOptionData } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

const deptList = ref<TreeOptionData[]>([]);

const deptTreeOptions = computed(() => [{ id: 0, deptName: t('common.root'), children: deptList.value }]);

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

const rules = computed<Record<string, FormRule[]>>(() => ({
  deptName: [{ required: true, message: t('pages.system.dept.placeholder.deptName'), trigger: 'blur' }],
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
    deptName: '',
    level: 1,
    remark: '',
  },
});

const loadDeptTree = async () => {
  const res = await api.dept.page({});
  const list = res?.data || [];
  deptList.value = list;
};

const setParentId = (parentId: number | string) => {
  form.parentId = parentId as number;
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
    const res = mode.value === 'add' ? await api.dept.create(submitData) : await api.dept.update(submitData);
    if (res && res.code === 200) {
      MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
      visible.value = false;
      emit('success', form, mode.value);
    }
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  loadDeptTree();
});

defineExpose({ open, setData, setParentId });
</script>
