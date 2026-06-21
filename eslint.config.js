import pluginVue from 'eslint-plugin-vue'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**'],
  },

  ...pluginVue.configs['flat/recommended'],
  ...vueTsEslintConfig(),

  {
    name: 'app/core-purity',
    // Golden rule: the core (core/, incl. the core/app application layer) must not
    // import any framework/IO — Phaser, Vue, Pinia, the mitt bus or the @shared
    // adapter module — nor touch the DOM. Effects cross the boundary as data
    // (see core/app), never as direct calls.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'phaser', message: 'core/ must be pure TS: do not import Phaser here.' },
            { name: 'vue', message: 'core/ must be pure TS: do not import Vue here.' },
            { name: 'pinia', message: 'core/ must be pure TS: do not import Pinia here.' },
            {
              name: 'mitt',
              message: 'core/ must not depend on the event bus: return effects as data instead.',
            },
          ],
          patterns: ['@engine/*', '@ui/*', '@shared', '@shared/*'],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'core/ must be pure TS: no DOM/browser globals.' },
        { name: 'document', message: 'core/ must be pure TS: no DOM/browser globals.' },
        { name: 'localStorage', message: 'core/ must be pure TS: no DOM/browser globals.' },
        { name: 'navigator', message: 'core/ must be pure TS: no DOM/browser globals.' },
      ],
    },
  },

  skipFormatting,
]
