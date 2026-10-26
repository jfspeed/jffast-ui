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
  <t-card :title="t('pages.system.notification.groupPanel.title')" :bordered="true" class="group-card">
    <template #actions>
      <t-button
        v-permission="'system:notification:template:add'"
        size="small"
        theme="primary"
        variant="text"
        @click="emit('add-group')"
      >
        <template #icon><t-icon name="add" /></template>
        {{ t('common.add') }}
      </t-button>
    </template>
    <t-list :split="true" class="group-list">
      <t-list-item
        v-for="group in groupList"
        :key="group.id"
        class="group-item"
        :class="{ active: activeId === group.id }"
        @click="emit('select', group)"
      >
        <t-list-item-meta :title="group.name" :description="group.code" />
        <template #action>
          <t-space :size="4">
            <t-link
              v-permission="'system:notification:template:edit'"
              theme="primary"
              @click.stop="emit('edit-group', group)"
              >{{ t('common.edit') }}</t-link
            >
            <t-link
              v-permission="'system:notification:template:delete'"
              theme="danger"
              @click.stop="emit('remove-group', group)"
              >{{ t('common.delete') }}</t-link
            >
          </t-space>
        </template>
      </t-list-item>
    </t-list>
    <t-empty v-if="groupList.length === 0" :description="t('pages.system.notification.groupPanel.empty')" />
  </t-card>
</template>
<script lang="ts" setup>
import type { PropType } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps({
  groupList: {
    type: Array as PropType<{ id: string | number; name: string; code: string }[]>,
    default: () => [],
  },
  activeId: { type: [Number, String] as PropType<string | number | null>, default: null },
});
const emit = defineEmits(['add-group', 'select', 'edit-group', 'remove-group']);

const { t } = useI18n();
</script>
<style scoped lang="less">
.group-card {
  height: 100%;
}

.group-list {
  .group-item {
    cursor: pointer;
    padding-left: 8px;
    padding-right: 8px;
    border-radius: var(--td-radius-default);
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--td-bg-color-container-hover);
    }

    &.active {
      background-color: var(--td-brand-color-light);
    }
  }
}
</style>
