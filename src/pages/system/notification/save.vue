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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="650" destroy-on-close @closed="emit('closed')">
    <t-form
      ref="dialogForm"
      :data="form"
      :rules="rules"
      label-width="80px"
      :disabled="mode === 'show'"
      @submit="onSubmit"
    >
      <t-form-item :label="t('pages.system.notification.template')" name="templateCode">
        <t-select
          v-model="templateCode"
          :placeholder="t('pages.system.notification.placeholder.templateCode')"
          clearable
          :options="templateOptions"
          @change="applyTemplate"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.title')" name="title">
        <t-input v-model="form.title" :placeholder="t('pages.system.notification.placeholder.title')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.content')" name="content">
        <t-textarea
          v-model="form.content"
          :placeholder="t('pages.system.notification.placeholder.content')"
          :autosize="{ minRows: 3, maxRows: 8 }"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.type')" name="type">
        <t-select
          v-model="form.type"
          :placeholder="t('pages.system.notification.placeholder.type')"
          :options="typeOptions"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.level')" name="level">
        <t-select
          v-model="form.level"
          :placeholder="t('pages.system.notification.placeholder.level')"
          :options="levelOptions"
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.notification.recipientTypeForm')" name="recipientType">
        <t-select
          v-model="form.recipientType"
          :placeholder="t('pages.system.notification.placeholder.recipientTypeForm')"
          :options="recipientTypeOptions"
          @change="onRecipientTypeChange"
        />
      </t-form-item>
      <t-form-item
        v-if="form.recipientType !== 'all'"
        :label="t('pages.system.notification.recipient')"
        name="recipientIds"
      >
        <t-select
          v-if="form.recipientType === 'role'"
          v-model="form.recipientIds"
          :options="roleOptions"
          :keys="{ value: 'id', label: 'roleName' }"
          :placeholder="t('pages.system.notification.placeholder.role')"
          multiple
          clearable
        />
        <t-select
          v-if="form.recipientType === 'dept'"
          v-model="form.recipientIds"
          :options="deptOptions"
          :keys="{ value: 'id', label: 'deptName' }"
          :placeholder="t('pages.system.notification.placeholder.dept')"
          multiple
          clearable
        />
        <t-select
          v-if="form.recipientType === 'user'"
          v-model="form.recipientIds"
          :options="userOptions"
          :keys="{ value: 'id', label: 'userName' }"
          :placeholder="t('pages.system.notification.placeholder.user')"
          multiple
          clearable
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
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import systemApi from '@/api/system';
import { useForm } from '@/hooks/useForm';
import { typeLabelOf } from '@/store';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

const roleOptions = ref([]);
const deptOptions = ref([]);
const userOptions = ref([]);
const templateCode = ref<string | undefined>(undefined);
const templateOptions = ref<Array<{ label: string; value: string }>>([]);
const templateList = ref<
  {
    code: string;
    name: string;
    titleTemplate?: string;
    contentTemplate?: string;
    type?: string;
    level?: string;
    recipientType?: string;
  }[]
>([]);

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

const rules = computed<Record<string, FormRule[]>>(() => ({
  title: [{ required: true, message: t('pages.system.notification.placeholder.title'), trigger: 'blur' }],
  content: [{ required: true, message: t('pages.system.notification.placeholder.content'), trigger: 'blur' }],
}));

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

const {
  visible,
  mode,
  isSaving,
  formRef: dialogForm,
  form,
  open: _open,
  setData: _setData,
} = useForm({
  defaultForm: {
    id: '',
    title: '',
    content: '',
    type: 'system',
    level: 'info',
    recipientType: 'all',
    recipientIds: [],
  },
});

const onRecipientTypeChange = () => {
  form.recipientIds = [];
};

/**
 * 选择模板后填充标题/内容/类型等默认值。
 * 模板占位符（${var}）保留原样，由填写人替换为实际值。
 */
const applyTemplate = (code: unknown) => {
  const tpl = templateList.value.find((item) => item.code === code);
  if (!tpl) return;
  if (tpl.titleTemplate) form.title = tpl.titleTemplate;
  if (tpl.contentTemplate) form.content = tpl.contentTemplate;
  if (tpl.type) form.type = tpl.type;
  if (tpl.level) form.level = tpl.level;
  if (tpl.recipientType) {
    form.recipientType = tpl.recipientType;
    if (tpl.recipientType === 'all') {
      form.recipientIds = [];
    }
  }
};

const loadTemplates = async () => {
  try {
    const res = await systemApi.notificationTemplate.page({ status: 1, pageNo: 1, pageSize: 200 });
    if (res.code === 200) {
      templateList.value = res.data?.list || [];
      templateOptions.value = templateList.value.map((item) => ({
        label: `${item.name}（${item.code}）`,
        value: item.code,
      }));
    }
  } catch (e) {
    console.error('加载通知模板失败:', e);
  }
};

const loadOptions = async () => {
  try {
    const [roleRes, deptRes, userRes] = await Promise.allSettled([
      systemApi.role.roleSelect(),
      systemApi.dept.list(),
      systemApi.user.list(),
    ]);
    if (roleRes.status === 'fulfilled' && roleRes.value.code === 200) roleOptions.value = roleRes.value.data || [];
    if (deptRes.status === 'fulfilled' && deptRes.value.code === 200) deptOptions.value = deptRes.value.data || [];
    if (userRes.status === 'fulfilled' && userRes.value.code === 200) userOptions.value = userRes.value.data || [];
  } catch (e) {
    console.error('加载接收人选项失败:', e);
  }
};

const open = (type: string) => {
  _open(type);
};

/** 通知表单数据（与 defaultForm 对齐；可选以兼容后端动态 payload） */
interface NotificationFormData {
  id?: number | string;
  title?: string;
  content?: string;
  type?: string;
  level?: string;
  recipientType?: string;
  /** 接收人 ID：编辑回显时可能是逗号分隔串，需归一为数组 */
  recipientIds?: number[] | string;
  [key: string]: unknown;
}

const setData = (data: NotificationFormData) => {
  _setData(data);
  if (typeof data.recipientIds === 'string' && data.recipientIds) {
    form.recipientIds = data.recipientIds.split(',').map(Number);
  }
};

const onSubmit = async () => {
  const validateResult = await (dialogForm.value as { validate: () => Promise<boolean> } | null)
    ?.validate()
    .catch(() => false);
  if (!validateResult) return;

  isSaving.value = true;
  try {
    const data = { ...form };
    if (Array.isArray(data.recipientIds)) {
      data.recipientIds = data.recipientIds.join(',');
    }
    const res =
      mode.value === 'add' ? await systemApi.notification.create(data) : await systemApi.notification.update(data);
    if (res.code === 200) {
      MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
      visible.value = false;
      emit('success', form, mode.value);
    }
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  loadOptions();
  loadTemplates();
});

defineExpose({ open, setData });
</script>
