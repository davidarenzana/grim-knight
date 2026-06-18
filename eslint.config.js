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
    // Golden rule: the core (core/) must not import Phaser, Vue, Pinia or touch the DOM.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'phaser', message: 'core/ must be pure TS: do not import Phaser here.' },
            { name: 'vue', message: 'core/ must be pure TS: do not import Vue here.' },
            { name: 'pinia', message: 'core/ must be pure TS: do not import Pinia here.' },
          ],
          patterns: ['@engine/*', '@ui/*'],
        },
      ],
    },
  },

  skipFormatting,
]
