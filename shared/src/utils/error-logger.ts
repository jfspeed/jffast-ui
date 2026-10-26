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

/**
 * 前端错误日志收集工具
 * <p>
 * 功能：
 * <ul>
 *     <li>捕获 JS 运行时错误</li>
 *     <li>捕获未处理的 Promise 异常</li>
 *     <li>捕获接口请求错误</li>
 *     <li>错误日志上报到后端</li>
 * </ul>
 * <p>
 * 使用方式：
 * <pre>
 * import { initErrorLogger } from '@/utils/error-logger';
 * initErrorLogger();
 * </pre>
 *
 * @author jffast
 */

interface ErrorInfo {
  /** 错误类型 */
  type: string;
  /** 错误信息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 错误文件 */
  filename?: string;
  /** 错误行号 */
  lineno?: number;
  /** 错误列号 */
  colno?: number;
  /** 当前 URL */
  url: string;
  /** 用户代理 */
  userAgent: string;
  /** 时间戳 */
  timestamp: number;
  /** 页面标题 */
  title: string;
}

let initialized = false;

/**
 * 初始化错误日志收集
 */
export function initErrorLogger(): void {
  if (initialized) {
    return;
  }
  initialized = true;

  // 捕获 JS 运行时错误
  window.addEventListener('error', handleError);

  // 捕获未处理的 Promise 异常
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // 仅开发环境输出，避免生产控制台噪音（生产构建另有 drop_console 兜底）
  if (import.meta.env.DEV) {
    console.debug('[ErrorLogger] 已初始化');
  }
}

/**
 * 处理 JS 运行时错误
 */
function handleError(event: ErrorEvent): void {
  const errorInfo: ErrorInfo = {
    type: 'runtime-error',
    message: event.message,
    stack: event.error?.stack,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    title: document.title,
  };

  reportError(errorInfo);
}

/**
 * 处理未处理的 Promise 异常
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const reason = event.reason;
  const errorInfo: ErrorInfo = {
    type: 'unhandled-rejection',
    message: typeof reason === 'string' ? reason : reason?.message || 'Unknown error',
    stack: reason?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    title: document.title,
  };

  reportError(errorInfo);
}

/**
 * 上报错误信息
 */
async function reportError(errorInfo: ErrorInfo): Promise<void> {
  try {
    // 过滤常见无意义错误
    if (filterError(errorInfo)) {
      return;
    }

    // 避免频繁上报
    const lastReport = sessionStorage.getItem('lastErrorReport');
    if (lastReport && Date.now() - Number(lastReport) < 5000) {
      return;
    }
    sessionStorage.setItem('lastErrorReport', String(Date.now()));

    // 后端暂无 /log/client-error 接口：仅本地 console 记录，避免 404 噪音。
    // 后端接入后改回：await http.post('/log/client-error', errorInfo);
    if (import.meta.env.DEV) {
      console.debug('[ErrorLogger]', errorInfo);
    }
  } catch {
    // 静默处理，避免影响用户体验
  }
}

/**
 * 过滤无意义错误
 */
function filterError(errorInfo: ErrorInfo): boolean {
  // 过滤 ResizeObserver 循环错误
  if (errorInfo.message?.includes('ResizeObserver loop')) {
    return true;
  }

  // 过滤网络请求错误（由 axios 拦截器处理）
  if (errorInfo.message?.includes('Network Error') || errorInfo.message?.includes('timeout')) {
    return true;
  }

  // 过滤第三方脚本错误
  if (errorInfo.filename?.includes('chrome-extension://') || errorInfo.filename?.includes('moz-extension://')) {
    return true;
  }

  return false;
}

/**
 * 手动上报错误
 */
export function reportManualError(error: Error | string, extra?: Record<string, unknown>): void {
  const errorInfo: ErrorInfo = {
    type: 'manual-error',
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
    title: document.title,
    ...extra,
  };

  reportError(errorInfo);
}
