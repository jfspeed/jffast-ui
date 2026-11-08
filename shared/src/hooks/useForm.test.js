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

import { describe, expect, it, vi } from 'vitest';

import { useForm } from './useForm';

function setup({ validate = () => Promise.resolve(true), defaultForm = { id: null, name: '' } } = {}) {
  const api = {
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(true),
  };
  const state = useForm({ defaultForm });
  state.formRef.value = { validate: vi.fn(validate) };
  return { ...state, api };
}

describe('useForm 默认值深拷贝', () => {
  it('默认值里的数组按值拷贝：编辑与重置都不会污染默认模板', () => {
    const defaultForm = { id: null, items: [{ product: 'A', qty: 1 }] };
    const state = useForm({ defaultForm });

    state.form.items[0].qty = 5;
    state.form.items.push({ product: 'B', qty: 2 });
    expect(defaultForm.items).toHaveLength(1);
    expect(defaultForm.items[0].qty).toBe(1);

    state.resetForm();
    expect(state.form.items).toHaveLength(1);
    expect(state.form.items[0].qty).toBe(1);
    state.form.items[0].qty = 7;
    expect(defaultForm.items[0].qty).toBe(1);
  });

  it('编辑赋值不与外部数组共享引用', () => {
    const state = useForm({ defaultForm: { id: null, items: [] } });
    const rows = [{ product: 'A', qty: 2 }];

    state.open('edit');
    state.setData({ id: 3, items: rows });
    state.form.items[0].qty = 9;

    expect(rows[0].qty).toBe(2);
    expect(state.form.items[0].qty).toBe(9);
  });

  it('提交数据是深拷贝，提交后改表单不影响已交给接口的对象', async () => {
    const state = setup({ defaultForm: { id: null, name: '', items: [{ qty: 1 }] } });
    let submitted;
    state.api.create.mockImplementation((payload) => {
      submitted = payload;
      return Promise.resolve({ id: 1 });
    });

    await state.submit(state.api);
    state.form.items[0].qty = 8;

    expect(submitted.items[0].qty).toBe(1);
  });
});

describe('useForm.submit', () => {
  it('校验失败时不调用接口并复位提交态', async () => {
    const { submit, isSaving, api } = setup({ validate: () => Promise.reject(new Error('invalid')) });

    await expect(submit(api)).resolves.toBe(false);

    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).not.toHaveBeenCalled();
    expect(isSaving.value).toBe(false);
  });

  it('校验返回非 true 时按失败处理', async () => {
    const { submit, api } = setup({ validate: () => Promise.resolve(false) });

    await expect(submit(api)).resolves.toBe(false);
    expect(api.create).not.toHaveBeenCalled();
  });

  it('新增模式调用 create 并剔除空 id', async () => {
    const { submit, form, api } = setup({ defaultForm: { id: '', name: 'n1' } });
    form.name = 'n1';

    await expect(submit(api)).resolves.toEqual({ id: 1 });

    expect(api.create).toHaveBeenCalledWith({ name: 'n1' });
  });

  it('编辑模式调用 update 并保留 id', async () => {
    const state = setup();
    state.open('edit');
    state.setData({ id: 2, name: 'n2' });

    await state.submit(state.api);

    expect(state.api.update).toHaveBeenCalledWith({ id: 2, name: 'n2' });
    expect(state.api.create).not.toHaveBeenCalled();
  });

  it('校验期间再次提交会被立即拒绝，接口只调用一次', async () => {
    let resolveValidate;
    const validate = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveValidate = resolve;
        }),
    );
    const { submit, isSaving, api } = setup({ validate });

    const first = submit(api);
    expect(isSaving.value).toBe(true);
    await expect(submit(api)).resolves.toBe(false);

    resolveValidate(true);
    await first;

    expect(validate).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(isSaving.value).toBe(false);
  });
});
