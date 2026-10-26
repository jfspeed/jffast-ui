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
  <div class="flow-done-page">
    <t-card>
      <t-table :loading="loading" :data="pageParams.list" :columns="columns" row-key="id" stripe bordered />

      <div class="pagination-container">
        <t-pagination
          :current="pageParams.pageNum"
          :page-size="pageParams.pageSize"
          :total="pageParams.total"
          :page-size-options="[10, 20, 50, 100]"
          show-jumper
          @current-change="handlePageChange"
          @page-size-change="handleSizeChange"
        />
      </div>
    </t-card>

    <!-- 审批历史对话框 -->
    <t-dialog
      v-model:visible="historyVisible"
      :header="t('pages.flow.common.historyTitle')"
      :width="900"
      :footer="false"
      destroy-on-close
    >
      <t-table :loading="historyLoading" :data="historyList" :columns="historyColumns" row-key="id" stripe bordered />
    </t-dialog>
  </div>
</template>
<script lang="ts" setup>
import { Tag } from 'tdesign-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { history as historyApi } from '@/api/flow';

const { t } = useI18n();

const loading = ref(false);
const pageParams = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  list: [],
});

// ─── 审批历史 ─────────────────────────────────
const historyVisible = ref(false);
const historyLoading = ref(false);
const historyList = ref([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await historyApi.donePage({
      pageNo: pageParams.pageNum,
      pageSize: pageParams.pageSize,
    });
    const data = res?.data || {};
    pageParams.list = data.list || [];
    pageParams.total = data.total || 0;
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page: number) => {
  pageParams.pageNum = page;
  fetchData();
};

const handleSizeChange = (size: number) => {
  pageParams.pageSize = size;
  pageParams.pageNum = 1;
  fetchData();
};

const handleViewHistory = async (row: any) => {
  historyVisible.value = true;
  historyLoading.value = true;
  historyList.value = [];
  try {
    const res = await historyApi.instanceHistory(row.processInstanceId);
    historyList.value = res?.data || res || [];
  } catch {
    historyList.value = [];
  } finally {
    historyLoading.value = false;
  }
};

const CANCEL_REASON_RE = /cancel|delete|取消/i;

const columns = computed<any[]>(() => [
  { colKey: 'name', title: t('pages.flow.task.taskName'), width: 180, ellipsis: true },
  { colKey: 'processInstanceId', title: t('pages.flow.common.processInstanceId'), width: 120, ellipsis: true },
  { colKey: 'processDefinitionName', title: t('pages.flow.common.processName'), width: 160, ellipsis: true },
  { colKey: 'assignee', title: t('pages.flow.common.assignee'), width: 100 },
  { colKey: 'startTime', title: t('pages.flow.common.startTime'), width: 170 },
  { colKey: 'endTime', title: t('pages.flow.common.endTime'), width: 170 },
  {
    colKey: 'durationInMillis',
    title: t('pages.flow.common.duration'),
    width: 120,
    cell: (h: any, { row }: any) => (row.durationInMillis ? `${Math.round(row.durationInMillis / 1000)}s` : '-'),
  },
  {
    colKey: 'deleteReason',
    title: t('pages.flow.common.result'),
    width: 140,
    ellipsis: true,
    cell: (h: any, { row }: any) => {
      const reason = row.deleteReason || '';
      if (!reason) return h('span', '-');
      // 含 deleted/cancelled 关键字视为取消，否则视为完成
      const isCancel = CANCEL_REASON_RE.test(reason);
      return h(Tag, { theme: isCancel ? 'warning' : 'success', variant: 'light' }, () => reason);
    },
  },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 120,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) =>
      h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, [
        h('a', { onClick: () => handleViewHistory(row) }, t('pages.flow.common.historyTitle')),
      ]),
  },
]);

const historyColumns = computed<any[]>(() => [
  { colKey: 'name', title: t('pages.flow.common.nodeName'), width: 160, ellipsis: true },
  { colKey: 'assignee', title: t('pages.flow.common.assignee'), width: 100 },
  { colKey: 'startTime', title: t('pages.flow.common.startTime'), width: 170 },
  {
    colKey: 'endTime',
    title: t('pages.flow.common.endTime'),
    width: 170,
    cell: (h: any, { row }: any) => row.endTime || '-',
  },
  {
    colKey: 'durationInMillis',
    title: t('pages.flow.common.duration'),
    width: 120,
    cell: (h: any, { row }: any) => (row.durationInMillis ? `${Math.round(row.durationInMillis / 1000)}s` : '-'),
  },
  {
    colKey: 'deleteReason',
    title: t('pages.flow.common.result'),
    ellipsis: true,
    cell: (h: any, { row }: any) => row.deleteReason || '-',
  },
]);

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.flow-done-page {
  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
