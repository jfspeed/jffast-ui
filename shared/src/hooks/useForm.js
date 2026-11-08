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

/**
 * 递归拷贝数组与普通对象。
 * defaultForm 里的数组（如主子表的 items）若按引用共享，每次打开弹窗编辑都会污染默认模板，
 * 第二次打开就带着上一次删改的痕迹。
 */
function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }
  if (value && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    // Date / File / Blob 等特殊对象保持原引用，只逐键拷贝普通对象
    if (proto !== Object.prototype && proto !== null) return value;
    const copy = {};
    Object.keys(value).forEach((key) => {
      copy[key] = cloneValue(value[key]);
    });
    return copy;
  }
  return value;
}

export function useForm(options = {}) {
  const visible = ref(false);
  const mode = ref('add');
  const isSaving = ref(false);
  const formRef = ref(null);
  const form = reactive(cloneValue(options.defaultForm || {}));
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
      form[key] = cloneValue(data[key] !== undefined ? data[key] : (options.defaultForm?.[key] ?? null));
    });
  };

  const resetForm = () => {
    Object.keys(form).forEach((key) => {
      form[key] = cloneValue(options.defaultForm?.[key] ?? null);
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

      const submitData = cloneValue(form);
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
