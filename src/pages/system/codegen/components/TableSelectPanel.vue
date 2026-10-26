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
  <div class="table-section">
    <div class="table-header">
      <div class="table-header-left">
        <t-tag theme="default" variant="light" size="small">
          {{ t('pages.system.codegen.tablePanel.tableCount', { count: filteredTables.length }) }}
        </t-tag>
        <t-tag v-if="selectedKeys.length > 0" theme="primary" variant="light" size="small">
          {{ t('pages.system.codegen.tablePanel.selected', { name: selectedKeys[0] }) }}
        </t-tag>
      </div>
      <t-input
        v-model="searchKeyword"
        :placeholder="t('pages.system.codegen.placeholder.search')"
        clearable
        style="width: 260px"
        size="small"
      >
        <template #prefix-icon><t-icon name="search" /></template>
      </t-input>
    </div>
    <t-loading :loading="loading">
      <div class="table-wrapper">
        <t-table
          :data="filteredTables"
          :columns="columns"
          row-key="tableName"
          :selected-row-keys="selectedKeys"
          hover
          stripe
          bordered
          size="small"
          :max-height="500"
          table-layout="auto"
          @select-change="emit('update:selected-keys', $event)"
        />
      </div>
    </t-loading>
  </div>
</template>
<script lang="ts" setup>
import type { PrimaryTableCol } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { getTables } from '@/api/codegen';

defineProps<{ selectedKeys: string[] }>();
const emit = defineEmits<{ 'update:selected-keys': [keys: any] }>();

const { t } = useI18n();

const tables = ref<{ tableName: string; comment?: string }[]>([]);
const loading = ref(false);
const searchKeyword = ref('');

// 列头随语言切换更新
const columns = computed<PrimaryTableCol[]>(() => [
  { colKey: 'row-select', type: 'single' },
  { colKey: 'tableName', title: t('pages.system.codegen.tablePanel.tableName'), width: 200 },
  { colKey: 'comment', title: t('pages.system.codegen.tablePanel.comment'), ellipsis: true },
]);

const filteredTables = computed(() => {
  if (!searchKeyword.value) return tables.value;
  const kw = searchKeyword.value.toLowerCase();
  return tables.value.filter(
    (t) => t.tableName.toLowerCase().includes(kw) || (t.comment && t.comment.toLowerCase().includes(kw)),
  );
});

async function loadTables() {
  loading.value = true;
  try {
    const res = await getTables();
    tables.value = res.data || [];
  } catch {
    MessagePlugin.error(t('pages.system.codegen.tablePanel.message.loadFail'));
  } finally {
    loading.value = false;
  }
}

onMounted(loadTables);
</script>
<style scoped lang="less">
.table-section {
  padding: 8px 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.table-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-wrapper {
  :deep(.t-table) {
    .t-table__header th {
      background-color: #f5f7fa;
    }
  }
}
</style>
