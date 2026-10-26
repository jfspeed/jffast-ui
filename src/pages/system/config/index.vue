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
  <div class="system-config-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.system.config.configName')" name="configName">
          <t-input
            v-model="searchForm.configName"
            :placeholder="t('pages.system.config.placeholder.configName')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('pages.system.config.configKey')" name="configKey">
          <t-input
            v-model="searchForm.configKey"
            :placeholder="t('pages.system.config.placeholder.configKey')"
            clearable
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'system:config:add'" theme="success" @click="add">{{
            t('pages.system.config.add')
          }}</t-button>
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

    <save-dialog v-if="dialog.save" ref="saveRef" @success="handleSaveSuccess" @closed="dialog.save = false" />
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/system';
import { useTable } from '@/hooks/useTable';

import saveDialog from './save.vue';

const { t } = useI18n();

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'configName', title: t('pages.system.config.configName'), width: 160 },
  { colKey: 'configKey', title: t('pages.system.config.configKey'), width: 220 },
  { colKey: 'configValue', title: t('pages.system.config.configValue'), ellipsis: true },
  {
    colKey: 'systemBuiltin',
    title: t('pages.system.config.builtin'),
    width: 80,
    align: 'center',
    cell: (h, { row }) => {
      const builtin = row.systemBuiltin === 1;
      const theme = builtin ? 'warning' : 'default';
      const label = builtin ? t('pages.system.config.builtinMap.builtin') : t('pages.system.config.builtinMap.custom');
      return h(Tag, { theme, variant: 'light' }, () => label);
    },
  },
  { colKey: 'remark', title: t('common.remark'), ellipsis: true },
  { colKey: 'createTime', title: t('common.createTime'), width: 160 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 120,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) =>
      h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, [
        h('a', { onClick: () => edit(row) }, t('common.edit')),
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
      ]),
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
} = useTable(api.config, {
  defaultSearch: { configName: '', configKey: '' },
});

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.system-config-page {
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
