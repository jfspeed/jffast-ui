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
  <div class="dashboard-container">
    <t-row :gutter="16">
      <t-col :xs="12" :sm="6" :lg="3">
        <t-card class="stat-card" :bordered="false" hover-shadow>
          <div class="stat-card-inner">
            <div class="stat-icon" style="background: var(--td-brand-color-light)">
              <t-icon name="user" size="28px" style="color: var(--td-brand-color)" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.userCount }}</div>
              <div class="stat-label">{{ t('pages.dashboardBase.stats.userCount') }}</div>
            </div>
          </div>
        </t-card>
      </t-col>
      <t-col :xs="12" :sm="6" :lg="3">
        <t-card class="stat-card" :bordered="false" hover-shadow>
          <div class="stat-card-inner">
            <div class="stat-icon" style="background: var(--td-success-color-light)">
              <t-icon name="time" size="28px" style="color: var(--td-success-color)" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.todayLogCount }}</div>
              <div class="stat-label">{{ t('pages.dashboardBase.stats.todayLogCount') }}</div>
            </div>
          </div>
        </t-card>
      </t-col>
      <t-col :xs="12" :sm="6" :lg="3">
        <t-card class="stat-card" :bordered="false" hover-shadow>
          <div class="stat-card-inner">
            <div class="stat-icon" style="background: var(--td-warning-color-light)">
              <t-icon name="check-circle" size="28px" style="color: var(--td-warning-color)" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.successLogCount }}</div>
              <div class="stat-label">{{ t('pages.dashboardBase.stats.successLogCount') }}</div>
            </div>
          </div>
        </t-card>
      </t-col>
      <t-col :xs="12" :sm="6" :lg="3">
        <t-card class="stat-card" :bordered="false" hover-shadow>
          <div class="stat-card-inner">
            <div class="stat-icon" style="background: var(--td-error-color-light)">
              <t-icon name="close-circle" size="28px" style="color: var(--td-error-color)" />
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stats.failLogCount }}</div>
              <div class="stat-label">{{ t('pages.dashboardBase.stats.failLogCount') }}</div>
            </div>
          </div>
        </t-card>
      </t-col>
    </t-row>

    <t-row :gutter="16" style="margin-top: 16px">
      <t-col :xs="12" :lg="8">
        <t-card :title="t('pages.dashboardBase.chart.trendTitle')" :bordered="false">
          <div ref="chartRef" class="chart-container"></div>
        </t-card>
      </t-col>
      <t-col :xs="12" :lg="4">
        <t-card :title="t('pages.dashboardBase.quickEntry.title')" :bordered="false">
          <div class="quick-entry">
            <div class="entry-item" @click="router.push('/system/user')">
              <t-icon name="user" size="24px" style="color: var(--td-brand-color)" />
              <span>{{ t('pages.dashboardBase.quickEntry.user') }}</span>
            </div>
            <div class="entry-item" @click="router.push('/system/role')">
              <t-icon name="usergroup" size="24px" style="color: var(--td-success-color)" />
              <span>{{ t('pages.dashboardBase.quickEntry.role') }}</span>
            </div>
            <div class="entry-item" @click="router.push('/system/menu')">
              <t-icon name="menu" size="24px" style="color: var(--td-warning-color)" />
              <span>{{ t('pages.dashboardBase.quickEntry.menu') }}</span>
            </div>
            <div class="entry-item" @click="router.push('/system/dept')">
              <t-icon name="organization" size="24px" style="color: var(--td-error-color)" />
              <span>{{ t('pages.dashboardBase.quickEntry.dept') }}</span>
            </div>
            <div class="entry-item" @click="router.push('/system/dict')">
              <t-icon name="books" size="24px" style="color: #8b5cf6" />
              <span>{{ t('pages.dashboardBase.quickEntry.dict') }}</span>
            </div>
            <div class="entry-item" @click="router.push('/system/log')">
              <t-icon name="file-copy" size="24px" style="color: #ec4899" />
              <span>{{ t('pages.dashboardBase.quickEntry.log') }}</span>
            </div>
          </div>
        </t-card>
      </t-col>
    </t-row>

    <t-row :gutter="16" style="margin-top: 16px">
      <t-col :span="12">
        <t-card :title="t('pages.dashboardBase.recentLogs.title')" :bordered="false">
          <t-table :data="recentLogs" :columns="logColumns" row-key="id" size="small" stripe />
        </t-card>
      </t-col>
    </t-row>
  </div>
