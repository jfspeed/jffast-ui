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
    :header="t('pages.system.notification.sendTitle')"
    :width="520"
    destroy-on-close
    @closed="emit('closed')"
  >
    <div class="send-info">
      <p>
        <strong>{{ t('pages.system.notification.send.titleLabel') }}</strong
        >{{ row.title }}
      </p>
      <p>
        <strong>{{ t('pages.system.notification.send.contentLabel') }}</strong
        >{{ row.content }}
      </p>
    </div>
    <t-form label-width="80px">
      <t-form-item :label="t('pages.system.notification.send.channel')">
        <t-checkbox-group v-model="channels" :options="channelOptions" />
      </t-form-item>
    </t-form>
    <p class="channel-tip">
      {{ t('pages.system.notification.send.channelTip') }}
    </p>
    <template #footer>
      <t-button variant="outline" @click="visible = false">{{ t('common.dialogCancel') }}</t-button>
      <t-button theme="primary" :loading="sending" @click="onSubmit">{{
        t('pages.system.notification.send.sendBtn')
      }}</t-button>
    </template>
  </t-dialog>
</template>
<script lang="ts" setup>
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import systemApi from '@/api/system';

/** 通知行（父组件传入）：命名已知字段（全可选）+ 索引签名兜底动态 payload */
interface NotificationRow {
  id?: number | string;
  title?: string;
  content?: string;
  [key: string]: unknown;
}

const props = defineProps<{
  row: NotificationRow;
}>();

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

const visible = ref(true);
const sending = ref(false);
const channels = ref<string[]>([]);

const channelOptions = computed(() => [
  { value: 'email', label: t('pages.system.notification.send.channelMap.email') },
  { value: 'sms', label: t('pages.system.notification.send.channelMap.sms') },
]);

const onSubmit = async () => {
  sending.value = true;
  try {
    const res = await systemApi.notification.send({ ...props.row, channels: channels.value.join(',') });
    if (res.code === 200) {
      MessagePlugin.success(t('pages.system.notification.message.sendSuccess'));
      visible.value = false;
      emit('success');
    }
  } catch {
    // error already handled by interceptor
  } finally {
    sending.value = false;
  }
};
</script>
<style scoped lang="less">
.send-info {
  margin-bottom: 8px;

  p {
    margin: 4px 0;
    word-break: break-all;
  }
}

.channel-tip {
  margin: 0;
  font-size: 12px;
  color: var(--td-text-color-placeholder);
}
</style>
