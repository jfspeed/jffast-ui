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
  <div class="ai-conversation-page">
    <t-card class="search-card">
      <t-form :data="searchForm" layout="inline" @submit="handleSearch" @reset="resetSearch">
        <t-form-item :label="t('pages.ai.conversation.title')" name="title">
          <t-input v-model="searchForm.title" :placeholder="t('pages.ai.conversation.placeholder.title')" clearable />
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
        <t-form-item>
          <t-button theme="default" type="reset">{{ t('common.reset') }}</t-button>
          <t-button theme="primary" type="submit">{{ t('common.query') }}</t-button>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card>
      <t-alert theme="info" :close="false" class="tips">
        {{ t('pages.ai.conversation.tips') }}
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

    <t-dialog
      v-model:visible="messageVisible"
      :header="t('pages.ai.conversation.messageTitle', { title: currentTitle })"
      :width="720"
      :footer="false"
    >
      <div v-if="messageLoading" class="message-loading">{{ t('common.loading') }}</div>
      <div v-else-if="messages.length === 0" class="message-empty">{{ t('pages.ai.conversation.emptyMessages') }}</div>
      <div v-else class="message-list">
        <div v-for="msg in messages" :key="msg.id" class="message-item" :class="`message-item--${msg.role}`">
          <div class="message-role">{{ roleText[msg.role] || msg.role }}</div>
          <div class="message-content">{{ msg.content }}</div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>
<script lang="ts" setup>
import { DialogPlugin, MessagePlugin } from 'tdesign-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/ai';
import { useTable } from '@/hooks/useTable';
import { hasPermission } from '@/utils/permission';

const { t } = useI18n();

// 消息角色文案（响应语言切换）
const roleText = computed<Record<string, string>>(() => ({
  user: t('pages.ai.conversation.roleMap.user'),
  assistant: t('pages.ai.conversation.roleMap.assistant'),
  system: t('pages.ai.conversation.roleMap.system'),
}));

const kbOptions = ref<{ label: string; value: any }[]>([]);
const messageVisible = ref(false);
const messageLoading = ref(false);
const messages = ref<{ id: string | number; role: string; content: string }[]>([]);
const currentTitle = ref('');

const loadKbOptions = async () => {
  const res = await api.knowledgeBase.page({ pageNo: 1, pageSize: 1000 });
  const list = res?.data?.list || [];
  kbOptions.value = list.map((v: any) => ({ label: v.name, value: v.id }));
};

const kbName = (kbId: any) => kbOptions.value.find((v) => v.value === kbId)?.label || kbId || '-';

const openMessages = async (row: any) => {
  currentTitle.value = row.title || '';
  messages.value = [];
  messageVisible.value = true;
  messageLoading.value = true;
  try {
    const res = await api.conversation.messages(row.id);
    messages.value = res?.data || [];
  } catch {
    MessagePlugin.error(t('pages.ai.conversation.message.loadFail'));
  } finally {
    messageLoading.value = false;
  }
};

const {
  loading,
  searchForm,
  pageParams,
  handleSearch,
  resetSearch,
  handleDelete,
  handlePageChange,
  handleSizeChange,
  fetchData,
} = useTable(api.conversation, {
  defaultSearch: { title: '', kbId: '' },
});

// 表格列（响应语言切换）
const columns = computed<any[]>(() => [
  { colKey: 'title', title: t('pages.ai.conversation.title'), ellipsis: true },
  {
    colKey: 'kbId',
    title: t('pages.ai.common.kb'),
    width: 160,
    ellipsis: true,
    cell: (h: any, { row }: any) => kbName(row.kbId),
  },
  { colKey: 'model', title: t('pages.ai.conversation.model'), width: 160, ellipsis: true },
  { colKey: 'createTime', title: t('common.createTime'), width: 170 },
  {
    colKey: 'op',
    title: t('common.operation'),
    width: 180,
    align: 'center',
    fixed: 'right',
    cell: (h: any, { row }: any) => {
      const btns = [];
      // 权限码与后端 @SaCheckPermission 逐条对齐：删除=ai:conversation:delete
      // （新增 ai:conversation:add 由 AI 对话链路调用，本页没有「新建会话」入口）
      btns.push(h('a', { onClick: () => openMessages(row) }, t('pages.ai.conversation.viewMessages')));
      if (hasPermission('ai:conversation:delete')) {
        btns.push(
          h(
            'a',
            {
              style: 'color:var(--td-error-color)',
              onClick: () => {
                const confirmDia = DialogPlugin.confirm({
                  header: t('common.tips'),
                  body: t('pages.ai.conversation.message.confirmDelete'),
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
.ai-conversation-page {
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

  .message-loading,
  .message-empty {
    padding: 24px 0;
    text-align: center;
    color: var(--td-text-color-placeholder);
  }

  .message-item {
    margin-bottom: 16px;

    &--user .message-content {
      background: var(--td-brand-color-light);
    }

    &--assistant .message-content {
      background: var(--td-bg-color-secondarycontainer);
    }
  }

  .message-role {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
    margin-bottom: 4px;
  }

  .message-content {
    padding: 10px 12px;
    border-radius: 6px;
    white-space: pre-wrap;
    // `word-break: break-word` 是已废弃的别名（等价于 word-break: normal + overflow-wrap: break-word），
    // stylelint 的 declaration-property-value-keyword-no-deprecated 会拦它
    overflow-wrap: break-word;
    line-height: 1.6;
  }
}
</style>
