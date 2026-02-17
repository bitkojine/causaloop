import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        alias: {
            '@causaloop/core': path.resolve(__dirname, '../core/src/index.ts'),
            '@causaloop/platform-browser': path.resolve(__dirname, '../platform-browser/src/index.ts'),
        },
    },
    resolve: {
        alias: {
            // Ensure source imports during tests
            '@causaloop/core': path.resolve(__dirname, '../core/src/index.ts'),
            '@causaloop/platform-browser': path.resolve(__dirname, '../platform-browser/src/index.ts'),
        }
    }
});
