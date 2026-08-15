import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [vue()],
        resolve: {
            alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        },
        server: {
            port: 5173,
            // Backend di-proxy lewat origin yang sama saat pengembangan, sehingga
            // tidak ada perbedaan URL antara dev dan produksi — dan tidak ada
            // preflight CORS yang perlu diurus di lokal.
            proxy: {
                '/api': { target: env.VITE_API_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
                '/uploads': { target: env.VITE_API_TARGET || 'http://127.0.0.1:8000', changeOrigin: true },
            },
        },
        build: {
            outDir: 'dist',
            sourcemap: mode !== 'production',
            rollupOptions: {
                output: {
                    // Pustaka pihak ketiga jarang berubah — dipisah agar cache browser
                    // pengguna tidak batal setiap kali kode aplikasi diperbarui.
                    manualChunks: {
                        vendor: ['vue', 'vue-router', 'pinia', 'axios'],
                        scanner: ['html5-qrcode', 'qrcode'],
                    },
                },
            },
        },
    };
});
