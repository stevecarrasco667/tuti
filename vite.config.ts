import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

import { VitePWA } from 'vite-plugin-pwa'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            registerType: 'prompt',
            injectRegister: 'auto',
            workbox: {
                cleanupOutdatedCaches: true,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}']
            },
            manifest: {
                name: 'TutiGame',
                short_name: 'TutiGame',
                description: 'El clásico Tutifruti en línea con tus amigos',
                theme_color: '#7c3aed',
                background_color: '#0f0a1e',
                display: 'standalone',
                orientation: 'portrait-primary',
                icons: [
                    {
                        src: '/icons/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/icons/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    // [Sprint 4 — Cold Start] Base ABSOLUTA obligatoria para SPAs con rutas profundas.
    // Con './' (relativo), /lobby/HCWD intenta cargar ./assets/index.css → /lobby/assets/index.css → 404.
    // Con '/' (absoluto), siempre carga /assets/index.css sin importar la profundidad de la ruta.
    base: '/',
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, './shared')
        }
    },
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // 1. Chunk de Core Framework (Cacheo de muy largo plazo)
                    if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router')) {
                        return 'vendor-core';
                    }
                    
                    // 2. Chunk de Red y Estado (PartyKit, JSON Patch)
                    if (id.includes('node_modules/partysocket') || id.includes('node_modules/fast-json-patch')) {
                        return 'vendor-network';
                    }

                    // 3. Chunk de Motores de Juego Compartidos
                    if (id.includes('/shared/engines/') || id.includes('/shared/systems/')) {
                        return 'game-engines';
                    }

                    // 4. Chunk genérico para otras librerías misceláneas (canvas-confetti, etc.)
                    if (id.includes('node_modules')) {
                        return 'vendor-utils';
                    }
                }
            }
        }
    },

    server: {
        proxy: {
            '/party': {
                target: 'http://127.0.0.1:1999',
                changeOrigin: true,
                ws: true
            }
        }
    }
})