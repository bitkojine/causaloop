import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import boundariesPlugin from 'eslint-plugin-boundaries';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            '**/dist/**',
            'node_modules/**',
            'vitest.workspace.ts',
            'packages/**/vitest.config.ts',
            'eslint.config.js',
            '**/vite.config.ts',
            'playwright.config.ts',
            'tests/e2e/*.spec.ts',
            'packages/app-web/vitest.config.ts',
            '**/*.worker.ts',
            '**/integration.test.ts'
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parserOptions: {
                project: true,
            },
        },
        plugins: {
            import: importPlugin,
            boundaries: boundariesPlugin,
        },
        settings: {
            'import/resolver': {
                typescript: {
                    alwaysTryTypes: true,
                    project: ['./packages/*/tsconfig.json', './tsconfig.json'],
                },
            },
            'boundaries/elements': [
                {
                    type: 'core',
                    pattern: 'packages/core/*',
                },
                {
                    type: 'platform',
                    pattern: 'packages/platform-*/*',
                },
                {
                    type: 'app',
                    pattern: 'packages/app-*/*',
                },
            ],
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/switch-exhaustiveness-check': 'error',
            'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
            'boundaries/element-types': [
                'error',
                {
                    default: 'disallow',
                    rules: [
                        {
                            from: 'core',
                            allow: ['core'],
                        },
                        {
                            from: 'platform',
                            allow: ['core', 'platform'],
                        },
                        {
                            from: 'app',
                            allow: ['core', 'platform', 'app'],
                        },
                    ],
                },
            ],
        },
    },
    {
        files: ['**/*.js'],
        ...tseslint.configs.disableTypeChecked,
    },
);
