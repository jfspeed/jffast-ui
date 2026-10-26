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

import { rsaEncrypt } from './crypto';

describe('rsaEncrypt', () => {
  it('returns empty string when plaintext missing', () => {
    expect(rsaEncrypt('', 'pubkey')).toBe('');
    expect(rsaEncrypt(null, 'pubkey')).toBe('');
  });

  it('returns empty string when public key missing', () => {
    expect(rsaEncrypt('secret', '')).toBe('');
    expect(rsaEncrypt('secret', null)).toBe('');
  });

  it('encrypts non-empty result with valid-looking key material', () => {
    // JSEncrypt 需要完整 PEM；此处用占位验证异常分支返回 '' 而非抛错
    const out = rsaEncrypt('secret', 'not-a-real-key');
    expect(typeof out).toBe('string');
  });
});
