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
  <div class="cache-container">
    <t-row :gutter="16">
      <!-- Redis 信息 -->
      <t-col :span="12">
        <t-card :title="t('pages.system.cache.redisInfoTitle')" class="cache-card">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.cache.redisVersion') }}</span>
              <span class="info-value">{{ redisInfo.redisVersion }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.cache.mode') }}</span>
              <span class="info-value">{{ redisInfo.mode }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.cache.port') }}</span>
              <span class="info-value">{{ redisInfo.port }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.cache.connectedClients') }}</span>
              <span class="info-value">{{ redisInfo.connectedClients }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.cache.uptime') }}</span>
              <span class="info-value">{{ redisInfo.uptimeStr }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.cache.dbKeys') }}</span>
              <span class="info-value">{{ redisInfo.dbKeys }}</span>
            </div>
          </div>
          <t-divider />
          <div class="progress-item">
            <div class="progress-header">
              <span>{{ t('pages.system.cache.usedMemory') }}</span>
              <span>{{ redisInfo.usedMemoryHuman }}</span>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.cache.inputKbps') }}</span>
              <span class="info-value">{{ redisInfo.instantaneousInputKbps }} kb/s</span>
            </div>
            <div class="info-item">
              <span class="info-label">{{ t('pages.system.cache.outputKbps') }}</span>
              <span class="info-value">{{ redisInfo.instantaneousOutputKbps }} kb/s</span>
            </div>
          </div>
        </t-card>
      </t-col>

      <!-- 缓存操作 -->
      <t-col :span="12">
        <t-card :title="t('pages.system.cache.cacheOpsTitle')" class="cache-card">
          <div class="cache-actions">
            <t-button v-permission="'system:cache:delete'" theme="primary" @click="handleClearAll">
              {{ t('pages.system.cache.clearAll') }}
            </t-button>
            <t-button theme="default" @click="fetchData">
              {{ t('pages.system.cache.refresh') }}
            </t-button>
          </div>
          <t-divider />
          <div class="cache-list">
            <div class="cache-header">
              <span>{{ t('pages.system.cache.cacheName') }}</span>
              <span>{{ t('common.operation') }}</span>
            </div>
            <div v-for="name in cacheNames" :key="name" class="cache-item" @click="handleSelectCache(name)">
              <span class="cache-name">{{ name }}</span>
              <t-button
                v-permission="'system:cache:delete'"
                theme="danger"
                variant="text"
                size="small"
                @click.stop="handleClearCache(name)"
              >
                {{ t('pages.system.cache.clear') }}
              </t-button>
            </div>
            <t-empty v-if="cacheNames.length === 0" :description="t('pages.system.cache.empty')" />
          </div>
        </t-card>
      </t-col>
    </t-row>

    <!-- 缓存详情 -->
    <t-card
      v-if="selectedCache"
      :title="t('pages.system.cache.detailTitle', { name: selectedCache })"
      class="cache-card"
      style="margin-top: 16px"
    >
      <t-table :data="cacheKeys" :columns="keyColumns" bordered size="small">
        <template #operation="{ row }">
          <t-button
            v-permission="'system:cache:delete'"
            theme="danger"
            variant="text"
            size="small"
            @click="handleDeleteKey(row)"
          >
            {{ t('common.delete') }}
          </t-button>
        </template>
      </t-table>
    </t-card>
  </div>
</template>
<script lang="ts" setup>
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import systemApi from '@/api/system';

const { t } = useI18n();

const redisInfo = ref<{
  redisVersion?: string;
  mode?: string;
  port?: number;
  connectedClients?: number;
  uptimeStr?: string;
  dbKeys?: number;
  usedMemoryHuman?: string;
  instantaneousInputKbps?: number;
  instantaneousOutputKbps?: number;
}>({});
const cacheNames = ref<string[]>([]);
const selectedCache = ref('');
const cacheKeys = ref<{ key: string }[]>([]);

const keyColumns = computed(() => [
  { title: t('pages.system.cache.keyName'), colKey: 'key', width: 400 },
  { title: t('common.operation'), colKey: 'operation', width: 100 },
]);

const fetchData = async () => {
  try {
    const [redisRes, namesRes] = await Promise.all([systemApi.cache.redisInfo(), systemApi.cache.cacheNames()]);
    if (redisRes.code === 200) {
      redisInfo.value = redisRes.data || {};
    }
    if (namesRes.code === 200) {
      cacheNames.value = namesRes.data || [];
    }
  } catch (error) {
    console.error('获取缓存信息失败', error);
  }
};

const handleSelectCache = async (cacheName: string) => {
  selectedCache.value = cacheName;
  try {
    const res = await systemApi.cache.cacheKeys(cacheName);
    if (res.code === 200) {
      cacheKeys.value = (res.data.keys || []).map((key: string) => ({
        key: key.replace(`${cacheName}:`, ''),
      }));
    }
  } catch (error) {
    console.error('获取缓存键失败', error);
  }
};

const handleClearAll = async () => {
  const confirmDia = DialogPlugin.confirm({
    header: t('pages.system.cache.message.clearConfirmHeader'),
    body: t('pages.system.cache.message.clearAllConfirm'),
    onConfirm: async () => {
      try {
        await systemApi.cache.clearAll();
        MessagePlugin.success(t('common.clearSuccess'));
        fetchData();
      } catch {
        MessagePlugin.error(t('common.clearFail'));
      }
      confirmDia.hide();
    },
  });
};

const handleClearCache = async (cacheName: string) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('pages.system.cache.message.clearConfirmHeader'),
    body: t('pages.system.cache.message.clearCacheConfirm', { name: cacheName }),
    onConfirm: async () => {
      try {
        await systemApi.cache.clearCacheName(cacheName);
        MessagePlugin.success(t('common.clearSuccess'));
        if (selectedCache.value === cacheName) {
          selectedCache.value = '';
          cacheKeys.value = [];
        }
        fetchData();
      } catch {
        MessagePlugin.error(t('common.clearFail'));
      }
      confirmDia.hide();
    },
  });
};

const handleDeleteKey = async (row: { key: string }) => {
  const confirmDia = DialogPlugin.confirm({
    header: t('pages.system.cache.message.deleteConfirmHeader'),
    body: t('pages.system.cache.message.deleteKeyConfirm', { key: row.key }),
    onConfirm: async () => {
      try {
        await systemApi.cache.deleteCache(selectedCache.value, row.key);
        MessagePlugin.success(t('common.deleteSuccess'));
        handleSelectCache(selectedCache.value);
      } catch {
        MessagePlugin.error(t('common.deleteFail'));
      }
      confirmDia.hide();
    },
  });
};

onMounted(() => {
  fetchData();
});
</script>
<style scoped>
.cache-container {
  padding: 16px;
}

.cache-card {
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

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.cache-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.cache-list {
  max-height: 300px;
  overflow-y: auto;
}

.cache-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f5f5;
  font-weight: 500;
  font-size: 13px;
}

.cache-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
}

.cache-item:hover {
  background: #f5f5f5;
}

.cache-name {
  font-size: 13px;
}
</style>
