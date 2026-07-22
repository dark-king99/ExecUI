import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
      // PascalCase / underscore identifiers are components, types or intentional
      // throwaways — don't flag them (covers `const Icon`, `({ Component }) =>`,
      // which are used in JSX the base linter can't see without eslint-plugin-react).
      // Unused catch bindings are idiomatic and harmless.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
        caughtErrors: 'none',
      }],
      // Adopt the stricter react-hooks v7 + react-refresh rules as warnings on the
      // existing codebase: they stay visible in lint output and editors but don't
      // block CI. Tracked for incremental cleanup.
      'react-refresh/only-export-components': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  // Node-land files (build config, tooling, standalone scripts) run under Node,
  // not the browser — give them Node globals so `__dirname`, `require`, etc. resolve.
  {
    files: ['vite.config.js', 'eslint.config.js', '**/services/server.js'],
    languageOptions: { globals: globals.node },
  },
])
