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
  <t-card :title="t('pages.user.notification.pageTitle')" :bordered="false">
    <template #actions>
      <t-button theme="default" variant="text" :disabled="!hasUnread" @click="handleMarkAllRead">
        {{ t('pages.user.notification.markAllRead') }}
      </t-button>
    </template>
    <t-form layout="inline" class="search-form" @submit="handleSearch" @reset="handleReset">
      <t-form-item :label="t('pages.user.notification.title')">
        <t-input v-model="searchForm.title" :placeholder="t('pages.user.notification.placeholder.title')" clearable />
      </t-form-item>
      <t-form-item :label="t('common.type')">
        <t-select v-model="searchForm.type" :placeholder="t('common.all')" clearable style="width: 120px">
          <t-option v-for="opt in typeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </t-select>
      </t-form-item>
      <t-form-item :label="t('common.status')">
        <t-select v-model="searchForm.isRead" :placeholder="t('common.all')" clearable style="width: 120px">
          <t-option :label="t('pages.user.notification.unread')" :value="0" />
          <t-option :label="t('pages.user.notification.read')" :value="1" />
        </t-select>
      </t-form-item>
      <t-form-item>
        <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
        <t-button theme="default" type="reset" style="margin-left: 8px">{{ t('common.reset') }}</t-button>
      </t-form-item>
    </t-form>

    <t-table
      :data="tableData"
      :columns="columns"
      :loading="loading"
      row-key="id"
      stripe
      hover
      :pagination="pagination"
      @page-change="onPageChange"
    >
      <template #level="{ row }">
        <t-tag :theme="levelThemeMap[row.level] || 'default'" variant="light" size="small">{{
          levelLabelMap[row.level] || row.level
        }}</t-tag>
      </template>
      <template #isRead="{ row }">
        <t-tag :theme="row.isRead === 0 ? 'warning' : 'success'" variant="light" size="small">{{
          row.isRead === 0 ? t('pages.user.notification.unread') : t('pages.user.notification.read')
        }}</t-tag>
      </template>
      <template #op="{ row }">
        <t-link v-if="row.isRead === 0" theme="primary" @click="handleRead(row)">
          {{ t('pages.user.notification.markRead') }}
        </t-link>
        <t-link theme="primary" style="margin-left: 8px" @click="handleView(row)">{{ t('common.view') }}</t-link>
      </template>
    </t-table>

    <t-dialog
      v-model:visible="detailVisible"
      :header="t('pages.user.notification.detailTitle')"
      :footer="false"
      width="600px"
      destroy-on-close
    >
      <t-descriptions v-if="currentItem" :column="1" bordered>
        <t-descriptions-item :label="t('pages.user.notification.title')">{{ currentItem.title }}</t-descriptions-item>
        <t-descriptions-item :label="t('common.type')">{{
          typeLabelOf(currentItem.type) || currentItem.type
        }}</t-descriptions-item>
        <t-descriptions-item :label="t('pages.user.notification.level')">{{
          levelLabelMap[currentItem.level] || currentItem.level
        }}</t-descriptions-item>
        <t-descriptions-item :label="t('pages.user.notification.sender')">{{
          currentItem.sender || '-'
        }}</t-descriptions-item>
        <t-descriptions-item :label="t('pages.user.notification.sendTime')">{{
          currentItem.sendTime || '-'
        }}</t-descriptions-item>
        <t-descriptions-item :label="t('pages.user.notification.content')">{{
          currentItem.content
        }}</t-descriptions-item>
      </t-descriptions>
    </t-dialog>
  </t-card>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { typeLabelOf } from '@/store';

defineOptions({ name: 'MyNotification' });

const { t } = useI18n();

interface NotificationRow {
  id: number | string;
  title: string;
  type: string;
  level: string;
  isRead: number;
  sender?: string;
  sendTime?: string;
  content?: string;
}

