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

import { getDateArray, getRandomArray } from './charts';

describe('getDateArray', () => {
  it('returns empty array when no range given', () => {
    expect(getDateArray()).toEqual([]);
    expect(getDateArray([])).toEqual([]);
  });

  it('splits the range into divideNum day labels starting at the lower bound', () => {
    const result = getDateArray(['2024-01-01', '2024-01-11'], 10);
    expect(result).toHaveLength(10);
    expect(result[0]).toBe('2024-01-01');
    expect(result[9]).toBe('2024-01-10');
  });

  it('honours a custom divideNum', () => {
    const result = getDateArray(['2024-01-01', '2024-01-05'], 4);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('2024-01-01');
  });
});

describe('getRandomArray', () => {
  it('always returns 1 when num is 1', () => {
    expect(getRandomArray(1)).toBe(1);
  });

  it('returns an integer within [1, num]', () => {
    for (let i = 0; i < 200; i += 1) {
      const n = getRandomArray(100);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(100);
    }
  });

  it('defaults to num = 100', () => {
    const n = getRandomArray();
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(100);
  });
});
