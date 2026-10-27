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
  <div class="demo-example-page">
    <t-card class="search-card">
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
        <t-form-item :label="t('common.type')" name="type">
          <t-select
            v-model="searchForm.type"
            :placeholder="t('common.pleaseSelect')"
            clearable
            :options="typeOptions"
          />
        </t-form-item>
        <t-form-item :label="t('pages.demo.common.recommend')" name="isRecommend">
          <t-select
            v-model="searchForm.isRecommend"
            :placeholder="t('common.pleaseSelect')"
            clearable
            :options="recommendOptions"
          />
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'demo:example:add'" theme="success" @click="add">{{ t('common.add') }}</t-button>
          <t-button
            v-permission="'demo:example:delete'"
            theme="danger"
            variant="outline"
            :disabled="selection.length === 0"
            @click="handleBatchDeleteConfirm"
            >{{ t('common.batchDelete') }}</t-button
          >
          <t-button v-permission="'demo:example:export'" theme="primary" variant="outline" @click="handleExport">{{
            t('common.export')
          }}</t-button>
          <t-button v-permission="'demo:example:import'" theme="primary" variant="text" @click="handleImportTemplate">{{
            t('common.downloadTemplate')
          }}</t-button>
          <t-upload
            v-permission="'demo:example:import'"
            :auto-upload="false"
            :show-upload-list="false"
            accept=".xlsx,.xls"
            theme="custom"
            @change="handleImportFile"
          >
            <t-button theme="warning" variant="outline">{{ t('common.import') }}</t-button>
          </t-upload>
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
import { DialogPlugin, MessagePlugin, Switch, Tag } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/demo';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

const { t } = useI18n();

const selectedRowKeys = ref([]);
// 下拉选项（响应语言切换）
const statusOptions = computed(() => [
  { label: t('pages.demo.common.statusMap.disabled'), value: 0 },
  { label: t('pages.demo.common.statusMap.enabled'), value: 1 },
]);
const typeOptions = computed(() => [
  { label: t('pages.demo.common.typeMap.a'), value: 'type_a' },
  { label: t('pages.demo.common.typeMap.b'), value: 'type_b' },
  { label: t('pages.demo.common.typeMap.c'), value: 'type_c' },
]);
const recommendOptions = computed(() => [
  { label: t('common.no'), value: 0 },
  { label: t('common.yes'), value: 1 },
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
} = useTable(api.demoExample, {
  defaultSearch: { title: '', status: '', type: '', isRecommend: '' },
});

// 表格列（响应语言切换）
const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'title', title: t('common.title'), ellipsis: true },
  { colKey: 'type', title: t('common.type'), width: 100 },
  { colKey: 'price', title: t('pages.demo.common.price'), width: 100 },
  { colKey: 'score', title: t('pages.demo.common.score'), width: 80 },
  { colKey: 'quantity', title: t('pages.demo.common.quantity'), width: 80 },
  { colKey: 'priority', title: t('pages.demo.common.priority'), width: 80 },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 80,
    align: 'center',
    cell: (h: any, { row }: any) =>
      h(Switch, {
        value: row.status,
        customValue: [1, 0],
        loading: row.statusLoading,
        // 状态开关直接写库（PUT /updateStatus），后端校验 demo:example:update；
        // 无该权限时置为禁用，避免点了被服务端 403
        disabled: !hasPermission('demo:example:update'),
        onChange: (val: any) => onStatusChange(row, val),
      }),
  },
  {
    colKey: 'isRecommend',
    title: t('pages.demo.common.recommend'),
    width: 80,
    align: 'center',
    cell: (h: any, { row }: any) => {
      const yes = row.isRecommend === 1;
      const label = yes ? t('common.yes') : t('common.no');
      return h(Tag, { theme: yes ? 'warning' : 'default', variant: 'light' }, () => label);
    },
  },
  { colKey: 'email', title: t('common.email'), ellipsis: true, width: 180 },
  { colKey: 'phone', title: t('common.phone'), width: 120 },
  { colKey: 'publishTime', title: t('pages.demo.common.publishTime'), width: 160 },
  { colKey: 'createTime', title: t('common.createTime'), width: 160 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 240,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      // 权限码与后端 @SaCheckPermission 逐条对齐：修改=demo:example:update / 删除=demo:example:delete
      btns.push(h('a', { onClick: () => show(row) }, t('common.view')));
      if (hasPermission('demo:example:update')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
      }
      if (hasPermission('demo:example:delete')) {
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

const handleExport = () => {
  api.demoExample
    .export(searchForm)
    .then(() => {
      MessagePlugin.success(t('common.exportSuccess'));
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
};

const handleImportTemplate = () => {
  api.demoExample
    .importTemplate()
    .then(() => {
      MessagePlugin.success(t('common.templateDownloaded'));
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
};

const handleImportFile = (files: any) => {
  // TDesign Upload 的 onChange 首参是**数组**（onChange?: (value: Array<T>, context) => void），
  // 旧写法从首参解构 { file } 恒为 undefined ⇒ 直接 return ⇒ 导入永远不发请求且无任何提示。
  const file = (Array.isArray(files) ? files[0] : files) as { raw?: File } | undefined;
  if (!file?.raw) return;
  api.demoExample
    .import(file.raw)
    .then(() => {
      MessagePlugin.success(t('common.importSuccess'));
      fetchData();
    })
    .catch(() => {
      // 错误提示已由 request 拦截器统一弹出，此处不重复 toast
    });
};

const onSelectChange = (selectedKeys: any, context: any) => {
  selectedRowKeys.value = selectedKeys;
  selection.value = context.selectedRowData || [];
};

const onStatusChange = async (row: any, val: any) => {
  row.statusLoading = true;
  try {
    const res = await api.demoExample.updateStatus(row.id, val);
    if (res && res.code === 200) {
      row.status = val;
      MessagePlugin.success(
        val === 1 ? t('pages.demo.common.message.enabled') : t('pages.demo.common.message.disabled'),
      );
    } else {
      MessagePlugin.error((res && res.message) || t('common.operateFail'));
    }
  } catch {
    MessagePlugin.error(t('common.operateFail'));
  } finally {
    row.statusLoading = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.demo-example-page {
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
