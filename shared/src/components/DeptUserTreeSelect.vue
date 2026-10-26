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
  <t-tree-select
    v-model="selectedValues"
    :data="treeData"
    :placeholder="placeholder"
    :multiple="multiple"
    clearable
    filterable
    :tree-props="{
      checkStrictly: !onlyLeaf,
      load: handleLoad,
      lazy,
    }"
    :keys="{ value: 'id', label: 'label', children: 'children' }"
    @change="handleChange"
  />
</template>
<script lang="ts" setup>
import type { TreeOptionData } from 'tdesign-vue-next';
import { onMounted, ref, watch } from 'vue';

import { getSystemApi } from '@/runtime';

const props = defineProps({
  modelValue: {
    type: [Array, String, Number],
    default: () => [],
  },
  multiple: {
    type: Boolean,
    default: true,
  },
  onlyLeaf: {
    type: Boolean,
    default: true,
  },
  placeholder: {
    type: String,
    default: '请选择人员',
  },
  lazy: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:model-value', 'change']);

const treeData = ref<TreeOptionData[]>([]);
const selectedValues = ref(props.modelValue);

watch(
  () => props.modelValue,
  (val) => {
    selectedValues.value = val;
  },
);

const loadTreeData = async () => {
  try {
    const res = await getSystemApi().dept.deptUserTree();
    if (res.code === 200) {
      treeData.value = (res.data ?? []) as TreeOptionData[];
    }
  } catch (e) {
    console.error('加载部门用户树失败:', e);
  }
};

/** 懒加载回调：TDesign 期望 (node) => Promise<data[]>；本组件数据一次性下发，直接回空数组 */
const handleLoad = (_node: unknown): Promise<TreeOptionData[]> => Promise.resolve([]);

/** TDesign 勾选节点内部结构：仅取用 data.nodeType / data.value */
interface CheckedNode {
  data?: { nodeType?: string; value?: unknown };
}
interface TreeChangeContext {
  node?: { getCheckedNodes?: () => CheckedNode[] } | null;
}

const handleChange = (value: unknown, context: unknown) => {
  const selectedNodes = (context as TreeChangeContext | undefined)?.node?.getCheckedNodes?.() ?? [];
  const userIds = selectedNodes.filter((n) => n.data?.nodeType === 'user').map((n) => n.data?.value);
  emit('update:model-value', value);
  emit('change', value, userIds);
};

onMounted(() => {
  loadTreeData();
});
</script>
