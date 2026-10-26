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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="600" destroy-on-close @closed="emit('closed')">
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="110px" :disabled="mode === 'show'">
      <t-form-item :label="t('pages.system.job.jobName')" name="jobName">
        <t-input v-model="form.jobName" :placeholder="t('pages.system.job.placeholder.jobNameExample')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.job.jobGroup')" name="jobGroup">
        <t-input v-model="form.jobGroup" :placeholder="t('pages.system.job.placeholder.jobGroup')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.job.invokeTarget')" name="invokeTarget">
        <div style="width: 100%">
          <t-select
            v-model="selectedTarget"
            :placeholder="t('pages.system.job.placeholder.targetSelect')"
            filterable
            clearable
            :loading="targetsLoading"
            style="margin-bottom: 8px"
            @change="onTargetSelect"
          >
            <t-option
              v-for="item in targetOptions"
              :key="item.invokeTarget"
              :value="item.invokeTarget"
              :label="`${item.name}（${item.invokeTarget}）`"
            />
          </t-select>
          <div v-if="currentParamNames.length > 0" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px">
            <t-input
              v-for="(paramName, idx) in currentParamNames"
              :key="paramName"
              v-model="paramValues[idx]"
              :placeholder="t('pages.system.job.placeholder.param', { name: paramName })"
              :label="paramName"
              style="flex: 1; min-width: 120px"
              @input="composeInvokeTarget"
            />
          </div>
          <t-input
            v-model="form.invokeTarget"
            :placeholder="t('pages.system.job.placeholder.invokeTarget')"
            clearable
            @change="onInvokeTargetManualChange"
          />
          <div style="color: var(--td-text-color-secondary); font-size: 12px; margin-top: 4px">
            {{ t('pages.system.job.tips.invokeTargetFormat') }}
          </div>
        </div>
      </t-form-item>
      <t-form-item :label="t('pages.system.job.serviceName')" name="serviceName">
        <t-input v-model="form.serviceName" :placeholder="t('pages.system.job.placeholder.serviceName')" clearable />
        <!-- 提示文案由本地 i18n 静态拼接（含 <b>/<code>），无用户输入，v-html 安全 -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          style="color: var(--td-text-color-secondary); font-size: 12px; margin-top: 4px"
          v-html="serviceNameTipHtml"
        />
        <!-- eslint-enable vue/no-v-html -->
      </t-form-item>
      <t-form-item :label="t('pages.system.job.cronExpression')" name="cronExpression">
        <t-input
          v-model="form.cronExpression"
          :placeholder="t('pages.system.job.placeholder.cron')"
          clearable
          @blur="onCronBlur"
        />
        <div
          v-if="cronTip"
          style="font-size: 12px; margin-top: 4px"
          :style="{ color: cronValid ? 'var(--td-success-color)' : 'var(--td-error-color)' }"
        >
          {{ cronTip }}
        </div>
        <div v-else style="color: var(--td-text-color-secondary); font-size: 12px; margin-top: 4px">
          {{ t('pages.system.job.tips.cronExamples') }}
        </div>
      </t-form-item>
      <t-form-item :label="t('pages.system.job.misfirePolicy')" name="misfirePolicy">
        <t-radio-group v-model="form.misfirePolicy">
          <t-radio value="1">{{ t('pages.system.job.misfireMap.immediate') }}</t-radio>
          <t-radio value="2">{{ t('pages.system.job.misfireMap.abandon') }}</t-radio>
          <t-radio value="3">{{ t('pages.system.job.misfireMap.next') }}</t-radio>
        </t-radio-group>
      </t-form-item>
      <t-form-item :label="t('pages.system.job.concurrent')" name="concurrent">
        <t-radio-group v-model="form.concurrent">
          <t-radio :value="0">{{ t('common.no') }}</t-radio>
          <t-radio :value="1">{{ t('common.yes') }}</t-radio>
        </t-radio-group>
      </t-form-item>
      <t-form-item :label="t('common.status')" name="status">
        <t-radio-group v-model="form.status">
          <t-radio :value="1">{{ t('common.normal') }}</t-radio>
          <t-radio :value="0">{{ t('pages.system.job.paused') }}</t-radio>
        </t-radio-group>
      </t-form-item>
      <t-form-item :label="t('common.remark')" name="remark">
        <t-textarea
          v-model="form.remark"
          :placeholder="t('pages.system.job.placeholder.remark')"
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
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { job } from '@/api/job';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

// 执行服务名合法性正则（模块级常量，避免重复编译）
const SERVICE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

const cronTip = ref('');
const cronValid = ref(false);
const targetsLoading = ref(false);
const targetOptions = ref<
  { name: string; invokeTarget: string; beanName: string; methodName: string; paramNames?: string[] }[]
>([]);
const selectedTarget = ref('');
const currentParamNames = ref<string[]>([]);
const paramValues = ref<string[]>([]);

