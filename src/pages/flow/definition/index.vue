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
  <div class="flow-definition-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.flow.common.processKey')" name="processKey">
          <t-input
            v-model="searchForm.processKey"
            :placeholder="t('pages.flow.common.placeholder.processKey')"
            clearable
          />
        </t-form-item>
        <t-form-item :label="t('pages.flow.common.category')" name="category">
          <t-select
            v-model="searchForm.category"
            :placeholder="t('pages.flow.definition.placeholder.category')"
            clearable
            style="width: 180px"
          >
            <t-option
              v-for="c in categoryOptions"
              :key="c.categoryCode"
              :value="c.categoryCode"
              :label="c.categoryName"
            />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button v-permission="'flow:process:deploy'" theme="success" @click="deployRef?.open()">{{
            t('pages.flow.definition.deploy')
          }}</t-button>
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

    <deploy-dialog
      ref="deployRef"
      v-model:visible="deployVisible"
      :category-options="categoryOptions"
      @success="fetchData"
    />
    <xml-view-dialog v-model:visible="xmlVisible" :content="xmlContent" />
    <diagram-view-dialog v-model:visible="diagramVisible" :loading="diagramLoading" :url="diagramUrl" />
  </div>
</template>
<script lang="ts" setup>
import { DialogPlugin, MessagePlugin, Tag } from 'tdesign-vue-next';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { category as categoryApi, loadDiagramObjectUrl, process } from '@/api/flow';
import { hasPermission } from '@/utils/permission';

import DeployDialog from './components/DeployDialog.vue';
import DiagramViewDialog from './components/DiagramViewDialog.vue';
import XmlViewDialog from './components/XmlViewDialog.vue';

defineOptions({
  name: 'FlowDefinition',
});

const { t } = useI18n();

const loading = ref(false);
const pageParams = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
  list: [],
});
const searchForm = reactive({ processKey: '', category: '' });
const categoryOptions = ref<{ categoryCode: string; categoryName: string }[]>([]);

const deployRef = ref<InstanceType<typeof DeployDialog>>();
const deployVisible = ref(false);

const xmlVisible = ref(false);
const xmlContent = ref('');

const diagramVisible = ref(false);
const diagramLoading = ref(false);
const diagramUrl = ref('');

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await process.definitionPage({
      processKey: searchForm.processKey || undefined,
      category: searchForm.category || undefined,
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

const handleSearch = () => {
  pageParams.pageNum = 1;
  fetchData();
};

const resetSearch = () => {
  searchForm.processKey = '';
  searchForm.category = '';
  handleSearch();
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

const loadCategoryOptions = async () => {
  try {
    const res = await categoryApi.listEnabled();
    categoryOptions.value = res?.data || res || [];
  } catch {
    categoryOptions.value = [];
  }
};

const handleSuspend = (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('pages.flow.definition.message.suspendTitle'),
    body: t('pages.flow.definition.message.suspendConfirm', { name: row.key || row.name }),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await process.suspendDefinition(row.id);
        if (res && res.code === 200) {
          MessagePlugin.success(t('pages.flow.definition.message.suspendSuccess'));
          fetchData();
        }
      } catch {
        // 错误提示已由 request 响应拦截器统一弹出，这里只吞掉 rejection，避免未捕获告警
      }
    },
  });
};

const handleActivate = (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('pages.flow.definition.message.activateTitle'),
    body: t('pages.flow.definition.message.activateConfirm', { name: row.key || row.name }),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await process.activateDefinition(row.id);
        if (res && res.code === 200) {
          MessagePlugin.success(t('pages.flow.definition.message.activateSuccess'));
          fetchData();
        }
      } catch {
        // 错误提示已由 request 响应拦截器统一弹出，这里只吞掉 rejection，避免未捕获告警
      }
    },
  });
};

const handleDelete = (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('pages.flow.definition.message.deleteTitle'),
    body: t('pages.flow.definition.message.deleteConfirm', { name: row.name || row.key }),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await process.deleteDeployment(row.deploymentId);
        if (res && res.code === 200) {
          MessagePlugin.success(t('common.deleteSuccess'));
          fetchData();
        }
      } catch {
        // 错误提示已由 request 响应拦截器统一弹出，这里只吞掉 rejection，避免未捕获告警
      }
    },
  });
};

const handleViewXml = async (row: any) => {
  try {
    const res = await process.getBpmnXml(row.id);
    xmlContent.value = res?.data || res || '';
    xmlVisible.value = true;
  } catch {
    // 错误提示已由 request 响应拦截器统一弹出，这里只吞掉 reject，避免未捕获告警
  }
};

const handleViewDiagram = async (row: any) => {
  diagramVisible.value = true;
  diagramLoading.value = true;
  // 释放上一次的 ObjectURL，避免内存泄漏
  if (diagramUrl.value) {
    URL.revokeObjectURL(diagramUrl.value);
    diagramUrl.value = '';
  }
  try {
    diagramUrl.value = await loadDiagramObjectUrl(process.getDiagramUrl(row.id));
  } catch (error) {
    // 失败必须留痕：完全吞掉异常只会让「流程图加载不出来」退化成没有线索的空状态，
    // 现场演示时既看不出原因、也没法定位。
    console.error('[flow] 流程图加载失败：', error);
    diagramUrl.value = '';
  } finally {
    diagramLoading.value = false;
  }
};

const columns = computed<any[]>(() => [
  { colKey: 'name', title: t('pages.flow.common.processName'), width: 180, ellipsis: true },
  { colKey: 'key', title: t('pages.flow.common.processKey'), width: 140 },
  { colKey: 'version', title: t('pages.flow.common.version'), width: 80, align: 'center' },
  { colKey: 'category', title: t('pages.flow.common.category'), width: 120, ellipsis: true },
  {
    colKey: 'suspended',
    title: t('common.status'),
    width: 100,
    align: 'center',
    cell: (h: any, { row }: any) => {
      const on = !row.suspended;
      const label = on ? t('pages.flow.common.statusMap.enabled') : t('pages.flow.common.statusMap.suspended');
      return h(Tag, { theme: on ? 'success' : 'warning', variant: 'light' }, () => label);
    },
  },
  {
    colKey: 'deploymentTime',
    title: t('pages.flow.definition.deploymentTime'),
    width: 170,
    cell: (h: any, { row }: any) => row.deploymentTime || '-',
  },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 320,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      if (hasPermission('flow:process:view')) {
        btns.push(h('a', { onClick: () => handleViewXml(row) }, 'XML'));
        btns.push(h('a', { onClick: () => handleViewDiagram(row) }, t('pages.flow.definition.diagram')));
      }
      if (hasPermission('flow:process:deploy')) {
        if (row.suspended) {
          btns.push(
            h(
              'a',
              { style: 'color:var(--td-success-color)', onClick: () => handleActivate(row) },
              t('pages.flow.definition.action.activate'),
            ),
          );
        } else {
          btns.push(
            h(
              'a',
              { style: 'color:var(--td-warning-color)', onClick: () => handleSuspend(row) },
              t('pages.flow.definition.action.suspend'),
            ),
          );
        }
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => handleDelete(row),
            },
            t('common.delete'),
          ),
        );
      }
      return h('div', { style: 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;' }, btns);
    },
  },
]);

onMounted(() => {
  loadCategoryOptions();
  fetchData();
});

onBeforeUnmount(() => {
  if (diagramUrl.value) {
    URL.revokeObjectURL(diagramUrl.value);
  }
});
</script>
<style scoped lang="less">
.flow-definition-page {
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
