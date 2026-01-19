import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://edwarddev0723.github.io',
    base: '/Renhe_web',
    build: {
        assets: 'assets'
    },
    vite: {
        build: {
            cssMinify: true
        }
    }
});
