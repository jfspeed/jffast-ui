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
  <div class="system-file-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.system.file.fileName')" name="fileName">
          <t-input v-model="searchForm.fileName" :placeholder="t('pages.system.file.placeholder.fileName')" clearable />
        </t-form-item>
        <t-form-item :label="t('pages.system.file.bizType')" name="bizType">
          <t-input v-model="searchForm.bizType" :placeholder="t('pages.system.file.placeholder.bizType')" clearable />
        </t-form-item>
        <t-form-item :label="t('pages.system.file.storageType')" name="storageType">
          <t-select
            v-model="searchForm.storageType"
            :placeholder="t('pages.system.file.placeholder.storageType')"
            clearable
            :options="storageTypeOptions"
            style="width: 160px"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button
            v-permission="'system:file:delete'"
            theme="danger"
            variant="outline"
            :disabled="selection.length === 0"
            @click="handleBatchDeleteConfirm"
          >
            {{ t('common.batchDelete') }}
          </t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card>
      <t-table
        :loading="loading"
        :data="pageParams.list"
        :columns="columns"
        row-key="id"
        :selected-row-keys="selectedRowKeys"
        @select-change="onSelectChange"
      />

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
import { DialogPlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

const { t } = useI18n();

/** 文件行：命名已知字段（全可选，兼容 TDesign TableRowData）+ 索引签名兜底动态 payload */
interface SysFileRow {
  id?: number | string;
  fileName?: string;
  size?: number;
  mime?: string;
  url?: string;
  storageType?: string;
  bizType?: string;
  [key: string]: unknown;
}

const selectedRowKeys = ref<Array<string | number>>([]);

const storageTypeOptions = computed(() => [
  { label: t('pages.system.file.storageTypeMap.local'), value: 'local' },
  { label: t('pages.system.file.storageTypeMap.minio'), value: 'minio' },
  { label: t('pages.system.file.storageTypeMap.aliyunOss'), value: 'aliyun-oss' },
  { label: t('pages.system.file.storageTypeMap.tencentCos'), value: 'tencent-cos' },
]);

/** 字节格式化：B / KB / MB / GB */
const formatSize = (size?: number | null) => {
  if (size === null || size === undefined) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(size);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
};

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'fileName', title: t('pages.system.file.fileName'), ellipsis: true },
  {
    colKey: 'size',
    title: t('pages.system.file.size'),
    width: 100,
    align: 'right',
    cell: (h, { row }) => formatSize(row.size),
  },
  { colKey: 'mime', title: t('pages.system.file.mime'), width: 160, ellipsis: true },
  { colKey: 'bizType', title: t('pages.system.file.bizType'), width: 120, ellipsis: true },
  {
    colKey: 'storageType',
    title: t('pages.system.file.storageType'),
    width: 110,
    align: 'center',
    cell: (h, { row }) => {
      const option = storageTypeOptions.value.find((item) => item.value === row.storageType);
      return h(Tag, { theme: 'default', variant: 'light' }, () => option?.label || row.storageType || '-');
    },
  },
  { colKey: 'createTime', title: t('common.createTime'), width: 170 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 150,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const btns = [];
      if (row.mime && String(row.mime).startsWith('image/') && row.url) {
        btns.push(h('a', { onClick: () => window.open(row.url, '_blank') }, t('pages.system.file.preview')));
      }
      if (hasPermission('system:file:download')) {
        btns.push(h('a', { onClick: () => handleDownload(row) }, t('common.download')));
      }
      if (hasPermission('system:file:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.system.file.message.deleteConfirm'),
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
  selection,
  searchForm,
  pageParams,
  handleSearch,
  resetSearch,
  handleDelete,
  handleBatchDelete,
  handlePageChange,
  handleSizeChange,
  fetchData,
} = useTable(api.file, {
  defaultSearch: { fileName: '', bizType: '', storageType: '' },
});

const handleDownload = (row: SysFileRow) => {
  api.file.download(row.id, row.fileName);
};

const handleBatchDeleteConfirm = () => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.file.message.batchDeleteConfirm'),
    onConfirm: () => {
      confirmDia.destroy();
      handleBatchDelete();
    },
  });
};

const onSelectChange = (selectedKeys: unknown, context: unknown) => {
  selectedRowKeys.value = selectedKeys as Array<string | number>;
  selection.value = ((context as { selectedRowData?: unknown[] }).selectedRowData || []) as typeof selection.value;
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.system-file-page {
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
