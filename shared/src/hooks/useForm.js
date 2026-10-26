/*
 * Copyright 2024-2026 jffast
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { reactive, ref } from 'vue';

export function useForm(options = {}) {
  const visible = ref(false);
  const mode = ref('add');
  const isSaving = ref(false);
  const formRef = ref(null);
  const form = reactive({ ...(options.defaultForm || {}) });
  const rules = options.rules || {};

  const titleMap = {
    add: '新增',
    edit: '编辑',
    show: '查看',
  };

  const open = (type = 'add') => {
    mode.value = type;
    if (type === 'add') {
      resetForm();
    }
    visible.value = true;
  };

  const close = () => {
    visible.value = false;
    resetForm();
  };

  const setData = (data) => {
    Object.keys(form).forEach((key) => {
      form[key] = data[key] !== undefined ? data[key] : (options.defaultForm?.[key] ?? null);
    });
  };

  const resetForm = () => {
    Object.keys(form).forEach((key) => {
      form[key] = options.defaultForm?.[key] ?? null;
    });
    formRef.value?.clearValidate();
  };

  const submit = async (api) => {
    // 校验期间也占用提交标志：否则连点两次会并发进入，校验都通过时提交两次
    if (isSaving.value) return false;
    isSaving.value = true;
    try {
      let valid;
      try {
        valid = await formRef.value?.validate();
      } catch {
        valid = false;
      }
      if (valid !== true) return false;

      const submitData = { ...form };
      if (submitData.id === '' || submitData.id === undefined || submitData.id === null) {
        delete submitData.id;
      }

      return mode.value === 'add' ? await api.create(submitData) : await api.update(submitData);
    } finally {
      isSaving.value = false;
    }
  };

  return {
    visible,
    mode,
    isSaving,
    formRef,
    form,
    rules,
    titleMap,
    open,
    close,
    setData,
    resetForm,
    submit,
  };
}
