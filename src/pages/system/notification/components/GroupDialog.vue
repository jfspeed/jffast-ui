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
    :visible="visible"
    :header="
      form.id
        ? t('pages.system.notification.groupDialog.editTitle')
        : t('pages.system.notification.groupDialog.addTitle')
    "
    :width="500"
    :confirm-btn="{ loading: submitting }"
    @update:visible="(v: boolean) => emit('update:visible', v)"
    @confirm="emit('confirm', { ...form })"
  >
    <t-form :data="form" label-width="80px">
      <t-form-item :label="t('pages.system.notification.groupDialog.name')">
        <t-input v-model="form.name" :placeholder="t('pages.system.notification.groupDialog.placeholder.name')" />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.groupDialog.code')">
        <t-input v-model="form.code" :placeholder="t('pages.system.notification.groupDialog.placeholder.code')" />
      </t-form-item>
      <t-form-item :label="t('common.sort')">
        <t-input-number v-model="form.sort" :min="0" />
      </t-form-item>
      <t-form-item :label="t('common.status')">
        <t-switch v-model="form.status" :custom-value="[1, 0]" />
      </t-form-item>
      <t-form-item :label="t('common.description')">
        <t-textarea v-model="form.description" :autosize="{ minRows: 2 }" />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>
<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const emit = defineEmits<{ confirm: [data: Record<string, unknown>]; 'update:visible': [v: boolean] }>();
const visible = defineModel<boolean>('visible', { default: false });
const submitting = ref(false);

const { t } = useI18n();

const form = reactive<{
  id?: string | number | null;
  name?: string;
  code?: string;
  sort?: number;
  status?: number;
  description?: string;
}>({});

const open = (group?: Record<string, unknown> | null) => {
  Object.assign(form, group ? { ...group } : { id: null, name: '', code: '', description: '', sort: 0, status: 1 });
  submitting.value = false;
  visible.value = true;
};

defineExpose({ open, submitting });
</script>
