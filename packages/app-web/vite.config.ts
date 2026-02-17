import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // For GitHub Pages hash routing
    build: {
        outDir: 'dist',
    },
});