</template>
<script lang="ts" setup>
import * as echarts from 'echarts';
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { Tag } from 'tdesign-vue-next';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import api from '@/api/system';

defineOptions({
  name: 'DashboardBase',
});

const { t } = useI18n();
const router = useRouter();

const stats = ref({
  userCount: 0,
  todayLogCount: 0,
  successLogCount: 0,
  failLogCount: 0,
});

const recentLogs = ref([]);
const chartRef = ref(null);
let chartInstance: ReturnType<typeof echarts.init> | null = null;

// computed：语言切换时列标题自动更新
const logColumns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'createBy', title: t('pages.dashboardBase.recentLogs.colUser'), width: 100 },
  { colKey: 'title', title: t('pages.dashboardBase.recentLogs.colTitle'), width: 120 },
  { colKey: 'ip', title: t('pages.dashboardBase.recentLogs.colIp'), width: 130 },
  {
    colKey: 'state',
    title: t('pages.dashboardBase.recentLogs.colState'),
    width: 80,
    align: 'center',
    cell: (h, { row }) =>
      h(
        Tag,
        { theme: row.state === '成功' ? 'success' : 'danger', variant: 'light', size: 'small' },
        () => row.state || '-',
      ),
  },
  { colKey: 'createTime', title: t('pages.dashboardBase.recentLogs.colTime'), width: 170 },
]);

const loadStats = async () => {
  try {
    const res = await api.dashboard.stats();
    if (res.code === 200) {
      stats.value = res.data;
    }
  } catch (e) {
    console.error(t('pages.dashboardBase.error.loadStats'), e);
  }
};

const loadRecentLogs = async () => {
  try {
    const res = await api.dashboard.recentLogs();
    if (res.code === 200) {
      recentLogs.value = res.data || [];
    }
  } catch (e) {
    console.error(t('pages.dashboardBase.error.loadLogs'), e);
  }
};

const loadLogTrend = async () => {
  try {
    const res = await api.dashboard.logTrend();
    if (res.code === 200) {
      renderChart(res.data || []);
    }
  } catch (e) {
    console.error(t('pages.dashboardBase.error.loadTrend'), e);
  }
};

/** 日志趋势行（后端 logTrend 返回） */
interface LogTrendRow {
  date: string;
  count: number;
  successCount: number;
}

const renderChart = (data: LogTrendRow[]) => {
  if (!chartRef.value) return;

  initChart(data);
};

const initChart = (data: LogTrendRow[]) => {
  if (!chartRef.value) return;

  // 幂等：同 DOM 只 init 一次，重复调用复用实例（echarts 重复 init 会告警且旧实例泄漏）
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const dates = data.map((d) => d.date.substring(5));
  const counts = data.map((d) => d.count);
  const successCounts = data.map((d) => d.successCount);

  chartInstance.setOption({
    tooltip: {
      trigger: 'axis',
    },
    legend: {
      data: [t('pages.dashboardBase.chart.totalCount'), t('pages.dashboardBase.chart.successCount')],
      bottom: 0,
    },
    grid: {
      top: 20,
      left: 40,
      right: 20,
      bottom: 40,
    },
    xAxis: {
      type: 'category',
      data: dates,
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
    },
    series: [
      {
        name: t('pages.dashboardBase.chart.totalCount'),
        type: 'bar',
        data: counts,
        itemStyle: {
          color: '#0052D9',
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 30,
      },
      {
        name: t('pages.dashboardBase.chart.successCount'),
        type: 'line',
        data: successCounts,
        smooth: true,
        itemStyle: {
          color: '#2BA471',
        },
        lineStyle: {
          width: 2,
        },
      },
    ],
  });
};

const handleResize = () => {
  chartInstance?.resize();
};

onMounted(async () => {
  await Promise.allSettled([loadStats(), loadRecentLogs(), loadLogTrend()]);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>
<style scoped lang="less">
.dashboard-container {
  padding: 16px;

  .stat-card {
    .stat-card-inner {
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .stat-info {
        .stat-value {
          font-size: 28px;
          font-weight: 600;
          color: var(--td-text-color-primary);
          line-height: 1.2;
        }

        .stat-label {
          font-size: 14px;
          color: var(--td-text-color-secondary);
          margin-top: 4px;
        }
      }
    }
  }

  .chart-container {
    height: 300px;
    width: 100%;
  }

  .quick-entry {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .entry-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;

      span {
        font-size: 13px;
        color: var(--td-text-color-primary);
      }

      &:hover {
        background: var(--td-bg-color-container-hover);
        transform: translateY(-2px);
      }
    }
  }
}
</style>
