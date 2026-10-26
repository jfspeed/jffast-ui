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

import antfu from '@antfu/eslint-config';
import { globalIgnores } from 'eslint/config';
import prettier from 'eslint-plugin-prettier/recommended';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import vueCss from 'eslint-plugin-vue-scoped-css';
import globals from 'globals';
import typescript from 'typescript-eslint';

export default antfu(
  {
    typescript: true,
    vue: true,
    jsonc: false,
    yaml: false,
    markdown: false,
    formatters: false,
  },
  [
    ...vueCss.configs['flat/recommended'],
    prettier,
    {
      languageOptions: {
        globals: {
          ...globals.browser,
          ...globals.node,
          ...globals.jest,
          defineProps: 'readonly',
          defineEmits: 'readonly',
        },
        ecmaVersion: 2022,
        sourceType: 'module',

        parserOptions: {
          parser: typescript.parser,
          allowImportExportEverywhere: true,

          ecmaFeatures: {
            jsx: true,
          },
        },
      },

      plugins: {
        'simple-import-sort': simpleImportSort,
      },

      settings: {
        'import/extensions': ['.js', '.jsx', '.ts', '.tsx'],
      },

      rules: {
        /* Closed due to template running
         * (Recommended to open!)
         */
        'no-console': 'off',
        'ts/no-explicit-any': 'error',

        /* Disallow person rules */
        'antfu/top-level-function': 'off',
        'antfu/if-newline': 'off',
        'n/prefer-global/process': 'off',

        /* If you need control the imports sequence, must be off
         *  https://github.com/vuejs/vue-eslint-parser/issues/58
         */
        'import/first': 'off',

        /* Allow start with _ */
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          },
        ],
        'vue/no-unused-vars': [
          'error',
          {
            ignorePattern: '^_',
          },
        ],
        // Using ts/no-unused-vars instead
        'no-unused-vars': 'off',

        /* Some variables are initialized in the function */
        '@typescript-eslint/no-use-before-define': 'off',
        'no-use-before-define': 'off',

        /* Disable antfu sort, use simple sort import */
        'perfectionist/sort-imports': 'off',
        'perfectionist/sort-named-imports': 'off',
        'simple-import-sort/imports': 'error',
        'simple-import-sort/exports': 'error',
        // Disable unused-imports rules in other presets
        'unused-imports/no-unused-imports': 'off',
        'unused-imports/no-unused-vars': 'off',
      },
    },
    {
      files: ['**/*.vue'],

      rules: {
        'vue/component-name-in-template-casing': ['error', 'kebab-case'],
        'vue/custom-event-name-casing': ['error', 'kebab-case'],
        'vue/block-order': [
          'error',
          {
            order: ['template', 'script', 'style'],
          },
        ],
        'vue/block-lang': [
          'error',
          {
            script: {
              lang: ['ts', 'tsx'],
            },
          },
        ],
        'vue/multi-word-component-names': 'off',
        'vue/no-reserved-props': 'off',
        // v-html 会绕过 Vue 的转义 → XSS 高危；恢复为 error，个别受信静态文案按行豁免
        'vue/no-v-html': 'error',

        'vue-scoped-css/no-parsing-error': 'off',
        'vue-scoped-css/no-unused-selector': 'off',
        'vue-scoped-css/enforce-style-type': [
          'error',
          {
            allows: ['scoped'],
          },
        ],
        'vue/padding-line-between-blocks': ['error', 'never'],
      },
    },
    {
      // 业务页面（src/pages/**）与单测：直接消费后端动态 payload（表格行、表单值、接口响应），
      // 逐页建响应模型成本高、收益低，且易与后端契约脱节；框架层（shared/**、路由守卫等）
      // 必须是 any-free —— 那里才是被复用的公共契约。
      files: ['src/pages/**/*.ts', 'src/pages/**/*.vue', '**/*.test.ts'],
      rules: {
        'ts/no-explicit-any': 'off',
      },
    },
    {
      // 核心且稳定的页面：已收敛 any 并纳入门禁，防止回退。
      // 新增页面完成收敛后，把其路径追加到这里；这里是"已达标"白名单，越往后越长。
      files: [
        'src/pages/system/user/**/*.{ts,vue}',
        'src/pages/system/role/**/*.{ts,vue}',
        'src/pages/system/dept/**/*.{ts,vue}',
        'src/pages/system/dict/**/*.{ts,vue}',
        'src/pages/system/config/**/*.{ts,vue}',
        'src/pages/system/log/**/*.{ts,vue}',
        'src/pages/system/monitor/**/*.{ts,vue}',
        'src/pages/dashboard/**/*.{ts,vue}',
        'src/pages/system/menu/**/*.{ts,vue}',
        'src/pages/user/**/*.{ts,vue}',
        'src/pages/system/notification/**/*.{ts,vue}',
        'src/pages/system/task/**/*.{ts,vue}',
        'src/pages/system/file/**/*.{ts,vue}',
        'src/pages/system/post/**/*.{ts,vue}',
      ],
      rules: {
        'ts/no-explicit-any': 'error',
      },
    },
    {
      // 环境声明 / 第三方模块 shim（*.d.ts）需要宽松类型：
      // 例如 `Promise<any>` 才能让 createCrud 返回值在各页面直接取字段，
      // 这类 any 属既有事实约定，收紧会级联出大量无意义类型错误。
      // 业务代码（.ts/.vue）一律禁止 any，由上面的 ts/no-explicit-any: error 约束。
      files: ['**/*.d.ts'],
      rules: {
        'ts/no-explicit-any': 'off',
      },
    },
    globalIgnores([
      '**/snapshot*',
      '**/dist',
      '**/lib',
      '**/es',
      '**/esm',
      '**/node_modules',
      'src/_common',
      '**/static',
      '**/cypress',
      'script/test/cypress',
      '**/_site',
      '**/temp*',
      '**/static/',
      '!**/.prettierrc.js',
      // 构建期工具脚本（CommonJS，不属于应用代码）：不走前端 lint 门禁
      'scripts/**',
    ]),
  ],
);
