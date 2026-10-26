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
  <section id="feedback" class="showcase-section">
    <h2 class="section-title">{{ t('pages.demo.showcase.section.feedback') }}</h2>

    <demo-card :title="t('pages.demo.showcase.feedback.cardDialogTitle')" :code="dialogCode">
      <t-button @click="visible = true">{{ t('pages.demo.showcase.feedback.openDialog') }}</t-button>
      <t-dialog
        v-model:visible="visible"
        :header="t('pages.demo.showcase.feedback.dialogHeader')"
        :width="480"
        @confirm="visible = false"
      >
        <p>{{ t('pages.demo.showcase.feedback.dialogBody') }}</p>
      </t-dialog>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.feedback.cardLoadingTitle')" :code="loadingCode">
      <t-space direction="vertical">
        <t-loading :loading="loading" :text="t('common.loading')" style="height: 48px" />
        <t-button @click="toggleLoading">{{
          loading
            ? t('pages.demo.showcase.feedback.stop') + t('pages.demo.showcase.feedback.loadSuffix')
            : t('pages.demo.showcase.feedback.start') + t('pages.demo.showcase.feedback.loadSuffix')
        }}</t-button>
      </t-space>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.feedback.cardMessageTitle')" :code="messageCode">
      <t-space>
        <t-button theme="success" @click="() => MessagePlugin.success(t('pages.demo.showcase.feedback.msgSuccess'))">{{
          t('pages.demo.showcase.word.success')
        }}</t-button>
        <t-button theme="warning" @click="() => MessagePlugin.warning(t('pages.demo.showcase.feedback.msgWarning'))">{{
          t('pages.demo.showcase.word.warning')
        }}</t-button>
        <t-button theme="danger" @click="() => MessagePlugin.error(t('pages.demo.showcase.feedback.msgError'))">{{
          t('pages.demo.showcase.word.error')
        }}</t-button>
      </t-space>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.feedback.cardNotifyTitle')" :code="notifyCode">
      <t-space>
        <t-button
          @click="
            () =>
              NotifyPlugin.info({
                title: t('pages.demo.showcase.feedback.notifyInfoTitle'),
                content: t('pages.demo.showcase.feedback.notifyInfoContent'),
              })
          "
          >{{ t('pages.demo.showcase.feedback.notifyInfoBtn') }}</t-button
        >
        <t-button
          theme="success"
          @click="
            () =>
              NotifyPlugin.success({
                title: t('pages.demo.showcase.word.success'),
                content: t('common.saveSuccess'),
              })
          "
          >{{ t('pages.demo.showcase.feedback.notifySuccessBtn') }}</t-button
        >
      </t-space>
    </demo-card>
  </section>
</template>
<script setup lang="ts">
import { MessagePlugin, NotifyPlugin } from 'tdesign-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import DemoCard from '../DemoCard.vue';

const { t } = useI18n();

// 代码片段随语言切换
const dialogCode = computed(
  () => `<t-dialog v-model:visible="visible" header="${t('common.title')}" :width="480" @confirm="visible = false">
  <p>${t('pages.demo.showcase.feedback.dialogBodySample')}</p>
</t-dialog>
<t-button @click="visible = true">${t('pages.demo.showcase.feedback.openDialog')}</t-button>`,
);

const loadingCode = computed(
  () => `<t-loading :loading="loading" text="${t('common.loading')}" />
<t-button @click="toggleLoading">{{ loading ? '${t('pages.demo.showcase.feedback.stop')}' : '${t('pages.demo.showcase.feedback.start')}' }}${t('pages.demo.showcase.feedback.loadSuffix')}</t-button>`,
);

const messageCode = computed(
  () => `import { MessagePlugin } from 'tdesign-vue-next';
MessagePlugin.success('${t('pages.demo.showcase.feedback.msgSuccess')}');
MessagePlugin.warning('${t('pages.demo.showcase.feedback.msgWarning')}');
MessagePlugin.error('${t('pages.demo.showcase.feedback.msgError')}');`,
);

const notifyCode = computed(
  () => `import { NotifyPlugin } from 'tdesign-vue-next';
NotifyPlugin.info({ title: '${t('pages.demo.showcase.feedback.notifyInfoTitle')}', content: '${t('pages.demo.showcase.feedback.notifyInfoContentSample')}' });`,
);

const visible = ref(false);
const loading = ref(false);
const toggleLoading = () => (loading.value = !loading.value);
</script>
<style scoped>
.section-title {
  margin: 8px 0 16px;
  font-size: 20px;
}
</style>
