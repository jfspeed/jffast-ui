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

import path from 'node:path';

import { defineConfig } from 'vitest/config';

const sharedDir = path.resolve(__dirname, './shared/src');

export default defineConfig({
  resolve: {
    alias: {
      '@/api/core': path.resolve(sharedDir, 'api/core'),
      '@/hooks': path.resolve(sharedDir, 'hooks'),
      '@/utils': path.resolve(sharedDir, 'utils'),
      '@/components': path.resolve(sharedDir, 'components'),
      '@/store': path.resolve(sharedDir, 'store'),
      '@/layouts': path.resolve(sharedDir, 'layouts'),
      '@/locales': path.resolve(sharedDir, 'locales'),
      '@/config': path.resolve(sharedDir, 'config'),
      '@/constants': path.resolve(sharedDir, 'constants'),
      '@/runtime': path.resolve(sharedDir, 'runtime'),
      '@/types': path.resolve(sharedDir, 'types'),
      '@jfspeed/shared': sharedDir,
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['shared/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
    exclude: ['**/node_modules/**', '**/dist/**', '_e2e-logs/**'],
  },
});
