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

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 流程图（PNG）加载契约。
 *
 * 背景：全局响应拦截器对 `responseType: 'blob'` 的响应**直接返回 Blob 本身**
 * （shared/src/utils/request.ts），而不是 AxiosResponse。此前 loadDiagramObjectUrl
 * 写的是 `URL.createObjectURL(res.data)` —— res.data 是 undefined，流程图 100% 加载失败，
 * 且异常被页面上的空 catch 吞掉，用户只看到「无流程图」空状态。
 *
 * 这条测试把「拦截器返回的是 Blob 本身」这个契约锁住，防止有人改回 res.data。
 */
const requestMock = vi.fn();
const httpDeleteMock = vi.fn();

vi.mock('@/utils/request', () => ({
  request: {
    get: (...args: unknown[]) => requestMock(...args),
  },
  default: {
    get: (...args: unknown[]) => requestMock(...args),
  },
}));

vi.mock('@/api/core/crud', () => ({
  createCrud: () => ({}),
  http: {
    delete: (...args: unknown[]) => httpDeleteMock(...args),
  },
}));

describe('flow.loadDiagramObjectUrl', () => {
  beforeEach(() => {
    requestMock.mockReset();
    // happy-dom 提供 URL.createObjectURL；这里做可控替身以断言入参
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:mock-url');
  });

  it('拦截器返回 Blob 本身时也能生成 ObjectURL（不是 res.data）', async () => {
    const blob = new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });
    // 与拦截器契约一致：返回值就是 Blob，没有 .data
    requestMock.mockResolvedValue(blob);

    const { loadDiagramObjectUrl } = await import('@/api/flow');

    const url = await loadDiagramObjectUrl('/flow/process/definition/1/diagram');

    expect(url).toBe('blob:mock-url');
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    // 关键回归点：曾经误用 res.data（undefined），导致 createObjectURL 抛 TypeError
    expect(URL.createObjectURL).not.toHaveBeenCalledWith(undefined);
  });

  it('请求声明 responseType=blob（否则拦截器会走 JSON 分支）', async () => {
    const blob = new Blob([]);
    requestMock.mockResolvedValue(blob);

    const { loadDiagramObjectUrl } = await import('@/api/flow');
    await loadDiagramObjectUrl('/flow/process/definition/2/diagram');

    expect(requestMock).toHaveBeenCalledWith('/flow/process/definition/2/diagram', {
      responseType: 'blob',
    });
  });
});

/**
 * 取消流程实例的 reason 参数位置。
 *
 * 背景：后端 `WfProcessController#cancelInstance` 的 reason 是
 * `@RequestParam(required = false) String reason`（**查询参数**），
 * 旧实现却把它放进 DELETE 的请求体（`http.delete(url, { reason })`），
 * 而 `http.delete(url, data)` 的 data 就是 body —— Spring 根本收不到，
 * 取消原因被静默丢掉（流程实例里记成空），页面照样提示「取消成功」。
 */
describe('flow.cancelInstance 的 reason 走查询参数', () => {
  beforeEach(() => {
    httpDeleteMock.mockReset();
  });

  it('reason 作为 params 传递，不进请求体', async () => {
    const { process } = await import('@/api/flow');

    process.cancelInstance('pid-1', '用户主动撤销');

    expect(httpDeleteMock).toHaveBeenCalledWith('/flow/process/instance/pid-1', null, {
      params: { reason: '用户主动撤销' },
    });
  });

  it('不传 reason 时不塞进请求体', async () => {
    const { process } = await import('@/api/flow');

    process.cancelInstance('pid-2');

    expect(httpDeleteMock).toHaveBeenCalledWith('/flow/process/instance/pid-2', null, {
      params: { reason: undefined },
    });
    // 关键回归点：曾经是 { reason } 作为 body
    expect(httpDeleteMock).not.toHaveBeenCalledWith('/flow/process/instance/pid-2', { reason: undefined });
  });
});
