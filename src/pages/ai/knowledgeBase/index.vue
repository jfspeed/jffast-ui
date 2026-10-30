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
  <div class="ai-knowledge-base-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.ai.knowledgeBase.name')" name="name">
          <t-input v-model="searchForm.name" :placeholder="t('pages.ai.knowledgeBase.placeholder.name')" clearable />
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
          <t-button v-permission="'ai:knowledge-base:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card>
      <t-alert theme="info" :close="false" class="tips">
        {{ t('pages.ai.knowledgeBase.alert.tips1') }}<b>{{ t('pages.ai.knowledgeBase.alert.tipsStrong') }}</b
        >{{ t('pages.ai.knowledgeBase.alert.tips2') }}
      </t-alert>

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
import { DialogPlugin } from 'tdesign-vue-next';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/ai';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

defineOptions({
  name: 'AiKnowledgeBase',
});

const { t } = useI18n();

// 状态下拉（响应语言切换）
const statusOptions = computed(() => [
  { label: t('pages.ai.common.statusMap.disabled'), value: 0 },
  { label: t('pages.ai.common.statusMap.enabled'), value: 1 },
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
} = useTable(api.knowledgeBase, {
  defaultSearch: { name: '', status: '' },
});

// 表格列（响应语言切换）
const columns = computed<any[]>(() => [
  { colKey: 'name', title: t('pages.ai.knowledgeBase.name'), ellipsis: true },
  { colKey: 'code', title: t('common.code'), width: 160, ellipsis: true },
  { colKey: 'embeddingModel', title: t('pages.ai.knowledgeBase.embeddingModel'), width: 180, ellipsis: true },
  { colKey: 'chunkSize', title: t('pages.ai.knowledgeBase.chunkSize'), width: 100 },
  { colKey: 'chunkOverlap', title: t('pages.ai.knowledgeBase.chunkOverlap'), width: 100 },
  { colKey: 'description', title: t('common.description'), ellipsis: true },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 80,
    align: 'center',
    cell: (h: any, { row }: any) =>
      row.status === 1 ? t('pages.ai.common.statusMap.enabled') : t('pages.ai.common.statusMap.disabled'),
  },
  { colKey: 'createTime', title: t('common.createTime'), width: 170 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 180,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) =>
      h('div', { style: 'display:flex;gap:8px;justify-content:center;' }, [
        // 操作列按权限渲染：没有对应权限的人不该看到点下去必然 403 的入口
        hasPermission('ai:knowledge-base:edit') ? h('a', { onClick: () => edit(row) }, t('common.edit')) : null,
        hasPermission('ai:knowledge-base:delete')
          ? h(
              'a',
              {
                style: 'color:var(--td-error-color)',
                onClick: () => {
                  const confirmDia = DialogPlugin.confirm({
                    header: t('common.tips'),
                    body: t('pages.ai.knowledgeBase.message.confirmDelete'),
                    onConfirm: () => {
                      confirmDia.destroy();
                      handleDelete(row);
                    },
                  });
                },
              },
              t('common.delete'),
            )
          : null,
      ]),
  },
]);

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.ai-knowledge-base-page {
  .search-card {
    margin-bottom: 16px;
  }

  .tips {
    margin-bottom: 16px;
  }

  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }
}
</style>
