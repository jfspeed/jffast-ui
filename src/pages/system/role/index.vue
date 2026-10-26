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
  <div class="system-role-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.system.role.roleName')" name="roleName">
          <t-input v-model="searchForm.roleName" :placeholder="t('pages.system.role.placeholder.roleName')" clearable />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'system:role:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
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
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin } from 'tdesign-vue-next';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { ROLE_SUPER_ADMIN } from '@/constants';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

const { t } = useI18n();

const dataScopeMap = computed<Record<string, string>>(() => ({
  1: t('pages.system.role.dataScopeMap.all'),
  2: t('pages.system.role.dataScopeMap.deptAndChildren'),
  3: t('pages.system.role.dataScopeMap.dept'),
  4: t('pages.system.role.dataScopeMap.self'),
  5: t('pages.system.role.dataScopeMap.custom'),
}));

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'roleName', title: t('pages.system.role.roleName'), width: 150 },
  { colKey: 'roleKey', title: t('pages.system.role.roleKey'), width: 150 },
  {
    colKey: 'dataScope',
    title: t('pages.system.role.dataScope'),
    width: 150,
    cell: (h, { row }) => dataScopeMap.value[row.dataScope] || '-',
  },
  { colKey: 'remark', title: t('common.remark'), ellipsis: true },
  {
    colKey: 'createTime',
    title: t('common.createTime'),
    width: 170,
    cell: (h, { row }) => row.createTime || '-',
  },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 200,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const btns = [];
      if (row.roleKey !== ROLE_SUPER_ADMIN) {
        if (hasPermission('system:role:update')) {
          btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
        }
        if (hasPermission('system:role:delete')) {
          btns.push(
            h(
              'a',
              {
                style: 'color:var(--td-error-color)',
                onClick: () => {
                  const confirmDia = DialogPlugin.confirm({
                    header: t('common.tips'),
                    body: t('pages.system.role.message.confirmDelete'),
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
      }
      return h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, btns);
    },
  },
]);

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
  handlePageChange,
  handleSizeChange,
  fetchData,
} = useTable(api.role, {
  defaultSearch: { roleName: '' },
});

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.system-role-page {
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
