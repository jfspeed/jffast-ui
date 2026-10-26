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
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-form-item :label="t('pages.system.config.configName')" name="configName">
        <t-input v-model="form.configName" :placeholder="t('pages.system.config.placeholder.configName')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.config.configKey')" name="configKey">
        <t-input
          v-model="form.configKey"
          :placeholder="t('pages.system.config.placeholder.configKeyExample')"
          clearable
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.config.configValue')" name="configValue">
        <t-textarea
          v-model="form.configValue"
          :placeholder="t('pages.system.config.placeholder.configValue')"
          :autosize="{ minRows: 2 }"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.config.systemBuiltin')" name="systemBuiltin">
        <t-switch v-model="form.systemBuiltin" :custom-value="[1, 0]" />
      </t-form-item>
      <t-form-item :label="t('common.remark')" name="remark">
        <t-textarea
          v-model="form.remark"
          :placeholder="t('pages.system.config.placeholder.remark')"
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
  configName: [{ required: true, message: t('pages.system.config.placeholder.configName'), trigger: 'blur' }],
  configKey: [{ required: true, message: t('pages.system.config.placeholder.configKey'), trigger: 'blur' }],
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
    configName: '',
    configKey: '',
    configValue: '',
    systemBuiltin: 0,
    remark: '',
  },
});

const onSubmit = async () => {
  const res = await formSubmit(api.config);
  if (res && res.code === 200) {
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  }
};

defineExpose({ open, setData });
</script>
