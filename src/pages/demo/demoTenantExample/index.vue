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
  <div class="demo-tenant-example-page">
    <t-card class="search-card">
      <t-alert theme="info" :message="t('pages.demo.demoTenantExample.tips')" style="margin-bottom: 12px" />
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('common.title')" name="title">
          <t-input v-model="searchForm.title" :placeholder="t('pages.demo.common.placeholder.title')" clearable />
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-select
            v-model="searchForm.status"
            :placeholder="t('common.pleaseSelect')"
            clearable
            :options="statusOptions"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'demo:tenant-example:add'" theme="success" @click="add">{{
            t('common.add')
          }}</t-button>
          <t-button
            v-permission="'demo:tenant-example:delete'"
            theme="danger"
            variant="outline"
            :disabled="selection.length === 0"
            @click="handleBatchDeleteConfirm"
            >{{ t('common.batchDelete') }}</t-button
          >
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

    <save-dialog v-if="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/demo';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

defineOptions({
  name: 'DemoTenantExample',
});

const { t } = useI18n();

const selectedRowKeys = ref([]);
// 状态下拉（响应语言切换）
const statusOptions = computed(() => [
  { label: t('pages.demo.common.statusMap.disabled'), value: 0 },
  { label: t('pages.demo.common.statusMap.enabled'), value: 1 },
]);

const {
  loading,
  selection,
  searchForm,
  dialog,
  saveRef,
  pageParams,
  handleSearch,
  resetSearch,
  handleDelete,
  handleBatchDeleteConfirm,
  handleSaveSuccess,
  add,
  edit,
  show,
  handlePageChange,
  handleSizeChange,
  fetchData,
} = useTable(api.demoTenantExample, {
  defaultSearch: { title: '', status: '' },
});

// 表格列（响应语言切换）
const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'title', title: t('common.title'), ellipsis: true },
  { colKey: 'tenantId', title: t('pages.demo.demoTenantExample.tenantId'), width: 120 },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 80,
    align: 'center',
    cell: (h: any, { row }: any) => {
      const on = row.status === 1;
      const label = on ? t('pages.demo.common.statusMap.enabled') : t('pages.demo.common.statusMap.disabled');
      return h(Tag, { theme: on ? 'success' : 'default', variant: 'light' }, () => label);
    },
  },
  { colKey: 'createTime', title: t('common.createTime'), width: 160 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 180,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      // 权限码与后端 @SaCheckPermission 逐条对齐：
      // 修改=demo:tenant-example:edit / 删除=demo:tenant-example:delete
      btns.push(h('a', { onClick: () => show(row) }, t('common.view')));
      if (hasPermission('demo:tenant-example:edit')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (hasPermission('demo:tenant-example:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('common.confirmDelete'),
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

const onSelectChange = (selectedKeys: any, context: any) => {
  selectedRowKeys.value = selectedKeys;
  selection.value = context.selectedRowData || [];
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.demo-tenant-example-page {
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
