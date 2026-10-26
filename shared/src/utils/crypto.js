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

import JSEncrypt from 'jsencrypt';

const PEM_CHUNK_RE = /.{1,64}/g;

export function rsaEncrypt(plainText, publicKey) {
  if (!plainText || !publicKey) {
    console.error('RSA 加密失败：明文或公钥为空');
    return '';
  }

  try {
    const pemKey = `-----BEGIN PUBLIC KEY-----\n${publicKey.match(PEM_CHUNK_RE).join('\n')}\n-----END PUBLIC KEY-----`;

    const encryptor = new JSEncrypt();
    encryptor.setPublicKey(pemKey);

    const encrypted = encryptor.encrypt(plainText);
    if (!encrypted) {
      console.error('RSA 加密失败：加密无结果');
      return '';
    }
    return encrypted;
  } catch (error) {
    console.error('RSA 加密异常：', error.message);
    return '';
  }
}