// 执行服务提示含 <b>/<code> 内联片段，按段拼接保证加粗位置与原文一致
const serviceNameTipHtml = computed(
  () =>
    `${t('pages.system.job.tips.serviceName1')}<b>${t('pages.system.job.tips.serviceName2')}</b>${t(
      'pages.system.job.tips.serviceName3',
    )}<code>No bean named 'xxx' available</code>${t('pages.system.job.tips.serviceName4')}`,
);

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

const rules = computed<Record<string, FormRule[]>>(() => ({
  jobName: [{ required: true, message: t('pages.system.job.placeholder.jobName'), trigger: 'blur' }],
  invokeTarget: [{ required: true, message: t('pages.system.job.placeholder.invokeTargetRequired'), trigger: 'blur' }],
  cronExpression: [{ required: true, message: t('pages.system.job.placeholder.cronRequired'), trigger: 'blur' }],
  // 执行服务 = spring.application.name（留空 = 归属本服务）。填了就必须是合法服务名：
  // 写错的话任务会被"一个不存在的服务"认领 ⇒ 永远没人执行（或执行时 NoSuchBeanDefinition）。
  serviceName: [
    {
      pattern: SERVICE_NAME_PATTERN,
      message: t('pages.system.job.message.serviceNamePattern'),
      trigger: 'blur',
    },
  ],
}));

const loadTargets = async () => {
  targetsLoading.value = true;
  try {
    const res = await job.targets();
    if (res?.code === 200 && res.data) {
      targetOptions.value = res.data;
    }
  } catch {
    // ignore
  } finally {
    targetsLoading.value = false;
  }
};

const onTargetSelect = (val: any) => {
  if (!val) {
    currentParamNames.value = [];
    paramValues.value = [];
    form.invokeTarget = '';
    return;
  }
  const target = targetOptions.value.find((t) => t.invokeTarget === val);
  if (!target) return;

  if (target.paramNames && target.paramNames.length > 0) {
    currentParamNames.value = target.paramNames;
    paramValues.value = Array.from({ length: target.paramNames.length }).fill('') as string[];
    composeInvokeTarget();
  } else {
    currentParamNames.value = [];
    paramValues.value = [];
    form.invokeTarget = `${target.beanName}.${target.methodName}`;
  }
};

const composeInvokeTarget = () => {
  const target = targetOptions.value.find((t) => t.invokeTarget === selectedTarget.value);
  if (!target) return;

  const base = `${target.beanName}.${target.methodName}`;
  if (currentParamNames.value.length === 0) {
    form.invokeTarget = base;
  } else {
    const filledParams = paramValues.value.map((v, i) => v || `{${currentParamNames.value[i]}}`);
    form.invokeTarget = `${base}(${filledParams.join(',')})`;
  }
};

const onInvokeTargetManualChange = () => {
  selectedTarget.value = '';
  currentParamNames.value = [];
  paramValues.value = [];
};

const {
  visible,
  mode,
  isSaving,
  formRef: dialogForm,
  form,
  open,
  setData,
} = useForm({
  defaultForm: {
    id: '',
    jobName: '',
    jobGroup: 'DEFAULT',
    invokeTarget: '',
    serviceName: '',
    cronExpression: '',
    misfirePolicy: '3',
    concurrent: 0,
    status: 1,
    remark: '',
  },
});

watch(visible, (val) => {
  if (val) {
    loadTargets();
  } else {
    selectedTarget.value = '';
    currentParamNames.value = [];
    paramValues.value = [];
    cronTip.value = '';
    cronValid.value = false;
  }
});

const onCronBlur = async () => {
  if (!form.cronExpression) {
    cronTip.value = '';
    cronValid.value = false;
    return;
  }
  try {
    const checkRes = await job.checkCron(form.cronExpression);
    if (checkRes?.data === true) {
      cronValid.value = true;
      const nextRes = await job.nextExecution(form.cronExpression);
      cronTip.value = nextRes?.data
        ? t('pages.system.job.message.cronValidWithTime', { time: nextRes.data })
        : t('pages.system.job.message.cronValid');
    } else {
      cronValid.value = false;
      cronTip.value = t('pages.system.job.message.cronInvalid');
    }
  } catch {
    cronValid.value = false;
    cronTip.value = t('pages.system.job.message.cronCheckFail');
  }
};

const onSubmit = async () => {
  let valid;
  try {
    valid = await (dialogForm.value as any)?.validate();
  } catch {
    valid = false;
  }
  if (valid !== true) return;

  if (!cronValid.value && form.cronExpression) {
    MessagePlugin.warning(t('pages.system.job.message.cronCheckFirst'));
    return;
  }

  const submitData = { ...form };
  // 去掉首尾空格（否则 `xxx ` 这种值与真实服务名不相等 ⇒ 任务会无人执行）
  submitData.serviceName = (submitData.serviceName || '').trim();
  if (submitData.id === '' || submitData.id === undefined || submitData.id === null) {
    delete submitData.id;
  }

  isSaving.value = true;
  try {
    const res = mode.value === 'add' ? await job.create(submitData) : await job.update(submitData);
    if (res && res.code === 200) {
      MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
      visible.value = false;
      emit('success', form, mode.value);
    }
  } finally {
    isSaving.value = false;
  }
};

defineExpose({ open, setData });
</script>
