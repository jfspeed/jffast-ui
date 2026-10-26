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
  <t-dialog v-model:visible="visible" :header="titleMap[mode]" :width="620" destroy-on-close @closed="emit('closed')">
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="110px" :disabled="mode === 'show'">
      <t-form-item :label="t('pages.system.oauth2Client.provider')" name="provider">
        <t-input v-model="form.provider" :placeholder="t('pages.system.oauth2Client.placeholder.provider')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.name')" name="name">
        <t-input v-model="form.name" :placeholder="t('pages.system.oauth2Client.placeholder.name')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.grantTypes')" name="grantTypes">
        <t-checkbox-group v-model="grantTypeList">
          <t-checkbox
            value="client_credentials"
            :label="t('pages.system.oauth2Client.grantTypeMap.clientCredentials')"
          />
          <t-checkbox
            value="authorization_code"
            :label="t('pages.system.oauth2Client.grantTypeMap.authorizationCode')"
          />
        </t-checkbox-group>
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.clientId')" name="clientId">
        <t-input v-model="form.clientId" :placeholder="t('pages.system.oauth2Client.placeholder.clientId')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.clientSecret')" name="clientSecret">
        <t-input
          v-model="form.clientSecret"
          type="password"
          :placeholder="t('pages.system.oauth2Client.placeholder.clientSecret')"
          clearable
        />
      </t-form-item>
      <t-form-item
        v-if="form.grantTypes?.includes('authorization_code')"
        :label="t('pages.system.oauth2Client.authorizationUrl')"
        name="authorizationUrl"
      >
        <t-input
          v-model="form.authorizationUrl"
          :placeholder="t('pages.system.oauth2Client.placeholder.authorizationUrl')"
          clearable
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.tokenUrl')" name="tokenUrl">
        <t-input v-model="form.tokenUrl" :placeholder="t('pages.system.oauth2Client.placeholder.tokenUrl')" clearable />
      </t-form-item>
      <t-form-item
        v-if="form.grantTypes?.includes('authorization_code')"
        :label="t('pages.system.oauth2Client.redirectUri')"
        name="redirectUri"
      >
        <t-input
          v-model="form.redirectUri"
          :placeholder="t('pages.system.oauth2Client.placeholder.redirectUri')"
          clearable
        />
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.authMethod')" name="authMethod">
        <t-select v-model="form.authMethod" :placeholder="t('pages.system.oauth2Client.placeholder.authMethod')">
          <t-option value="client_secret_post" label="client_secret_post" />
          <t-option value="client_secret_basic" label="client_secret_basic" />
        </t-select>
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.scopes')" name="scopes">
        <t-input v-model="form.scopes" :placeholder="t('pages.system.oauth2Client.placeholder.scopes')" clearable />
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.ttl')" name="ttl">
        <t-input-number v-model="form.ttl" :min="0" :placeholder="t('pages.system.oauth2Client.placeholder.ttl')" />
      </t-form-item>
      <t-form-item :label="t('pages.system.oauth2Client.extra')" name="extra">
        <t-textarea
          v-model="form.extra"
          :placeholder="t('pages.system.oauth2Client.placeholder.extra')"
          :autosize="{ minRows: 2 }"
        />
      </t-form-item>
      <t-form-item :label="t('common.status')" name="status">
        <t-switch v-model="form.status" :custom-value="[1, 0]" />
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

import oauth2Client from '@/api/oauth2Client';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
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
    provider: '',
    name: '',
    clientId: '',
    clientSecret: '',
    grantTypes: '',
    authorizationUrl: '',
    tokenUrl: '',
    redirectUri: '',
    authMethod: 'client_secret_post',
    scopes: '',
    ttl: null,
    extra: '',
    status: 1,
  },
});

const rules = computed<Record<string, FormRule[]>>(() => {
  const result: Record<string, FormRule[]> = {
    provider: [{ required: true, message: t('pages.system.oauth2Client.rules.provider'), trigger: 'blur' }],
    name: [{ required: true, message: t('pages.system.oauth2Client.placeholder.name'), trigger: 'blur' }],
    clientId: [{ required: true, message: t('pages.system.oauth2Client.placeholder.clientId'), trigger: 'blur' }],
    tokenUrl: [{ required: true, message: t('pages.system.oauth2Client.rules.tokenUrl'), trigger: 'blur' }],
  };
  // 新增时客户端密钥必填；编辑/查看留空表示沿用原密钥，不做强制
  if (mode.value === 'add') {
    result.clientSecret = [
      { required: true, message: t('pages.system.oauth2Client.rules.clientSecret'), trigger: 'blur' },
    ];
  }
  return result;
});

const grantTypeList = ref([]);

// 复选框组 -> form.grantTypes（逗号分隔）
watch(grantTypeList, (list) => {
  form.grantTypes = (list || []).join(',');
});

// 打开弹窗时从 form.grantTypes 回填复选框（编辑/查看场景）
watch(visible, (val) => {
  if (val) {
    grantTypeList.value = (form.grantTypes || '').split(',').filter(Boolean);
  }
});

const onSubmit = async () => {
  const res = await formSubmit(oauth2Client);
  if (res && res.code === 200) {
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  }
};

defineExpose({ open, setData });
</script>
