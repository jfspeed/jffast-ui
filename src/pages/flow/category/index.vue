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
  <div class="flow-category-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.flow.category.categoryName')" name="categoryName">
          <t-input
            v-model="searchForm.categoryName"
            :placeholder="t('pages.flow.category.placeholder.categoryName')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('pages.flow.category.categoryCode')" name="categoryCode">
          <t-input
            v-model="searchForm.categoryCode"
            :placeholder="t('pages.flow.category.placeholder.categoryCode')"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'flow:category:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>

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

    <save-dialog v-if="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />
  </div>
</template>
<script lang="ts" setup>
import { DialogPlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { category } from '@/api/flow';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

const { t } = useI18n();

const {
  loading,
  searchForm,
  dialog,
  saveRef,
  pageParams,
  handleSearch,
  resetSearch,
  handleDelete,
  handleSaveSuccess,
  add,
  edit,
  show,
  handlePageChange,
  handleSizeChange,
  fetchData,
} = useTable(category, {
  defaultSearch: { categoryName: '', categoryCode: '' },
});

const columns = computed<any[]>(() => [
  { colKey: 'categoryCode', title: t('pages.flow.category.categoryCode'), width: 160 },
  { colKey: 'categoryName', title: t('pages.flow.category.categoryName'), width: 180 },
  { colKey: 'sort', title: t('common.sort'), width: 80, align: 'center' },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 100,
    align: 'center',
    cell: (h: any, { row }: any) => {
      const on = row.status === 0;
      const label = on ? t('pages.flow.common.statusMap.enabled') : t('pages.flow.common.statusMap.disabled');
      return h(Tag, { theme: on ? 'success' : 'danger', variant: 'light' }, () => label);
    },
  },
  { colKey: 'remark', title: t('common.remark'), ellipsis: true },
  {
    colKey: 'createTime',
    title: t('common.createTime'),
    width: 170,
    cell: (h: any, { row }: any) => row.createTime || '-',
  },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 200,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      if (hasPermission('flow:category:view')) {
        btns.push(h('a', { onClick: () => show(row) }, t('common.view')));
      }
      if (hasPermission('flow:category:update')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (hasPermission('flow:category:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.flow.category.message.confirmDelete', { name: row.categoryName }),
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

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.flow-category-page {
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
