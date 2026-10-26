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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeWebSocket {
  static OPEN = 1;

  static CONNECTING = 0;

  static CLOSED = 3;

  static instances: FakeWebSocket[] = [];

  url: string;

  protocols?: string | string[];

  readyState = FakeWebSocket.CONNECTING;

  sent: string[] = [];

  onopen: ((event: Event) => void) | null = null;

  onmessage: ((event: MessageEvent) => void) | null = null;

  onerror: ((event: Event) => void) | null = null;

  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
  }

  triggerOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  triggerClose() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.(new Event('close') as CloseEvent);
  }
}

async function loadModule() {
  vi.resetModules();
  return import('./websocket');
}

beforeEach(() => {
  localStorage.clear();
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.useFakeTimers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

function expectedWsPath() {
  const basePath = (import.meta.env.VITE_API_URL as string) || '';
  return basePath ? `${basePath}/ws` : '/ws';
}

describe('resolveWebSocketUrl', () => {
  it('默认不把 token 放进 URL', async () => {
    localStorage.setItem('token', 't 1');
    const { resolveWebSocketUrl } = await loadModule();

    expect(resolveWebSocketUrl()).toBe(`ws://${window.location.host}${expectedWsPath()}`);
    expect(resolveWebSocketUrl(false)).not.toContain('token=');
  });

  it('显式降级时把 token 编码后放入 query', async () => {
    localStorage.setItem('token', 't 1');
    const { resolveWebSocketUrl } = await loadModule();

    expect(resolveWebSocketUrl(true)).toBe(`ws://${window.location.host}${expectedWsPath()}?token=t%201`);
  });
});

describe('connectNotificationSocket', () => {
  it('没有 token 时不建连', async () => {
    const { connectNotificationSocket } = await loadModule();
    connectNotificationSocket();

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it('优先使用握手子协议传递 token', async () => {
    localStorage.setItem('token', 't1');
    const { connectNotificationSocket } = await loadModule();
    connectNotificationSocket();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].protocols).toEqual(['jffast-token.t1']);
    expect(FakeWebSocket.instances[0].url).not.toContain('token=');
  });

  it('子协议握手失败仅本次降级为 query，之后恢复子协议', async () => {
    localStorage.setItem('token', 't1');
    const mod = await loadModule();
    mod.connectNotificationSocket();

    // 第一次：未 open 即 close ⇒ 子协议失败
    FakeWebSocket.instances[0].triggerClose();
    vi.advanceTimersByTime(3_000);

    expect(FakeWebSocket.instances).toHaveLength(2);
    expect(FakeWebSocket.instances[1].url).toContain('?token=t1');

    // 第二次：open 后 close ⇒ 后续重连回到子协议
    FakeWebSocket.instances[1].triggerOpen();
    FakeWebSocket.instances[1].triggerClose();
    vi.advanceTimersByTime(3_000);

    expect(FakeWebSocket.instances).toHaveLength(3);
    expect(FakeWebSocket.instances[2].url).not.toContain('token=');
    expect(FakeWebSocket.instances[2].protocols).toEqual(['jffast-token.t1']);

    mod.closeNotificationSocket();
  });

  it('只分发合法 JSON 业务帧，忽略 pong 与非 JSON', async () => {
    localStorage.setItem('token', 't1');
    const mod = await loadModule();
    const received: unknown[] = [];
    mod.onNotificationMessage((message) => received.push(message));

    mod.connectNotificationSocket();
    const ws = FakeWebSocket.instances[0];
    ws.triggerOpen();
    ws.onmessage?.({ data: 'pong' } as MessageEvent);
    ws.onmessage?.({ data: 'not-json' } as MessageEvent);
    ws.onmessage?.({ data: JSON.stringify({ type: 'notification', data: { id: 1 } }) } as MessageEvent);

    expect(received).toEqual([{ type: 'notification', data: { id: 1 } }]);
    mod.closeNotificationSocket();
  });

  it('显式关闭后不再自动重连', async () => {
    localStorage.setItem('token', 't1');
    const mod = await loadModule();
    mod.connectNotificationSocket();
    FakeWebSocket.instances[0].triggerOpen();

    mod.closeNotificationSocket();
    vi.advanceTimersByTime(60_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
