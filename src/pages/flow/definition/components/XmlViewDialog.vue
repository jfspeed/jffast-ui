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
  <t-dialog v-model:visible="visible" header="BPMN XML" :width="900" :footer="false" destroy-on-close>
    <t-textarea :value="content" :autosize="{ minRows: 16, maxRows: 28 }" readonly />
  </t-dialog>
</template>
<script lang="ts" setup>
defineProps<{ content: string }>();
const visible = defineModel<boolean>('visible', { default: false });
</script>
