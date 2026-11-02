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
  <div :class="`${prefix}-footer`">Copyright © 2024 {{ appTitle }}</div>
</template>
<script setup lang="ts">
import { prefix } from '@/config/global';

// 与登录页页脚、Header 同源：产品在 .env 覆盖 VITE_APP_TITLE
const appTitle = import.meta.env.VITE_APP_TITLE || '疾风管理系统';
</script>
<style lang="less" scoped>
.@{starter-prefix}-footer {
  color: var(--td-text-color-placeholder);
  line-height: 20px;
  text-align: center;
}
</style>
