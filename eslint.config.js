import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // El backend (server/) es Node CommonJS con su propio entorno: no lo lintamos con la config del frontend.
  globalIgnores(['dist', 'server']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Archivos que se ejecutan en Node: config (vite.config.js…) y scripts de utilidad.
    files: ['*.config.{js,mjs,cjs}', 'scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
