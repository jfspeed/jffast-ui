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
  <section id="form" class="showcase-section">
    <h2 class="section-title">{{ t('pages.demo.showcase.section.form') }}</h2>

    <demo-card :title="t('pages.demo.showcase.form.cardInputTitle')" :code="codeInput">
      <t-input v-model="text" :placeholder="t('common.pleaseInput')" clearable style="max-width: 280px" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardTextareaTitle')" :code="codeTextarea">
      <t-textarea
        v-model="desc"
        :placeholder="t('pages.demo.showcase.form.placeholderDesc')"
        :autosize="{ minRows: 2, maxRows: 4 }"
        style="max-width: 360px"
      />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardSelectTitle')" :code="codeSelect">
      <t-select
        v-model="sel"
        :options="options"
        :placeholder="t('common.pleaseSelect')"
        clearable
        style="width: 240px"
      />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardRadioTitle')" :code="codeRadio">
      <t-radio-group v-model="radio">
        <t-radio value="1">{{ t('pages.demo.showcase.form.option1') }}</t-radio>
        <t-radio value="2">{{ t('pages.demo.showcase.form.option2') }}</t-radio>
        <t-radio-button value="3">{{ t('pages.demo.showcase.form.radioButton') }}</t-radio-button>
      </t-radio-group>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardCheckboxTitle')" :code="codeCheckbox">
      <t-checkbox-group v-model="checks">
        <t-checkbox value="a">{{ t('pages.demo.showcase.form.fruitApple') }}</t-checkbox>
        <t-checkbox value="b">{{ t('pages.demo.showcase.form.fruitBanana') }}</t-checkbox>
        <t-checkbox value="c">{{ t('pages.demo.showcase.form.fruitOrange') }}</t-checkbox>
      </t-checkbox-group>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardSwitchTitle')" :code="codeSwitch">
      <t-switch v-model="sw" :custom-value="[1, 0]" />
      <span style="margin-left: 8px">{{ t('pages.demo.showcase.form.currentValue', { v: sw }) }}</span>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardNumberTitle')" :code="codeNumber">
      <t-input-number v-model="num" :min="0" :max="100" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardDateTitle')" :code="codeDate">
      <t-date-picker v-model="date" :placeholder="t('pages.demo.showcase.form.datePlaceholder')" style="width: 240px" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardRangeTitle')" :code="codeRange">
      <t-date-range-picker v-model="range" style="width: 320px" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardTreeTitle')" :code="codeTree">
      <t-tree-select v-model="treeVal" :data="treeData" :placeholder="t('common.pleaseSelect')" style="width: 280px" />
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardUploadTitle')" :code="codeUpload">
      <t-upload :auto-upload="false" :show-upload-list="false" accept=".xlsx,.xls" theme="custom" @change="onUpload">
        <t-button theme="primary" variant="outline">{{ t('pages.demo.showcase.form.uploadBtn') }}</t-button>
      </t-upload>
      <span v-if="fileName" style="margin-left: 8px">{{
        t('pages.demo.showcase.form.selected', { name: fileName })
      }}</span>
    </demo-card>

    <demo-card :title="t('pages.demo.showcase.form.cardFormTitle')" :code="codeForm">
      <t-form :data="form" :rules="rules" label-width="90px" @submit="onSubmit">
        <t-form-item :label="t('common.userName')" name="name">
          <t-input v-model="form.name" style="max-width: 280px" />
        </t-form-item>
        <t-form-item :label="t('pages.demo.showcase.form.age')" name="age">
          <t-input-number v-model="form.age" :min="0" />
        </t-form-item>
        <t-form-item>
          <t-button theme="primary" type="submit">{{ t('common.submit') }}</t-button>
        </t-form-item>
      </t-form>
      <div v-if="submitMsg" class="submit-msg">{{ submitMsg }}</div>
    </demo-card>
  </section>
</template>
<script setup lang="ts">
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import DemoCard from '../DemoCard.vue';

const { t } = useI18n();

const text = ref('');
const desc = ref('');
const sel = ref('');
const radio = ref('1');
const checks = ref(['a']);
const sw = ref(1);
const num = ref(18);
const date = ref('');
const range = ref<[string, string]>(['', '']);

// 下拉选项（响应语言切换）
const options = computed(() => [
  { label: t('pages.demo.showcase.form.selectOptionA'), value: 'a' },
  { label: t('pages.demo.showcase.form.selectOptionB'), value: 'b' },
  { label: t('pages.demo.showcase.form.selectOptionC'), value: 'c' },
]);

