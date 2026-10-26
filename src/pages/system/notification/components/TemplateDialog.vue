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
        ? t('pages.system.notification.templateDialog.editTitle')
        : t('pages.system.notification.templateDialog.addTitle')
    "
    :width="720"
    :confirm-btn="{ loading: submitting }"
    @update:visible="(v: boolean) => emit('update:visible', v)"
    @confirm="emit('confirm', { ...form })"
  >
    <t-form :data="form" label-width="100px">
      <t-form-item :label="t('pages.system.notification.templateDialog.group')">
        <t-select
          v-model="form.groupId"
          :options="groupSelectOptions"
          clearable
          :placeholder="t('pages.system.notification.templateDialog.placeholder.group')"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.templateDialog.name')">
        <t-input v-model="form.name" :placeholder="t('pages.system.notification.templateDialog.placeholder.name')" />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.templateDialog.code')">
        <t-input v-model="form.code" :placeholder="t('pages.system.notification.templateDialog.placeholder.code')" />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.templateDialog.titleTemplate')">
        <t-input
          v-model="form.titleTemplate"
          :placeholder="t('pages.system.notification.templateDialog.placeholder.tpl', { v: '${var}' })"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.templateDialog.contentTemplate')">
        <t-textarea
          v-model="form.contentTemplate"
          :autosize="{ minRows: 3 }"
          :placeholder="t('pages.system.notification.templateDialog.placeholder.tpl', { v: '${var}' })"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.templateDialog.defaultType')">
        <t-select v-model="form.type" :options="typeOptions" />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.templateDialog.defaultLevel')">
        <t-select v-model="form.level" :options="levelOptions" />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.templateDialog.defaultRecipient')">
        <t-select v-model="form.recipientType" :options="recipientTypeOptions" />
      </t-form-item>
      <t-form-item :label="t('common.status')">
        <t-switch v-model="form.status" :custom-value="[1, 0]" />
      </t-form-item>
      <t-form-item :label="t('common.remark')">
        <t-textarea v-model="form.remark" :autosize="{ minRows: 2 }" />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>
<script lang="ts" setup>
import type { PropType } from 'vue';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { typeLabelOf } from '@/store';

defineProps({
  groupSelectOptions: { type: Array as PropType<Array<{ label: string; value: unknown }>>, default: () => [] },
});

const emit = defineEmits<{ confirm: [data: Record<string, unknown>]; 'update:visible': [v: boolean] }>();
const visible = defineModel<boolean>('visible', { default: false });
const submitting = ref(false);

const { t } = useI18n();

const form = reactive<{
  id?: string | number | null;
  groupId?: number | string;
  name?: string;
  code?: string;
  titleTemplate?: string;
  contentTemplate?: string;
  type?: string;
  level?: string;
  recipientType?: string;
  status?: number;
  remark?: string;
}>({});

// 通知类型标签走 i18n（typeLabelOf 未命中词条时回退中文常量，与铃铛一致）
const typeOptions = computed(() => ['system', 'biz', 'flow'].map((value) => ({ value, label: typeLabelOf(value) })));

const levelOptions = computed(() => [
  { value: 'info', label: t('pages.system.notification.levelMap.info') },
  { value: 'warning', label: t('pages.system.notification.levelMap.warning') },
  { value: 'error', label: t('pages.system.notification.levelMap.error') },
]);

const recipientTypeOptions = computed(() => [
  { value: 'all', label: t('pages.system.notification.recipientTypeMap.all') },
  { value: 'role', label: t('pages.system.notification.recipientTypeMap.role') },
  { value: 'dept', label: t('pages.system.notification.recipientTypeMap.dept') },
  { value: 'user', label: t('pages.system.notification.recipientTypeMap.user') },
]);

const open = (row?: Record<string, unknown> | null, defaultGroupId?: unknown) => {
  Object.assign(
    form,
    row
      ? { ...row }
      : {
          id: null,
          groupId: defaultGroupId ?? null,
          name: '',
          code: '',
          titleTemplate: '',
          contentTemplate: '',
          type: 'system',
          level: 'info',
          recipientType: 'all',
          status: 1,
          remark: '',
        },
  );
  submitting.value = false;
  visible.value = true;
};

defineExpose({ open, submitting });
</script>
