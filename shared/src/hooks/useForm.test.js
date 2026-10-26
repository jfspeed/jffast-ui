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
