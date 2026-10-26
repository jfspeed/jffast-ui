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

import en from './lang/en_US.json?raw';
// ?raw：拿到源文件文本而不是解析后的对象——重复键只有看原文才测得出来，
// 且 happy-dom 环境下 import.meta.url 不是 file: 协议，读不了 fs。
import zh from './lang/zh_CN.json?raw';

interface Frame {
  indent: number;
  key: string;
}

/**
 * 逐行还原「完整键路径」，而不是 JSON.parse：parse 遇到重复键会静默保留最后一个，
 * 「同层重复键互相覆盖」正是 dashboard 标题渲染成原始 i18n 键的成因，只有看得见重复的解析方式才能拦住它。
 *
 * <p>两份语言包都是「一行一键」的美化格式，故用缩进还原层级即可，不需要括号配对。
 */
function keyPaths(rawText: string): { paths: string[]; leaves: string[] } {
  const stack: Frame[] = [];
  const paths: string[] = [];
  const leaves: string[] = [];
  for (const line of rawText.split(/\r?\n/)) {
    const match = /^(\s*)"([^"]+)"\s*:(.*)$/.exec(line);
    if (!match) {
      continue;
    }
    const [, indentText, key, rawValue] = match;
    const value = rawValue.trim();
    const indent = indentText.length;
    let top = stack.at(-1);
    while (top !== undefined && top.indent >= indent) {
      stack.pop();
      top = stack.at(-1);
    }
    stack.push({ indent, key });
    const path = stack.map((frame) => frame.key).join('.');
    paths.push(path);
    if (!/^\{\s*$/.test(value)) {
      leaves.push(path);
    }
  }
  return { paths, leaves };
}

function duplicatesOf(paths: string[]): string[] {
  const counts = new Map<string, number>();
  paths.forEach((path) => counts.set(path, (counts.get(path) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([path]) => path);
}

describe('locale 契约（zh_CN / en_US）', () => {
  it('同一嵌套层不得出现重复键（JSON.parse 会静默丢弃先写的值）', () => {
    expect({ zh: duplicatesOf(keyPaths(zh).paths), en: duplicatesOf(keyPaths(en).paths) }).toEqual({
      zh: [],
      en: [],
    });
  });

  it('两份语言包的叶子键集合完全一致（缺键会让界面直接显示原始键名）', () => {
    const zhLeaves = new Set(keyPaths(zh).leaves);
    const enLeaves = new Set(keyPaths(en).leaves);
    expect({
      onlyInZh: [...zhLeaves].filter((key) => !enLeaves.has(key)).sort(),
      onlyInEn: [...enLeaves].filter((key) => !zhLeaves.has(key)).sort(),
    }).toEqual({ onlyInZh: [], onlyInEn: [] });
  });

  it('两份文件都是可解析的非空 JSON', () => {
    expect(Object.keys(JSON.parse(zh)).length).toBeGreaterThan(0);
    expect(Object.keys(JSON.parse(en)).length).toBeGreaterThan(0);
  });
});
