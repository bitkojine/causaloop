import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        name: 'platform-browser',
        include: ['src/**/*.test.ts'],
    },
});
