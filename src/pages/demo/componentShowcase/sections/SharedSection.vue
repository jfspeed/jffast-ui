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
  <section id="shared" class="showcase-section">
    <h2 class="section-title">{{ t('pages.demo.showcase.section.shared') }}</h2>
    <p class="section-desc">{{ t('pages.demo.showcase.shared.sectionDesc') }}</p>

    <demo-card :title="t('pages.demo.showcase.shared.treeSelectTitle')" tag="shared" :code="treeSelectCode">
      <dept-user-tree-select
        v-model="users"
        :multiple="false"
        :only-leaf="true"
        :placeholder="t('pages.demo.showcase.shared.personPlaceholder')"
      />
      <div class="shared-value">{{ t('pages.demo.showcase.shared.selectedValue', { v: JSON.stringify(users) }) }}</div>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.shared.langTitle')" tag="shared" :code="langCode">
      <language-switcher />
      <div class="shared-value">{{ t('pages.demo.showcase.shared.langTip') }}</div>
    </demo-card>
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import deptUserTreeSelect from '@/components/DeptUserTreeSelect.vue';
import languageSwitcher from '@/components/LanguageSwitcher.vue';

import DemoCard from '../DemoCard.vue';

const { t } = useI18n();

// 代码片段随语言切换
const treeSelectCode = computed(
  () => `<dept-user-tree-select
  v-model="users"
  :multiple="false"
  :only-leaf="true"
  placeholder="${t('pages.demo.showcase.shared.personPlaceholder')}"
/>
<!-- ${t('pages.demo.showcase.shared.treeSelectComment')} -->`,
);

const langCode = `<language-switcher />`;

const users = ref('');
</script>
<style scoped>
.section-title {
  margin: 8px 0 16px;
  font-size: 20px;
}

.section-desc {
  color: #888;
  margin: 0 0 16px;
}

.shared-value {
  margin-top: 10px;
  font-size: 13px;
  color: #555;
}
</style>