/** 表格回调传入的行（TDesign 侧为宽松类型），字段全可选 + 索引签名 */
interface NotificationRowInput {
  id?: number | string;
  title?: string;
  type?: string;
  level?: string;
  isRead?: number;
  sender?: string;
  sendTime?: string;
  content?: string;
  [key: string]: unknown;
}

const loading = ref(false);
const tableData = ref<NotificationRow[]>([]);
const detailVisible = ref(false);
const currentItem = ref<NotificationRow | null>(null);

const searchForm = ref({
  title: '',
  type: '',
  isRead: '',
});

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

const levelThemeMap: Record<string, 'default' | 'success' | 'warning' | 'primary' | 'danger'> = {
  info: 'default',
  warning: 'warning',
  error: 'danger',
};

// 级别 / 类型 / 列头随语言切换更新
const levelLabelMap = computed<Record<string, string>>(() => ({
  info: t('pages.user.notification.levelMap.info'),
  warning: t('pages.user.notification.levelMap.warning'),
  error: t('pages.user.notification.levelMap.error'),
}));

const typeOptions = computed(() => ['system', 'biz', 'flow'].map((value) => ({ value, label: typeLabelOf(value) })));

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'title', title: t('pages.user.notification.title'), width: 200, ellipsis: true },
  {
    colKey: 'type',
    title: t('common.type'),
    width: 110,
    cell: (h, { row }) => typeLabelOf(row.type) || row.type,
  },
  { colKey: 'level', title: t('pages.user.notification.level'), width: 80 },
  { colKey: 'isRead', title: t('common.status'), width: 80 },
  { colKey: 'sendTime', title: t('pages.user.notification.sendTime'), width: 170 },
  { colKey: 'op', title: t('common.operation'), width: 140 },
]);

const hasUnread = computed(() => tableData.value.some((item) => item.isRead === 0));

const loadData = async () => {
  loading.value = true;
  try {
    const params: Record<string, unknown> = {
      pageNo: pagination.value.current,
      pageSize: pagination.value.pageSize,
    };
    if (searchForm.value.title) params.title = searchForm.value.title;
    if (searchForm.value.type) params.type = searchForm.value.type;
    if (searchForm.value.isRead !== '' && searchForm.value.isRead !== null) params.isRead = searchForm.value.isRead;

    const res = await api.notification.userNotificationPage(params);
    if (res.code === 200) {
      tableData.value = res.data?.list || [];
      pagination.value.total = res.data?.total || 0;
    }
  } catch (e) {
    console.error('加载通知列表失败:', e);
  } finally {
    loading.value = false;
  }
};

const onPageChange = (pageInfo: { current: number; pageSize: number }) => {
  pagination.value.current = pageInfo.current;
  pagination.value.pageSize = pageInfo.pageSize;
  loadData();
};

const handleSearch = () => {
  pagination.value.current = 1;
  loadData();
};

const handleReset = () => {
  searchForm.value = { title: '', type: '', isRead: '' };
  pagination.value.current = 1;
  loadData();
};

const handleRead = async (row: NotificationRowInput) => {
  try {
    await api.notification.markAsRead(row.id);
    MessagePlugin.success(t('pages.user.notification.message.markReadSuccess'));
    loadData();
  } catch {
    MessagePlugin.error(t('common.operateFail'));
  }
};

const handleMarkAllRead = async () => {
  try {
    await api.notification.markAllAsRead();
    MessagePlugin.success(t('pages.user.notification.message.markAllReadSuccess'));
    loadData();
  } catch {
    MessagePlugin.error(t('common.operateFail'));
  }
};

const handleView = (row: NotificationRowInput) => {
  currentItem.value = row as NotificationRow;
  detailVisible.value = true;
  if (row.isRead === 0) {
    api.notification.markAsRead(row.id);
    row.isRead = 1;
  }
};

onMounted(() => {
  loadData();
});
</script>
<style scoped lang="less">
.search-form {
  margin-bottom: 16px;
}
</style>
