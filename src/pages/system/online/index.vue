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
  <div class="system-online-page">
    <t-card class="toolbar-card">
      <t-space>
        <t-button theme="primary" @click="fetchData">{{ t('pages.system.online.refresh') }}</t-button>
        <span class="count-text"
          >{{ t('pages.system.online.onlineCountPrefix') }} <b>{{ list.length }}</b>
          {{ t('pages.system.online.onlineCountSuffix') }}</span
        >
      </t-space>
    </t-card>

    <t-card>
      <t-table :loading="loading" :data="list" :columns="columns" row-key="loginId" />
    </t-card>
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { hasPermission } from '@/utils/permission';

const { t } = useI18n();

const loading = ref(false);
const list = ref([]);

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'userName', title: t('common.userName'), width: 160 },
  { colKey: 'nickName', title: t('common.nickName'), width: 160 },
  { colKey: 'loginTime', title: t('pages.system.online.loginTime'), width: 200 },
  { colKey: 'tenantId', title: t('pages.system.online.tenantId'), width: 120, align: 'center' },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 120,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) =>
      hasPermission('system:online:kick')
        ? h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.system.online.message.kickConfirm', { name: row.userName }),
                  onConfirm: () => {
                    confirmDia.destroy();
                    handleKick(row);
                  },
                });
              },
            },
            t('pages.system.online.kick'),
          )
        : null,
  },
]);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await api.online.list();
    list.value = res?.data || [];
  } finally {
    loading.value = false;
  }
};

const handleKick = async (row: any) => {
  try {
    const res = await api.online.kick(row.loginId);
    if (res.code === 200) {
      MessagePlugin.success(t('pages.system.online.message.kickSuccess'));
      fetchData();
    }
  } catch (e: any) {
    MessagePlugin.error(e.message || t('common.operateFail'));
  }
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.system-online-page {
  .toolbar-card {
    margin-bottom: 16px;
  }

  .count-text {
    line-height: 32px;
    color: var(--td-text-color-secondary);
  }
}
</style>
