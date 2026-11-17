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
 * 请求体形状契约（前端 → 后端）。
 *
 * 背景：`http.delete(url, data)` 的 data **直接就是 axios 的请求体**
 * （shared/src/utils/request.ts：`service.delete(url, { data, ...config })`）。
 * 旧实现写成 `http.delete('/sys/file/batch', { data: ids })`，请求体被包成
 * `{"data":[...]}`，而后端签名是 `@RequestBody List<Long> ids`
 * （SysFileController#deleteBatch）—— Jackson 反序列化直接 400，
 * 文件批量删除功能完全不可用，且报错发生在浏览器里、前端只看到一句通用提示。
 *
 * 这条测试把「DELETE 带批量 id 时请求体是裸数组」锁死。
 */
const { httpMock } = vi.hoisted(() => ({
  httpMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
  },
}));

vi.mock('@/api/core/crud', () => ({
  http: httpMock,
  createCrud: (baseUrl: string, options: Record<string, unknown> = {}) => ({
    create: (data: unknown) => httpMock.post(`${baseUrl}/create`, data),
    update: (data: unknown) => httpMock.put(`${baseUrl}/update`, data),
    delete: (id: unknown) => httpMock.delete(`${baseUrl}/${id}`),
    detail: (id: unknown) => httpMock.get(`${baseUrl}/detail/${id}`),
    page: (params: unknown) => httpMock.get(`${baseUrl}/page`, { params }),
    list: (params: unknown) => httpMock.get(`${baseUrl}/all`, { params }),
    ...options,
  }),
}));

import api from '@/api/system';

describe('api 请求参数位置与后端签名一致', () => {
  beforeEach(() => {
    httpMock.get.mockReset();
    httpMock.post.mockReset();
    httpMock.put.mockReset();
    httpMock.delete.mockReset();
    httpMock.upload.mockReset();
    httpMock.download.mockReset();
  });

  it('file.batchDelete 的请求体是裸数组（后端 @RequestBody List<Long> ids）', () => {
    api.file.batchDelete([1, 2, 3]);

    expect(httpMock.delete).toHaveBeenCalledWith('/sys/file/batch', [1, 2, 3]);
    // 曾经写成 { data: ids } → body 变成 {"data":[...]} → 后端 400
    expect(httpMock.delete).not.toHaveBeenCalledWith('/sys/file/batch', { data: [1, 2, 3] });
  });

  it('online.kickBatch 的请求体也是裸数组（后端 @RequestBody List<Long> loginIds）', () => {
    api.online.kickBatch([7]);

    expect(httpMock.delete).toHaveBeenCalledWith('/sys/online/kickBatch', [7]);
  });

  it('cache.clearCacheName 用路径变量传 cacheName（后端 @DeleteMapping("/clear/{cacheName}")）', () => {
    api.cache.clearCacheName('demo');

    expect(httpMock.delete).toHaveBeenCalledWith('/sys/cache/clear/demo');
  });

  it('cache.deleteCache 用查询参数传 cacheName/key（后端 @RequestParam）', () => {
    api.cache.deleteCache('demo', 'k1');

    expect(httpMock.delete).toHaveBeenCalledWith('/sys/cache/delete', null, {
      params: { cacheName: 'demo', key: 'k1' },
    });
  });

  it('file.getFileSignedUrl 换新签名 URL（GET /sys/file/signed-url/{id}，返回 R<SignedUrlVO> 的 data.url）', async () => {
    const signed = { url: '/sys/file/view/42?ticket=abc', expiresIn: 900 };
    httpMock.get.mockResolvedValue({ code: 200, data: signed });

    const res = await api.file.getFileSignedUrl(42);

    expect(httpMock.get).toHaveBeenCalledWith('/sys/file/signed-url/42');
    // 响应拦截器 resolve 完整 R 对象，新地址在 data.url（不是 res.url / res.data.data.url）
    expect(res.data.url).toBe(signed.url);
    expect(res.data.expiresIn).toBe(900);
  });

  it('file.signedUrl 是 getFileSignedUrl 的兼容别名', () => {
    expect(api.file.signedUrl).toBe(api.file.getFileSignedUrl);
  });
});
