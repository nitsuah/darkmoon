import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
    plugins: [
        react({
            jsxRuntime: 'automatic',
        }),
        visualizer({
            open: false,
            filename: 'bundle-stats.html',
            gzipSize: true,
            brotliSize: true,
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            'react': path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        },
        dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'three']
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'three'],
        exclude: []
    },
    build: {
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true
        },
        rollupOptions: {
            output: {
                manualChunks(id) {
                    const normalizedId = id.replace(/\\/g, '/');

                    if (
                        normalizedId.includes('/node_modules/react/') ||
                        normalizedId.includes('/node_modules/react-dom/') ||
                        normalizedId.includes('/node_modules/react-router-dom/')
                    ) {
                        return 'react-vendor';
                    }

                    if (
                        normalizedId.includes('/node_modules/three/') ||
                        normalizedId.includes('/node_modules/@react-three/fiber/') ||
                        normalizedId.includes('/node_modules/@react-three/drei/')
                    ) {
                        return 'three-vendor';
                    }

                    return undefined;
                }
            }
        }
    }
});
