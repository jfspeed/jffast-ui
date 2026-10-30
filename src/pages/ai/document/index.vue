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
  <div class="ai-document-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.ai.document.title')" name="title">
          <t-input v-model="searchForm.title" :placeholder="t('pages.ai.document.placeholder.title')" clearable />
        </t-form-item>
        <t-form-item :label="t('pages.ai.common.kb')" name="kbId">
          <t-select
            v-model="searchForm.kbId"
            :placeholder="t('common.pleaseSelect')"
            clearable
            filterable
            :options="kbOptions"
            style="width: 200px"
          />
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
          <t-button v-permission="'ai:document:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
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

    <save-dialog
      v-if="dialog.save"
      ref="saveRef"
      :kb-options="kbOptions"
      @success="handleSaveSuccess"
      @closed="dialog.save = false"
    />
  </div>
</template>
<script lang="ts" setup>
import { DialogPlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/ai';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

defineOptions({
  name: 'AiDocument',
});

const { t } = useI18n();

// 状态下拉（响应语言切换）
const statusOptions = computed(() => [
  { label: t('pages.ai.common.statusMap.pending'), value: 0 },
  { label: t('pages.ai.common.statusMap.processed'), value: 1 },
  { label: t('pages.ai.common.statusMap.failed'), value: 2 },
]);

const statusTheme: Record<string, string> = { 0: 'warning', 1: 'success', 2: 'danger' };
// 状态文案（响应语言切换）
const statusText = computed<Record<string, string>>(() => ({
  0: t('pages.ai.common.statusMap.pending'),
  1: t('pages.ai.common.statusMap.processed'),
  2: t('pages.ai.common.statusMap.failed'),
}));

const kbOptions = ref<{ label: string; value: any }[]>([]);

const loadKbOptions = async () => {
  const res = await api.knowledgeBase.page({ pageNo: 1, pageSize: 1000 });
  const list = res?.data?.list || [];
  kbOptions.value = list.map((v: any) => ({ label: v.name, value: v.id }));
};

const kbName = (kbId: any) => kbOptions.value.find((v) => v.value === kbId)?.label || kbId || '-';

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
} = useTable(api.document, {
  defaultSearch: { title: '', kbId: '', status: '' },
});

// 表格列（响应语言切换）
const columns = computed<any[]>(() => [
  { colKey: 'title', title: t('pages.ai.document.title'), ellipsis: true },
  {
    colKey: 'kbId',
    title: t('pages.ai.common.kb'),
    width: 160,
    ellipsis: true,
    cell: (h: any, { row }: any) => kbName(row.kbId),
  },
  { colKey: 'contentType', title: t('pages.ai.document.contentType'), width: 110 },
  { colKey: 'sourceType', title: t('pages.ai.document.source'), width: 100 },
  { colKey: 'chunkCount', title: t('pages.ai.document.chunkCount'), width: 90 },
  { colKey: 'tokenCount', title: 'Token', width: 90 },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 100,
    align: 'center',
    cell: (h: any, { row }: any) =>
      h(
        Tag,
        { theme: statusTheme[row.status] || 'default', variant: 'light' },
        () => statusText.value[row.status] || '-',
      ),
  },
  { colKey: 'createTime', title: t('common.createTime'), width: 170 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 180,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      // 权限码与后端 @SaCheckPermission 逐条对齐：修改=ai:document:edit / 删除=ai:document:delete
      btns.push(h('a', { onClick: () => show(row) }, t('common.view')));
      if (hasPermission('ai:document:edit')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (hasPermission('ai:document:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.ai.document.message.confirmDelete'),
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

onMounted(async () => {
  await loadKbOptions();
  fetchData();
});
</script>
<style scoped lang="less">
.ai-document-page {
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
