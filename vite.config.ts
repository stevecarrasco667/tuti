import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    // [Sprint 4 — Cold Start] Base ABSOLUTA obligatoria para SPAs con rutas profundas.
    // Con './' (relativo), /lobby/HCWD intenta cargar ./assets/index.css → /lobby/assets/index.css → 404.
    // Con '/' (absoluto), siempre carga /assets/index.css sin importar la profundidad de la ruta.
    base: '/',
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, './shared')
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