const treeVal = ref('');
// 树数据（响应语言切换）
const treeData = computed(() => [
  {
    label: t('pages.demo.showcase.form.cityShanghai'),
    value: 'shanghai',
    children: [
      { label: t('pages.demo.showcase.form.districtHuangpu'), value: 'huangpu' },
      { label: t('pages.demo.showcase.form.districtXuhui'), value: 'xuhui' },
    ],
  },
  {
    label: t('pages.demo.showcase.form.cityBeijing'),
    value: 'beijing',
    children: [
      { label: t('pages.demo.showcase.form.districtChaoyang'), value: 'chaoyang' },
      { label: t('pages.demo.showcase.form.districtHaidian'), value: 'haidian' },
    ],
  },
]);

const fileName = ref('');
const onUpload = (files: any) => {
  const file = files?.files?.[0] || files?.[0];
  fileName.value = file?.name || t('pages.demo.showcase.form.selectedFile');
};

const form = reactive({ name: '', age: 18 });
// 校验规则（响应语言切换）
const rules = computed(() => ({
  name: [{ required: true, message: t('pages.demo.showcase.form.userNameRequired'), type: 'error' as const }],
  age: [{ required: true, message: t('pages.demo.showcase.form.ageRequired'), type: 'error' as const }],
}));
const submitMsg = ref('');
const onSubmit = ({ validateResult }: any) => {
  submitMsg.value =
    validateResult === true ? t('pages.demo.showcase.form.validatePass') : t('pages.demo.showcase.form.validateFail');
  if (validateResult === true) MessagePlugin.success(t('pages.demo.showcase.form.submitSuccessSample'));
};

// 代码片段随语言切换
const codeInput = computed(() => `<t-input v-model="text" placeholder="${t('common.pleaseInput')}" clearable />`);
const codeTextarea = computed(
  () =>
    `<t-textarea v-model="desc" placeholder="${t('pages.demo.showcase.form.placeholderDesc')}" :autosize="{ minRows: 2, maxRows: 4 }" />`,
);
const codeSelect = computed(
  () =>
    `<t-select v-model="sel" :options="options" placeholder="${t('common.pleaseSelect')}" clearable style="width: 240px" />`,
);
const codeRadio = computed(
  () => `<t-radio-group v-model="radio">
  <t-radio value="1">${t('pages.demo.showcase.form.option1')}</t-radio>
  <t-radio value="2">${t('pages.demo.showcase.form.option2')}</t-radio>
  <t-radio-button value="3">${t('pages.demo.showcase.form.radioButton')}</t-radio-button>
</t-radio-group>`,
);
const codeCheckbox = computed(
  () => `<t-checkbox-group v-model="checks">
  <t-checkbox value="a">${t('pages.demo.showcase.form.fruitApple')}</t-checkbox>
  <t-checkbox value="b">${t('pages.demo.showcase.form.fruitBanana')}</t-checkbox>
  <t-checkbox value="c">${t('pages.demo.showcase.form.fruitOrange')}</t-checkbox>
</t-checkbox-group>`,
);
const codeSwitch = `<t-switch v-model="sw" :custom-value="[1, 0]" />`;
const codeNumber = `<t-input-number v-model="num" :min="0" :max="100" />`;
const codeDate = computed(
  () =>
    `<t-date-picker v-model="date" placeholder="${t('pages.demo.showcase.form.datePlaceholder')}" style="width: 240px" />`,
);
const codeRange = `<t-date-range-picker v-model="range" style="width: 320px" />`;
const codeTree = computed(
  () =>
    `<t-tree-select v-model="treeVal" :data="treeData" placeholder="${t('common.pleaseSelect')}" style="width: 280px" />`,
);
const codeUpload = computed(
  () => `<t-upload :auto-upload="false" :show-upload-list="false" accept=".xlsx,.xls" theme="custom">
  <t-button theme="primary" variant="outline">${t('pages.demo.showcase.form.uploadBtn')}</t-button>
</t-upload>`,
);
const codeForm = computed(
  () => `<t-form :data="form" :rules="rules" label-width="90px" @submit="onSubmit">
  <t-form-item label="${t('common.userName')}" name="name">
    <t-input v-model="form.name" />
  </t-form-item>
  <t-form-item label="${t('pages.demo.showcase.form.age')}" name="age">
    <t-input-number v-model="form.age" :min="0" />
  </t-form-item>
  <t-form-item>
    <t-button theme="primary" type="submit">${t('common.submit')}</t-button>
  </t-form-item>
</t-form>`,
);
</script>
<style scoped>
.section-title {
  margin: 8px 0 16px;
  font-size: 20px;
}
.submit-msg {
  margin-top: 8px;
  color: var(--td-success-color, #2ba471);
}
</style>
