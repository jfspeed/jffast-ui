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
  <t-dialog
    v-model:visible="visible"
    :header="titleMap[mode as keyof typeof titleMap]"
    :width="800"
    destroy-on-close
    @closed="emit('closed')"
  >
    <t-form ref="dialogForm" :data="form" :rules="rules" label-width="100px" :disabled="mode === 'show'">
      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('common.title')" name="title">
            <t-input v-model="form.title" :placeholder="t('pages.demo.common.placeholder.title')" clearable />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('common.type')" name="type">
            <t-select
              v-model="form.type"
              :placeholder="t('pages.demo.common.placeholder.type')"
              clearable
              :options="typeOptions"
            />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('common.status')" name="status">
            <t-switch v-model="form.status" :custom-value="[1, 0]" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.isRecommend')" name="isRecommend">
            <t-switch v-model="form.isRecommend" :custom-value="[1, 0]" />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.priority')" name="priority">
            <t-input-number v-model="form.priority" :min="0" style="width: 100%" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('common.sort')" name="sort">
            <t-input-number v-model="form.sort" :min="0" style="width: 100%" />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.price')" name="price">
            <t-input-number v-model="form.price" :decimal-places="2" :min="0" style="width: 100%" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.score')" name="score">
            <t-input-number v-model="form.score" :decimal-places="2" :min="0" :max="10" style="width: 100%" />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.quantity')" name="quantity">
            <t-input-number v-model="form.quantity" :min="0" style="width: 100%" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.tags')" name="tags">
            <t-input v-model="form.tags" :placeholder="t('pages.demo.common.placeholder.tags')" clearable />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('common.email')" name="email">
            <t-input v-model="form.email" :placeholder="t('pages.demo.common.placeholder.email')" clearable />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('common.phone')" name="phone">
            <t-input v-model="form.phone" :placeholder="t('pages.demo.common.placeholder.phone')" clearable />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.publishTime')" name="publishTime">
            <t-date-picker
              v-model="form.publishTime"
              enable-time-picker
              format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.startDate')" name="startDate">
            <t-date-picker v-model="form.startDate" format="YYYY-MM-DD" style="width: 100%" />
          </t-form-item>
        </t-col>
      </t-row>

      <t-row :gutter="[16, 0]">
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.endDate')" name="endDate">
            <t-date-picker v-model="form.endDate" format="YYYY-MM-DD" style="width: 100%" />
          </t-form-item>
        </t-col>
        <t-col :span="6">
          <t-form-item :label="t('pages.demo.common.icon')" name="icon">
            <t-input v-model="form.icon" :placeholder="t('pages.demo.common.placeholder.icon')" clearable />
          </t-form-item>
        </t-col>
      </t-row>

      <t-form-item :label="t('pages.demo.common.url')" name="url">
        <t-input v-model="form.url" :placeholder="t('pages.demo.common.placeholder.url')" clearable />
      </t-form-item>

      <t-form-item :label="t('pages.demo.common.image')" name="image">
        <t-upload
          v-model="imageFiles"
          theme="image"
          accept="image/*"
          :request-method="uploadImage"
          :auto-upload="true"
          :show-image-file-name="false"
          @remove="onImageRemove"
        />
      </t-form-item>

      <t-form-item :label="t('common.description')" name="description">
        <t-textarea
          v-model="form.description"
          :placeholder="t('pages.demo.common.placeholder.description')"
          :autosize="{ minRows: 2 }"
        />
      </t-form-item>

      <t-form-item :label="t('pages.demo.common.content')" name="content">
        <t-textarea
          v-model="form.content"
          :placeholder="t('pages.demo.common.placeholder.content')"
          :autosize="{ minRows: 3 }"
        />
      </t-form-item>

      <t-form-item :label="t('common.remark')" name="remark">
        <t-textarea
          v-model="form.remark"
          :placeholder="t('pages.demo.common.placeholder.remark')"
          :autosize="{ minRows: 2 }"
        />
      </t-form-item>
    </t-form>
    <template #footer>
      <t-button variant="outline" @click="visible = false">{{ t('common.dialogCancel') }}</t-button>
      <t-button v-if="mode !== 'show'" theme="primary" :loading="isSaving" @click="onSubmit">{{
        t('common.dialogSave')
      }}</t-button>
    </template>
  </t-dialog>
</template>
<script lang="ts" setup>
import type { FormRule, UploadFile } from 'tdesign-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import api from '@/api/demo';
import { useForm } from '@/hooks/useForm';

const emit = defineEmits(['success', 'closed']);

const { t } = useI18n();

// 类型下拉（响应语言切换）
const typeOptions = computed(() => [
  { label: t('pages.demo.common.typeMap.a'), value: 'type_a' },
  { label: t('pages.demo.common.typeMap.b'), value: 'type_b' },
  { label: t('pages.demo.common.typeMap.c'), value: 'type_c' },
]);

// 本地标题映射（响应语言切换，覆盖 useForm 内置中文 titleMap）
const titleMap = computed<Record<string, string>>(() => ({
  add: t('common.add'),
  edit: t('common.edit'),
  show: t('common.view'),
}));

// 本地校验规则（响应语言切换）
const rules = computed<Record<string, FormRule[]>>(() => ({
  title: [{ required: true, message: t('pages.demo.common.placeholder.title'), trigger: 'blur' }],
}));

const {
  visible,
  mode,
  isSaving,
  formRef: dialogForm,
  form,
  open,
  setData,
  submit: formSubmit,
} = useForm({
  defaultForm: {
    id: '',
    title: '',
    content: '',
    description: '',
    status: 1,
    type: '',
    priority: 0,
    score: null,
    quantity: null,
    price: null,
    isRecommend: 0,
    sort: 0,
    tags: '',
    email: '',
    phone: '',
    url: '',
    icon: '',
    image: '',
    publishTime: '',
    startDate: '',
    endDate: '',
    remark: '',
  },
});

const imageFiles = ref<UploadFile[]>([]);
// 表单加载（新增/编辑）时，把已存图片 URL 同步到上传组件预览
watch(
  () => form.image,
  (val) => {
    imageFiles.value = val ? [{ url: val, name: 'image', status: 'success' }] : [];
  },
  { immediate: true },
);

const uploadImage = (fileRaw: any) => {
  const file = fileRaw.raw || fileRaw;
  return api.demoExample
    .upload(file)
    .then((res) => {
      if (res && res.code === 200) {
        form.image = res.data;
        return { ...fileRaw, url: res.data, status: 'success' };
      }
      return { ...fileRaw, status: 'fail', error: (res && res.message) || t('common.uploadFail') };
    })
    .catch(() => ({ ...fileRaw, status: 'fail', error: t('common.uploadFail') }));
};

const onImageRemove = () => {
  form.image = '';
};

const onSubmit = async () => {
  const res = await formSubmit(api.demoExample);
  if (res && res.code === 200) {
    MessagePlugin.success(mode.value === 'add' ? t('common.addSuccess') : t('common.updateSuccess'));
    visible.value = false;
    emit('success', form, mode.value);
  }
};

defineExpose({ open, setData });
</script>
