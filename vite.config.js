import {defineConfig} from 'vite';
export default defineConfig({esbuild:{jsx:'automatic'},build:{rollupOptions:{external:['three','/vendor/OrbitControls.js']}}});
