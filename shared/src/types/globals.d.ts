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

declare type ClassName = { [className: string]: any } | ClassName[] | string;

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<object, object, any>;
  export default component;
}

declare module '*.svg' {
  const CONTENT: string;
  export default CONTENT;
}

declare module '*.svg?component' {
  const component: any;
  export default component;
}

declare type Recordable<T = any> = Record<string, T>;

declare module '@/utils/crypto' {
  export function rsaEncrypt(plainText: string, publicKey: string): string;
}

declare module '@/api/core/crud' {
  interface CrudApi {
    create: (data: any) => Promise<any>;
    update: (data: any) => Promise<any>;
    delete: (id: string | number) => Promise<any>;
    detail: (id: string | number) => Promise<any>;
    page: (params: any) => Promise<any>;
    list: (params?: any) => Promise<any>;
    [key: string]: any;
  }

  // 泛型保留 options 上的扩展方法（如 notification.userNotifications），
  // 否则 JS 业务 API 的扩展方法对 TS 不可见，注入运行时 API 时会类型不匹配
  export function createCrud<T extends Record<string, unknown>>(baseUrl: string, options?: T): CrudApi & T;

  // http 方法返回 Promise<any>：crud.js / 业务 API 是 JS，页面直接读 res.data，
  // 这里保持宽松类型才能让未建响应模型的页面正常取字段（收紧会级联出大量无意义类型错误）。
  export const http: {
    get: (url: string, params?: any, config?: any) => Promise<any>;
    post: (url: string, data?: any, config?: any) => Promise<any>;
    put: (url: string, data?: any, config?: any) => Promise<any>;
    delete: (url: string, data?: any, config?: any) => Promise<any>;
    upload: (url: string, formData: FormData, config?: any) => Promise<any>;
    download: (url: string, params?: any, filename?: string, config?: any) => Promise<any>;
  };
}

declare module 'jsencrypt' {
  export default class JSEncrypt {
    setPublicKey(key: string): void;
    encrypt(data: string): string | false;
    decrypt(data: string): string | false;
  }
}
