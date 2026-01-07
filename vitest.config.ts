/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Utilizamos una variable intermedia para evitar conflictos de tipos entre Vite y Vitest
const config = defineConfig({
    test: {
        globals: true,
        environment: 'node',
    },
    resolve: {
        alias: {
            '@shared': path.resolve(__dirname, './shared')
        }
    }
})

export default config
