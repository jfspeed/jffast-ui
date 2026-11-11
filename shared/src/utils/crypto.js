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

const PEM_CHUNK_RE = /.{1,64}/g;

/**
 * 登录密码载荷的 UTF-8 字节上限：后端 RSA-OAEP（SHA-256 摘要，2048 位密钥）的
 * 明文上限为 256 - 2×32 - 2 = 190 字节。载荷由登录/改密入口拼为 `<时间戳>:<密码>`
 * （时间戳+冒号占 14 字节），超限密文在加密层就会失败，必须前置拦截。
 */
const PAYLOAD_MAX_BYTES = 190;

/** 与后端 RSAUtil#decryptPwdWithTimestamp 逐一对齐的 OAEP 参数：摘要 SHA-256、MGF1-SHA1、空 label */
function oaepOptions() {
  return { md: forge.md.sha256.create(), mgf1: { md: forge.md.sha1.create() } };
}

export function rsaEncrypt(plainText, publicKey) {
  if (!plainText || !publicKey) {
    console.error('RSA 加密失败：明文或公钥为空');
    return '';
  }

  try {
    if (new TextEncoder().encode(plainText).length > PAYLOAD_MAX_BYTES) {
      console.error(`RSA 加密失败：载荷超过 ${PAYLOAD_MAX_BYTES} 字节上限`);
      return '';
    }

    const pemKey = `-----BEGIN PUBLIC KEY-----\n${publicKey.match(PEM_CHUNK_RE).join('\n')}\n-----END PUBLIC KEY-----`;
    const publicKeyObj = forge.pki.publicKeyFromPem(pemKey);

    // encodeUtf8：明文按 UTF-8 字节进密文（后端按 UTF-8 解出），非 ASCII 密码口径一致
    const encrypted = publicKeyObj.encrypt(forge.util.encodeUtf8(plainText), 'RSA-OAEP', oaepOptions());
    if (!encrypted) {
      console.error('RSA 加密失败：加密无结果');
      return '';
    }
    return forge.util.encode64(encrypted);
  } catch (error) {
    console.error('RSA 加密异常：', error.message);
    return '';
  }
}
