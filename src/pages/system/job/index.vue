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
  <div class="system-job-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.system.job.jobName')" name="jobName">
          <t-input v-model="searchForm.jobName" :placeholder="t('pages.system.job.placeholder.jobName')" clearable />
        </t-form-item>
        <t-form-item :label="t('pages.system.job.jobGroup')" name="jobGroup">
          <t-input v-model="searchForm.jobGroup" :placeholder="t('pages.system.job.placeholder.jobGroup')" clearable />
        </t-form-item>
        <t-form-item :label="t('common.status')" name="status">
          <t-select v-model="searchForm.status" :placeholder="t('pages.system.job.placeholder.status')" clearable>
            <t-option :value="1" :label="t('common.normal')" />
            <t-option :value="0" :label="t('pages.system.job.paused')" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card>
      <template #actions>
        <t-button v-permission="'system:job:add'" theme="primary" @click="add">{{
          t('pages.system.job.add')
        }}</t-button>
      </template>

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
import { DialogPlugin, MessagePlugin, Tag } from 'tdesign-vue-next';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { job } from '@/api/job';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

import saveDialog from './save.vue';

defineOptions({
  name: 'SystemJob',
});

const { t } = useI18n();
const router = useRouter();

const {
  loading,
  searchForm,
  pageParams,
  dialog,
  saveRef,
  handleSearch,
  resetSearch,
  handlePageChange,
  handleSizeChange,
  fetchData,
  add,
  edit,
  handleDelete,
  handleSaveSuccess,
} = useTable(job, {
  defaultSearch: { jobName: '', jobGroup: '', status: null },
});

const handlePause = async (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.job.message.pauseConfirm', { name: row.jobName }),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await job.pause(row.id);
        if (res.code === 200) {
          MessagePlugin.success(t('pages.system.job.message.pauseSuccess'));
          fetchData();
        } else {
          MessagePlugin.error(res.message || t('pages.system.job.message.pauseFail'));
        }
      } catch (e: any) {
        MessagePlugin.error(e.message || t('pages.system.job.message.pauseFail'));
      }
    },
  });
};

const handleResume = async (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.job.message.resumeConfirm', { name: row.jobName }),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await job.resume(row.id);
        if (res.code === 200) {
          MessagePlugin.success(t('pages.system.job.message.resumeSuccess'));
          fetchData();
        } else {
          MessagePlugin.error(res.message || t('pages.system.job.message.resumeFail'));
        }
      } catch (e: any) {
        MessagePlugin.error(e.message || t('pages.system.job.message.resumeFail'));
      }
    },
  });
};

const handleTrigger = async (row: any) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('common.tips'),
    body: t('pages.system.job.message.triggerConfirm', { name: row.jobName }),
    onConfirm: async () => {
      confirmDia.destroy();
      try {
        const res = await job.trigger(row.id);
        if (res.code === 200) {
          MessagePlugin.success(t('pages.system.job.message.triggerSuccess'));
        } else {
          MessagePlugin.error(res.message || t('pages.system.job.message.triggerFail'));
        }
      } catch (e: any) {
        MessagePlugin.error(e.message || t('pages.system.job.message.triggerFail'));
      }
    },
  });
};

const handleViewLog = (row: any) => {
  // 必须用 useRouter()：本仓从未给 window.$router 赋值（应用走 app.use(router) → globalProperties），
  // 旧写法 (window as any).$router?.push(...) 可选链短路 → 点了没反应且无任何报错。
  // 按路由名跳：本项目静态路由与菜单驱动路由是两套 URL（静态 /system/job/log），写死 path 在菜单调整后会失效
  router.push({ name: 'SystemJobLog', query: { jobName: row.jobName, jobGroup: row.jobGroup } });
};

const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'jobName', title: t('pages.system.job.jobName'), width: 150 },
  { colKey: 'jobGroup', title: t('pages.system.job.jobGroup'), width: 120 },
  {
    // 任务的「执行服务」（sys_job.service_name）：
    //   注解 @JfFastJob 登记的任务，归属自动 = 声明它的服务名；
    //   留空表示"无归属"，由 jffast.job.scheduler.default-scope=true 的默认调度者执行
    //   （单体部署即唯一进程；微服务部署时填对应服务名）。
    // 归属概念的意义：避免多个服务共享同一套任务表时，同一任务被重复调度执行。
    colKey: 'serviceName',
    title: t('pages.system.job.serviceName'),
    width: 170,
    cell: (h, { row }) => {
      const theme = row.serviceName ? 'primary' : 'default';
      return h(Tag, { theme, variant: 'light' }, () => row.serviceName || t('pages.system.job.defaultScheduler'));
    },
  },
  { colKey: 'invokeTarget', title: t('pages.system.job.invokeTarget'), width: 220, ellipsis: true },
  { colKey: 'cronExpression', title: t('pages.system.job.cronExpression'), width: 140 },
  {
    colKey: 'status',
    title: t('common.status'),
    width: 100,
    align: 'center',
    cell: (h, { row }) => {
      const ok = row.status === 1;
      const theme = ok ? 'success' : 'warning';
      const label = ok ? t('common.normal') : t('pages.system.job.paused');
      return h(Tag, { theme, variant: 'light' }, () => label);
    },
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
    width: 260,
    align: 'center',
    fixed: 'right',
    cell: (h, { row }) => {
      const btns = [];
      if (hasPermission('system:job:update')) {
        btns.push(h('a', { onClick: () => edit(row) }, t('common.edit')));
        if (row.status === 1) {
          btns.push(h('a', { onClick: () => handlePause(row) }, t('pages.system.job.pause')));
        } else {
          btns.push(h('a', { onClick: () => handleResume(row) }, t('pages.system.job.resume')));
        }
      }
      if (hasPermission('system:job:trigger')) {
        btns.push(h('a', { onClick: () => handleTrigger(row) }, t('pages.system.job.trigger')));
      }
      btns.push(h('a', { onClick: () => handleViewLog(row) }, t('pages.system.job.viewLog')));
      if (hasPermission('system:job:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.system.job.message.deleteConfirm'),
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
      return h('div', { style: 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap;' }, btns);
    },
  },
]);

onMounted(() => {
  fetchData();
});
</script>
<style scoped lang="less">
.system-job-page {
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
