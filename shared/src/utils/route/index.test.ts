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

import { PAGE_NOT_FOUND_ROUTE } from '@/utils/route/constant';

import { transformObjectToRoute } from './index';

describe('transformObjectToRoute', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('prepends the not-found route', () => {
    const result = transformObjectToRoute([{ name: 'home', path: '/home', component: 'LAYOUT' }]);
    expect(result[0]).toBe(PAGE_NOT_FOUND_ROUTE as any);
    expect(result).toHaveLength(2);
  });

  it('maps a LAYOUT component string to the layout loader', () => {
    const result = transformObjectToRoute<any>([{ name: 'home', path: '/home', component: 'LAYOUT' }]);
    expect(typeof result[1].component).toBe('function');
    expect(result[1].name).toBe('home');
  });

  it('wraps a non-layout page under a generated parent', () => {
    const result = transformObjectToRoute<any>([
      { name: 'user', path: '/system/user', component: '/system/user/index' },
    ]);
    const parent = result[1];
    expect(parent.name).toBe('userParent');
    expect(parent.path).toBe('');
    expect(typeof parent.component).toBe('function');
    expect(parent.children).toHaveLength(1);
    expect(parent.children[0].path).toBe('/system/user');
  });

  it('directory without component falls back to PARENT_LAYOUT (fixed 2026-10-17, do NOT throw)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = transformObjectToRoute<any>([
      { name: 'dirMenu', path: '/e2e/dir', children: [{ name: 'childX', path: '/child/x' }] },
    ]);
    expect(result[1]?.component).toBeDefined();
    expect(result[1]?.children).toHaveLength(1);
  });

  it('menu row with no component AND no children gets 404 fallback component', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = transformObjectToRoute<any>([{ name: 'orphanMenu', path: '/e2e/orphan' }]);
    expect(typeof result[1]?.component).toBe('function');
    expect(result[1]?.path).toBe('/e2e/orphan');
  });
});
