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
  <div class="system-job-log-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearchEx">
        <t-form-item :label="t('pages.system.jobLog.jobName')" name="jobName">
          <t-input v-model="searchForm.jobName" :placeholder="t('pages.system.jobLog.placeholder.jobName')" clearable />
        </t-form-item>
        <t-form-item :label="t('pages.system.jobLog.execStatus')" name="status">
          <t-select v-model="searchForm.status" :placeholder="t('pages.system.jobLog.placeholder.status')" clearable>
            <t-option :value="1" :label="t('common.success')" />
            <t-option :value="2" :label="t('common.fail')" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
          <t-button
            v-permission="'system:job:log:clean'"
            theme="danger"
            style="margin-left: 8px"
            @click="handleClean"
            >{{ t('pages.system.jobLog.clean') }}</t-button
          >
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
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { DialogPlugin, MessagePlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { jobLog } from '@/api/job';
import { useTable } from '@/hooks/useTable';

// 组件名必须与路由名一致（`system.ts` 的 name: 'SystemJobLog'；keep-alive :include 用 route.name，Vue 按组件名匹配）
defineOptions({
  name: 'SystemJobLog',
});

const { t } = useI18n();
const route = useRoute();

const { loading, searchForm, pageParams, handleSearch, resetSearch, handlePageChange, handleSizeChange, fetchData } =
  useTable(jobLog, {
    defaultSearch: { jobName: '', jobGroup: '', status: null },
  });

const resetSearchEx = () => {
  resetSearch();
};

const handleClean = () => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.jobLog.message.cleanConfirm'),
    theme: 'warning',
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await jobLog.clean();
        if (res.code === 200) {
          MessagePlugin.success(t('common.clearSuccess'));
          fetchData();
        } else {
          MessagePlugin.error(res.message || t('common.clearFail'));
        }
      } catch (e: any) {
        MessagePlugin.error(e.message || t('common.clearFail'));
      }
    },
  });
};

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'jobName', title: t('pages.system.jobLog.jobName'), width: 150 },
  { colKey: 'jobGroup', title: t('pages.system.jobLog.jobGroup'), width: 120 },
  { colKey: 'invokeTarget', title: t('pages.system.jobLog.invokeTarget'), width: 220, ellipsis: true },
  {
    colKey: 'status',
    title: t('pages.system.jobLog.execStatus'),
    width: 100,
    align: 'center',
    cell: (h, { row }) => {
      const ok = row.status === 1;
      const theme = ok ? 'success' : 'danger';
      const label = ok ? t('common.success') : t('common.fail');
      return h(Tag, { theme, variant: 'light' }, () => label);
    },
  },
  {
    colKey: 'duration',
    title: t('pages.system.jobLog.duration'),
    width: 100,
    align: 'right',
    cell: (h, { row }) => (row.duration != null ? `${row.duration}ms` : '-'),
  },
  {
    colKey: 'errorMsg',
    title: t('pages.system.jobLog.errorMsg'),
    width: 200,
    ellipsis: true,
    cell: (h, { row }) => row.errorMsg || '-',
  },
  {
    colKey: 'startTime',
    title: t('pages.system.jobLog.startTime'),
    width: 170,
    cell: (h, { row }) => row.startTime || '-',
  },
  {
    colKey: 'endTime',
    title: t('pages.system.jobLog.endTime'),
    width: 170,
    cell: (h, { row }) => row.endTime || '-',
  },
]);

onMounted(() => {
  // 必须用 useRoute()：旧写法读 window.$router.currentRoute，而本仓从未给 window.$router 赋值
  // ⇒ query 恒为 undefined ⇒ 从「定时任务」跳转过来时 jobName/jobGroup 预筛选永远不生效。
  const query = route.query as { jobName?: string; jobGroup?: string };
  if (query?.jobName) {
    searchForm.jobName = query.jobName;
  }
  if (query?.jobGroup) {
    searchForm.jobGroup = query.jobGroup;
  }
  fetchData();
});
</script>
<style scoped lang="less">
.system-job-log-page {
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
