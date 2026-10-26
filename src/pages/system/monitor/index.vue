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
  <div class="monitor-container">
    <t-row :gutter="16">
      <!-- 服务器信息 -->
      <t-col :span="12">
        <t-card :title="t('pages.system.monitor.serverInfoTitle')" class="monitor-card">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.osName') }}</span>
              <span class="info-value">{{ serverInfo.osName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.osArch') }}</span>
              <span class="info-value">{{ serverInfo.osArch }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.serverIp') }}</span>
              <span class="info-value">{{ serverInfo.serverIp }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.cpuCores') }}</span>
              <span class="info-value">{{ serverInfo.cpuCores }}</span>
            </div>
          </div>
          <t-divider />
          <div class="progress-item">
            <div class="progress-header">
              <span>{{ t('pages.system.monitor.cpuUsage') }}</span>
              <span>{{ (serverInfo.cpuUsage * 100).toFixed(1) }}%</span>
            </div>
            <t-progress :percentage="serverInfo.cpuUsage * 100" :color="getProgressColor(serverInfo.cpuUsage)" />
          </div>
          <div class="progress-item">
            <div class="progress-header">
              <span>{{ t('pages.system.monitor.memoryUsage') }}</span>
              <span
                >{{ (serverInfo.memoryUsage * 100).toFixed(1) }}% ({{ serverInfo.usedMemory }}MB /
                {{ serverInfo.totalMemory }}MB)</span
              >
            </div>
            <t-progress :percentage="serverInfo.memoryUsage * 100" :color="getProgressColor(serverInfo.memoryUsage)" />
          </div>
        </t-card>
      </t-col>

      <!-- JVM 信息 -->
      <t-col :span="12">
        <t-card :title="t('pages.system.monitor.jvmInfoTitle')" class="monitor-card">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.jvmName') }}</span>
              <span class="info-value">{{ jvmInfo.jvmName }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.jvmVersion') }}</span>
              <span class="info-value">{{ jvmInfo.jvmVersion }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.jvmVendor') }}</span>
              <span class="info-value">{{ jvmInfo.jvmVendor }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.uptime') }}</span>
              <span class="info-value">{{ jvmInfo.upTimeStr }}</span>
            </div>
          </div>
          <t-divider />
          <div class="progress-item">
            <div class="progress-header">
              <span>{{ t('pages.system.monitor.heapUsage') }}</span>
              <span
                >{{ (jvmInfo.heapUsage * 100).toFixed(1) }}% ({{ jvmInfo.heapUsed }}MB / {{ jvmInfo.heapMax }}MB)</span
              >
            </div>
            <t-progress :percentage="jvmInfo.heapUsage * 100" :color="getProgressColor(jvmInfo.heapUsage)" />
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.nonHeap') }}</span>
              <span class="info-value">{{ jvmInfo.nonHeapUsed }} MB</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.threadCount') }}</span>
              <span class="info-value"
                >{{ jvmInfo.threadCount }} ({{ t('pages.system.monitor.daemon') }}:
                {{ jvmInfo.daemonThreadCount }})</span
              >
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.gcCount') }}</span>
              <span class="info-value">{{ jvmInfo.gcCount }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.monitor.gcTime') }}</span>
              <span class="info-value">{{ jvmInfo.gcTime }} ms</span>
            </div>
          </div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 磁盘信息 -->
    <t-card :title="t('pages.system.monitor.diskTitle')" class="monitor-card" style="margin-top: 16px">
      <t-table :data="diskInfo" :columns="diskColumns" bordered size="small" />
    </t-card>
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import systemApi from '@/api/system';

const { t } = useI18n();

interface ServerInfo {
  osName: string;
  osArch: string;
  serverIp: string;
  cpuCores: number;
  cpuUsage: number;
  memoryUsage: number;
  usedMemory: number;
  totalMemory: number;
}

interface JvmInfo {
  jvmName: string;
  jvmVersion: string;
  jvmVendor: string;
  upTimeStr: string;
  heapUsage: number;
  heapUsed: number;
  heapMax: number;
  nonHeapUsed: number;
  threadCount: number;
  daemonThreadCount: number;
  gcCount: number;
  gcTime: number;
}

const serverInfo = ref<ServerInfo>({} as ServerInfo);
const jvmInfo = ref<JvmInfo>({} as JvmInfo);
const diskInfo = ref([]);

const diskColumns = computed<PrimaryTableCol[]>(() => [
  { title: t('pages.system.monitor.dirName'), colKey: 'dirName', width: 150 },
  { title: t('pages.system.monitor.total'), colKey: 'total', width: 120 },
  { title: t('pages.system.monitor.used'), colKey: 'used', width: 120 },
  { title: t('pages.system.monitor.free'), colKey: 'free', width: 120 },
  {
    title: t('pages.system.monitor.usage'),
    colKey: 'usage',
    width: 200,
    cell: (h, { row }) => {
      const color = getProgressColor(row.usage / 100);
      return h('div', [
        h('t-progress', {
          percentage: row.usage,
          color,
          style: 'display: inline-block; width: 120px; margin-right: 8px;',
        }),
        h('span', `${row.usage}%`),
      ]);
    },
  },
]);

const getProgressColor = (ratio: number) => {
  if (ratio < 0.5) return '#00a870';
  if (ratio < 0.8) return '#ed7b2f';
  return '#e34d59';
};

const fetchData = async () => {
  try {
    const res = await systemApi.monitor.info();
    if (res.code === 200) {
      serverInfo.value = res.data.server || {};
      jvmInfo.value = res.data.jvm || {};
      diskInfo.value = res.data.disks || [];
    }
  } catch (error) {
    console.error('获取监控信息失败', error);
  }
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped>
.monitor-container {
  padding: 16px;
}

.monitor-card {
  margin-bottom: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  color: #999;
  font-size: 13px;
  margin-bottom: 4px;
}

.info-value {
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.progress-item {
  margin-bottom: 16px;
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}
</style>
