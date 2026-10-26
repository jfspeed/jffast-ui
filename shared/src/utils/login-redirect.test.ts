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

import { describe, expect, it } from 'vitest';

import {
  buildLoginRoute,
  decodeLoginRedirect,
  DEFAULT_LOGIN_REDIRECT,
  encodeLoginRedirect,
  LOGIN_PATH,
  resolveLoginRedirectTarget,
} from './login-redirect';

describe('login-redirect 编解码', () => {
  it('带查询串的路径能原样往返', () => {
    const target = '/system/user?page=1&size=10';
    const encoded = encodeLoginRedirect(target);
    expect(encoded).toBe(encodeURIComponent(target));
    expect(decodeLoginRedirect(encoded)).toBe(target);
  });

  it('读取时缺失/非法回落默认落点', () => {
    expect(decodeLoginRedirect(undefined)).toBe(DEFAULT_LOGIN_REDIRECT);
    expect(decodeLoginRedirect('')).toBe(DEFAULT_LOGIN_REDIRECT);
    expect(decodeLoginRedirect('not-a-path')).toBe(DEFAULT_LOGIN_REDIRECT);
    expect(decodeLoginRedirect('//evil.com')).toBe(DEFAULT_LOGIN_REDIRECT);
    expect(decodeLoginRedirect('https://evil.com/x')).toBe(DEFAULT_LOGIN_REDIRECT);
    expect(decodeLoginRedirect(encodeURIComponent('/login?redirect=%2Fx'))).toBe(DEFAULT_LOGIN_REDIRECT);
  });

  it('读取时可指定回落落点（守卫用当前目标路径）', () => {
    expect(decodeLoginRedirect(undefined, '/demo/example')).toBe('/demo/example');
  });

  it('百分号残缺不抛异常，回落兜底', () => {
    expect(decodeLoginRedirect('%E0%A4%A')).toBe(DEFAULT_LOGIN_REDIRECT);
  });

  it('编码只放行站内路径', () => {
    expect(encodeLoginRedirect('/system/user')).toBe('%2Fsystem%2Fuser');
    expect(encodeLoginRedirect(LOGIN_PATH)).toBeUndefined();
    expect(encodeLoginRedirect('/login?redirect=%2Fx')).toBeUndefined();
    expect(encodeLoginRedirect('//evil.com')).toBeUndefined();
    expect(encodeLoginRedirect(undefined)).toBeUndefined();
  });
});

describe('buildLoginRoute', () => {
  it('有合法目标时带 redirect', () => {
    expect(buildLoginRoute('/system/user')).toEqual({
      path: LOGIN_PATH,
      query: { redirect: '%2Fsystem%2Fuser' },
    });
  });

  it('无合法目标时不带 redirect（防自环）', () => {
    expect(buildLoginRoute(LOGIN_PATH)).toEqual({ path: LOGIN_PATH });
    expect(buildLoginRoute()).toEqual({ path: LOGIN_PATH });
  });
});

describe('resolveLoginRedirectTarget', () => {
  it('路由已完成首次导航时用当前路由', () => {
    expect(resolveLoginRedirectTarget({ path: '/system/user', fullPath: '/system/user?page=1', matched: [{}] })).toBe(
      '/system/user?page=1',
    );
  });

  it('冷启动（START location，matched 为空）退回浏览器地址栏', () => {
    window.history.replaceState(null, '', '/flow/definition?id=3');
    expect(resolveLoginRedirectTarget({ path: '/', fullPath: '/', matched: [] })).toBe('/flow/definition?id=3');
    expect(resolveLoginRedirectTarget(null)).toBe('/flow/definition?id=3');
  });

  it('当前在登录页时不回跳登录页自身', () => {
    window.history.replaceState(null, '', '/login?redirect=%252Fsystem%252Fuser');
    expect(
      resolveLoginRedirectTarget({ path: '/login', fullPath: '/login?redirect=x', matched: [{}] }),
    ).toBeUndefined();
    expect(resolveLoginRedirectTarget(null)).toBeUndefined();
  });
});
