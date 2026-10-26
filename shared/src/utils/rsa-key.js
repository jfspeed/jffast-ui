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

import { rsaEncrypt } from './crypto';
import { request } from './request';

/**
 * RSA 公钥获取：优先用构建期注入的公钥，否则向后端动态拉取。
 * <p>
 * 背景：仓库曾内置一套「示例密钥对」以便开箱即用，但私钥入库即永久泄露
 * （git 历史不可逆），而它正是用来解密登录密码明文的。
 * 现在后端 dev/test 启动时自动生成一次性密钥对，前端无法预先内置公钥，
 * 因此改为运行时向 {@code GET /sys/rsaPublicKey} 拉取。
 * <p>
 * 生产构建仍建议用 {@code VITE_RSA_PUBLIC_KEY} 注入（配合后端固定密钥对，
 * 多实例部署时各实例密钥必须一致），少一次请求也少一个失败点。
 */

/** 构建期注入的公钥；为空表示未注入，走运行时拉取 */
const envPublicKey = (import.meta.env.VITE_RSA_PUBLIC_KEY || '').trim();

/** 拉取结果缓存：避免每次登录 / 改密都发一次请求 */
let cachedPublicKey = '';

/** 进行中的请求（单飞）：并发调用只发一次网络请求 */
let inFlight = null;

/**
 * 获取 RSA 公钥。
 *
 * @returns {Promise<string>} 公钥内容；获取失败返回空串，由调用方决定降级策略
 *          （登录页应阻止提交，而不是退回明文密码）
 */
export async function getRsaPublicKey() {
  if (envPublicKey) {
    return envPublicKey;
  }
  if (cachedPublicKey) {
    return cachedPublicKey;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = request
    .get('/sys/rsaPublicKey', {
      // 静默：登录前探测公钥失败时不弹全局错误 toast，由调用方自行提示
      headers: { 'X-Silent-Error': 'true' },
    })
    .then((res) => {
      cachedPublicKey = (res?.data || '').trim();
      return cachedPublicKey;
    })
    .catch(() => '')
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** 清空缓存（切换后端 / 重新登录时可调用） */
export function clearRsaPublicKeyCache() {
  cachedPublicKey = '';
}

/**
 * 加密密码：明文格式为 {@code <毫秒时间戳>:<密码>}。
 * <p>
 * RSA PKCS#1 v1.5 是确定性加密——相同明文每次得到相同密文，因此单纯加密无法防止
 * 被截获的登录报文被无限期重放。拼上时间戳后，服务端（RSAUtil#decryptPwdWithTimestamp）
 * 可拒绝超过时间窗的密文，把重放窗口从"永久"收敛到几分钟。
 * <p>
 * <b>与后端成对出现，改动必须同步。</b>
 *
 * @param {string} password 明文密码
 * @param {string} publicKey RSA 公钥
 * @returns {string} 密文；加密失败返回空串
 */
export function encryptPassword(password, publicKey) {
  return rsaEncrypt(`${Date.now()}:${password}`, publicKey);
}
