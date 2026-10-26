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
  <div class="code-block">
    <div class="code-block__bar">
      <span class="code-block__lang">{{ lang }}</span>
      <t-button size="small" variant="text" theme="primary" @click="copy">
        {{ copied ? t('pages.demo.showcase.copied') : t('common.copy') }}
      </t-button>
    </div>
    <pre class="code-block__pre"><code>{{ code }}</code></pre>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  code: string;
  lang?: string;
}>();

const { t } = useI18n();

const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = props.code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}
</script>
<style scoped>
.code-block {
  border: 1px solid var(--td-component-border, #e7e7e7);
  border-radius: 6px;
  overflow: hidden;
  background: #fbfbfb;
}
.code-block__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: #f3f3f3;
  border-bottom: 1px solid var(--td-component-border, #e7e7e7);
}
.code-block__lang {
  font-size: 12px;
  color: #888;
}
.code-block__pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  white-space: pre;
}
</style>
