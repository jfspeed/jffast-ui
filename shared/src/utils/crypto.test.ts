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

import forge from 'node-forge';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rsaEncrypt } from './crypto';

// 与后端 RSAUtilOaepFixtureTest 共用的测试密钥对（node-forge 生成，2048 位，仅测试用）
const PUB_B64 =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwLzGg0Bls9VtPVBZfQgCSjFlWFrlyF0aaUpAWoQa07xxOwPhMgJtI8TGMJ2S1vQNJ3g1oc7s3J8bNJ0Y26xoLe5XzpHPE1wmQP0PmUXvpBTu50vgM1X6+pBKPnQWs1RBGveNz6ydbkqlNFmMAWnNgwFcW3u+fXTXjPS/Zh5rXlQvAg06PhjZDNL9P2VJWptQWJv+C4ODGoJjoEqZUEV/UpHW7M1maMNLiFT5kNxzM992elMjhd9hZuetI+bO4+R6Ok5D2vhlFF1oiGMp6/hZbG6N7gmPaxitnFJ37Zf3bwB2mBFkFRgBpHhw5r7ooKIhLCgEC3UFkAGZypzG62WH1wIDAQAB';
const PRIV_B64 =
  'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDAvMaDQGWz1W09UFl9CAJKMWVYWuXIXRppSkBahBrTvHE7A+EyAm0jxMYwnZLW9A0neDWhzuzcnxs0nRjbrGgt7lfOkc8TXCZA/Q+ZRe+kFO7nS+AzVfr6kEo+dBazVEEa943PrJ1uSqU0WYwBac2DAVxbe759dNeM9L9mHmteVC8CDTo+GNkM0v0/ZUlam1BYm/4Lg4MagmOgSplQRX9SkdbszWZow0uIVPmQ3HMz33Z6UyOF32Fm560j5s7j5Ho6TkPa+GUUXWiIYynr+Flsbo3uCY9rGK2cUnftl/dvAHaYEWQVGAGkeHDmvuigoiEsKAQLdQWQAZnKnMbrZYfXAgMBAAECggEAQ0RfYEWkeTw+8QxO/0VBT1WoEks/MUvVQPQqO60pk8aMGlXDTens33P429TS//STdrgMt9l5b5KUMyu1Fk442fb6bF0VUaNysnHf9NWkyraHnvArYp9ahgK/9sYbeiEoy9mkg9ux4mFpATlTlNaxZEygSEmK9UxHQqnU9zYcsQHDYds/NrXv/PGnXPqrfxH0A0ZfNSg9h2Nx5yr1JZWdO1vlS0EwAoH/7ovixpAxgWhp1qfJeVLvhsiOQOFjM+e9KUJR5Fzd0wvNnMHMvJ1whJPsYWtfjT4C3hnQej9Dcw0B8FPe7v/NONKWp11CKH0VGSQrZYB+M9kVz4HvnSz0+QKBgQDovW6qBTf9iqZrfpylIofHOSRD8KiswMu3xidWPAS+e/byIsKZJc7EFOITk4frd+q9wykAQ9ZblQYSGcMRgNcLI+0OGx4afCxG6YWm40oyrp8qvKlB79SsZTGrdjqvJoPQJ0FarD4T9Sn76HLsMoU1a9oMn83mWX5Qx0RbrFB7wwKBgQDT/+RbfB6enOTbdUIYI9MUIMAfx8rQRBoFgZj3nXBYP0X+SJClk8kQknbsiw7NQ8wI9ooK5CZy5C3+AfZMYwfe4v2kY2KZenVUVmbybPMVM/kIxFgcOpF3COWEpR8DHJMc85W458B2sXJBcUOyrRbH7vv/7ifQRTGeiZlduZYGXQKBgEDL7LF9PndiUK8A0w/Oq0q2B/i6Wduu2YjSrET/9LorvTbwookM06IXxlF485CFFF+8o/+k41sgBE6pyXtoCXbai7cvqZPqGlGr1j/+a7vsjffSCrWG1gkhK1D3W6ND79LV+wYJikb4LLYro0NLVXboDg8Rtrt5EwfeUpPLR6UNAoGAKrgHtf+e0+tdmnNYbDDb2dR3om/KCImQjMd+oXbSKpYlboYEz7il7Xb2C9hBlU8yECRN0MAEl2Yvdl3C2cWi0mD/J173gWHRvrriZ7tYiE8+wWt/LcEHiur6BO6Y/zGE23KiGu5oNAKxuUovkBOc4ZDgqsO8thUbWIz1oJNDDekCgYEAi0ITe/F1r0Zm96PZMmUv5uEeRhUc2BY/ZVgLS4GvHdVO9kNc5an+UYx/h6xSnlXYcrfob1857i/WOU+5FZuHaTDcLJ1Q1Jc6OS3qOclHLz5d3pZoupEL3qKnMz2eWVOEYgn/ABX800p/e/zD58zHM6XmlGFz+eWtbCy6o76rqYU=';

function toPem(body: string, label: string): string {
  const chunks = body.match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN ${label}-----\n${chunks}\n-----END ${label}-----`;
}

/** 用 fixture 私钥按后端同参 OAEP 解密（SHA-256 摘要 + MGF1-SHA1），返回 UTF-8 明文 */
function oaepDecrypt(cipherB64: string): string {
  const privateKey = forge.pki.privateKeyFromPem(toPem(PRIV_B64, 'PRIVATE KEY'));
  const decrypted = privateKey.decrypt(forge.util.decode64(cipherB64), 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha1.create() },
  });
  return forge.util.decodeUtf8(decrypted);
}

describe('rsaEncrypt', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('returns empty string when plaintext missing', () => {
    expect(rsaEncrypt('', 'pubkey')).toBe('');
    expect(rsaEncrypt(null, 'pubkey')).toBe('');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns empty string when public key missing', () => {
    expect(rsaEncrypt('secret', '')).toBe('');
    expect(rsaEncrypt('secret', null)).toBe('');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('returns empty string (not throw) with invalid key material', () => {
    expect(rsaEncrypt('secret', 'not-a-real-key')).toBe('');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('encrypts payload that decrypts with same OAEP params and fixture private key', () => {
    const payload = '1762800000000:R14-前端@密码2026';
    const cipher = rsaEncrypt(payload, PUB_B64);
    expect(cipher).not.toBe('');
    expect(oaepDecrypt(cipher)).toBe(payload);
  });

  it('accepts payload at the 190-byte OAEP boundary', () => {
    const payload = `1762800000000:${'A'.repeat(176)}`;
    expect(new TextEncoder().encode(payload).length).toBe(190);
    const cipher = rsaEncrypt(payload, PUB_B64);
    expect(cipher).not.toBe('');
    expect(oaepDecrypt(cipher)).toBe(payload);
  });

  it('rejects payload over the 190-byte limit with empty result', () => {
    const payload = `1762800000000:${'A'.repeat(177)}`;
    expect(new TextEncoder().encode(payload).length).toBe(191);
    expect(rsaEncrypt(payload, PUB_B64)).toBe('');
    expect(errorSpy).toHaveBeenCalledWith('RSA 加密失败：载荷超过 190 字节上限');
  });
});
