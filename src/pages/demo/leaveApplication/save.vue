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
    :width="600"
    destroy-on-close
    @closed="emit('closed')"
  >
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-form-item :label="t('pages.demo.leaveApplication.leaveType')" name="leaveType">
        <t-select
          v-model="form.leaveType"
          :placeholder="t('pages.demo.leaveApplication.placeholder.leaveType')"
          clearable
          :options="leaveTypeOptions"
        />
      </t-form-item>

      <t-row :gutter="[16, 0]">
        <t-col :span="12">
          <t-form-item :label="t('pages.demo.leaveApplication.startTime')" name="startTime">
            <t-date-picker
              v-model="form.startTime"
              enable-time-picker
              format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </t-form-item>
        </t-col>
        <t-col :span="12">
          <t-form-item :label="t('pages.demo.leaveApplication.endTime')" name="endTime">
            <t-date-picker v-model="form.endTime" enable-time-picker format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          </t-form-item>
        </t-col>
      </t-row>

      <t-form-item :label="t('pages.demo.leaveApplication.durationLabel')" name="duration">
        <t-input-number
          v-model="form.duration"
          :min="0.5"
          :step="0.5"
          :decimal-places="1"
          style="width: 100%"
          :placeholder="t('pages.demo.leaveApplication.placeholder.duration')"
        />
      </t-form-item>

      <t-form-item :label="t('pages.demo.leaveApplication.reason')" name="reason">
        <t-textarea
          v-model="form.reason"
          :placeholder="t('pages.demo.leaveApplication.placeholder.reason')"
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

import api from '@/api/demo';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

// 请假类型下拉（响应语言切换）
const leaveTypeOptions = computed(() => [
  { label: t('pages.demo.leaveApplication.leaveTypeMap.annual'), value: 'annual' },
  { label: t('pages.demo.leaveApplication.leaveTypeMap.sick'), value: 'sick' },
  { label: t('pages.demo.leaveApplication.leaveTypeMap.personal'), value: 'personal' },
  { label: t('pages.demo.leaveApplication.leaveTypeMap.maternity'), value: 'maternity' },
  { label: t('pages.demo.leaveApplication.leaveTypeMap.other'), value: 'other' },
]);

// 本地标题映射（响应语言切换，覆盖 useForm 内置中文 titleMap）
const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

// 本地校验规则（响应语言切换）
const rules = computed<Record<string, FormRule[]>>(() => ({
  leaveType: [{ required: true, message: t('pages.demo.leaveApplication.placeholder.leaveType'), trigger: 'change' }],
  startTime: [{ required: true, message: t('pages.demo.leaveApplication.placeholder.startTime'), trigger: 'change' }],
  endTime: [{ required: true, message: t('pages.demo.leaveApplication.placeholder.endTime'), trigger: 'change' }],
  duration: [{ required: true, message: t('pages.demo.leaveApplication.rules.duration'), trigger: 'blur' }],
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
    leaveType: '',
    startTime: '',
    endTime: '',
    duration: null,
    reason: '',
  },
});

const onSubmit = async () => {
  const res = await formSubmit(api.leaveApplication);
  if (res && res.code === 200) {
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  }
};

defineExpose({ open, setData });
</script>
