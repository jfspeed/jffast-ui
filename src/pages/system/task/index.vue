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
  <div class="system-task-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.system.task.title')" name="title">
          <t-input v-model="searchForm.title" :placeholder="t('pages.system.task.placeholder.title')" clearable />
        </t-form-item>
        <t-form-item :label="t('common.type')" name="taskType">
          <t-select
            v-model="searchForm.taskType"
            :placeholder="t('pages.system.task.placeholder.taskType')"
            clearable
            style="width: 120px"
          >
            <t-option value="import" :label="t('pages.system.task.typeMap.import')" />
            <t-option value="export" :label="t('pages.system.task.typeMap.export')" />
          </t-select>
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-select
            v-model="searchForm.status"
            :placeholder="t('pages.system.task.placeholder.status')"
            clearable
            style="width: 120px"
          >
            <t-option :value="0" :label="t('pages.system.task.statusMap.pending')" />
            <t-option :value="1" :label="t('pages.system.task.statusMap.running')" />
            <t-option :value="2" :label="t('pages.system.task.statusMap.done')" />
            <t-option :value="3" :label="t('pages.system.task.statusMap.fail')" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card>
      <t-table :loading="loading" :data="pageParams.list" :columns="columns" row-key="id" />

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
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, Progress, Tag } from 'tdesign-vue-next';
import { computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

const { t } = useI18n();

/** 状态展示：待处理 / 进行中 / 已完成 / 失败（文案随语言切换，需 computed 响应） */
const statusMap = computed<Record<number, { label: string; theme: 'default' | 'primary' | 'success' | 'danger' }>>(
  () => ({
    0: { label: t('pages.system.task.statusMap.pending'), theme: 'default' },
    1: { label: t('pages.system.task.statusMap.running'), theme: 'primary' },
    2: { label: t('pages.system.task.statusMap.done'), theme: 'success' },
    // Tag 的主题取值是 danger（没有 error），此前写 'error' 会静默退化为默认灰
    3: { label: t('pages.system.task.statusMap.fail'), theme: 'danger' },
  }),
);

/** 任务行：命名已知字段（全可选，兼容 TDesign TableRowData）+ 索引签名兜底动态 payload */
interface SysTaskRow {
  id?: number | string;
  taskType?: string;
  status?: number;
  progress?: number;
  failDetail?: string;
  filePath?: string;
  fileName?: string;
  [key: string]: unknown;
}

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'title', title: t('pages.system.task.title'), width: 180, ellipsis: true },
  {
    colKey: 'taskType',
    title: t('common.type'),
    width: 80,
    align: 'center',
    cell: (h, { row }) => {
      const label =
        row.taskType === 'import' ? t('pages.system.task.typeMap.import') : t('pages.system.task.typeMap.export');
      return h(Tag, { theme: 'default', variant: 'light' }, () => label);
    },
  },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 90,
    align: 'center',
    cell: (h, { row }) => {
      const status = statusMap.value[row.status] || statusMap.value[0];
      return h(Tag, { theme: status.theme, variant: 'light' }, () => status.label);
    },
  },
  {
    colKey: 'progress',
    title: t('pages.system.task.progress'),
    width: 140,
    cell: (h, { row }) => h(Progress, { percentage: row.progress || 0 }),
  },
  { colKey: 'totalRows', title: t('pages.system.task.totalRows'), width: 90, align: 'right' },
  { colKey: 'successRows', title: t('common.success'), width: 80, align: 'right' },
  { colKey: 'failRows', title: t('common.fail'), width: 80, align: 'right' },
  {
    colKey: 'failDetail',
    title: t('pages.system.task.failDetail'),
    width: 100,
    align: 'center',
    cell: (h, { row }) =>
      row.failDetail
        ? h('a', { onClick: () => showFailDetail(row) }, t('pages.system.task.viewDetail'))
        : h('span', {}, '-'),
  },
  { colKey: 'createTime', title: t('common.createTime'), width: 170 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 120,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const btns = [];
      if (hasPermission('system:task:download') && row.status === 2 && row.filePath) {
        btns.push(h('a', { onClick: () => handleDownload(row) }, t('common.download')));
      }
      if (hasPermission('system:task:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.system.task.message.deleteConfirm'),
                  onConfirm: () => {
                    confirmDia.destroy();
                    handleDelete(row);
                  },
                });
              },
            },
            t('common.delete'),
          ),
        );
      }
      return h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, btns);
    },
  },
]);

const {
  loading,
  searchForm,
  pageParams,
  handleSearch,
  resetSearch,
  handleDelete,
  handlePageChange,
  handleSizeChange,
  fetchData,
} = useTable(api.task, {
  defaultSearch: { title: '', taskType: '', status: '' },
});

const showFailDetail = (row: SysTaskRow) => {
  DialogPlugin.alert({
    header: t('pages.system.task.failDetail'),
    body: row.failDetail,
  });
};

const handleDownload = (row: SysTaskRow) => {
  api.task.download(row.id, row.fileName || t('pages.system.task.defaultFileName'));
};

// 任务在后台执行，定时刷新列表看进度
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  fetchData();
  timer = setInterval(() => {
    fetchData();
  }, 5000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>
<style scoped lang="less">
.system-task-page {
  .search-card {
    margin-bottom: 16px;
  }

  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
