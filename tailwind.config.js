/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                // Tipografía principal para la UI (limpia y legible)
                sans: ['Outfit', 'sans-serif'],
                ui: ['Outfit', 'sans-serif'],
                // Tipografía para Títulos Gigantes y Timer
                display: ['Bebas Neue', 'sans-serif'],
            },
            colors: {
                // Fondos (Violeta nocturno profundo)
                panel: {
                    base: '#2E0249', 
                    card: '#49107A', 
                    input: '#60199E',
                    raised: '#57138A', // Para compatibilidad con botones fantasma/ghost
                },
                // Acentos 
                action: {
                    primary: '#fbbf24', // Amber-400
                    'primary-hover': '#f59e0b', 
                    secondary: '#57138A', 
                    'secondary-hover': '#6C1AAB', 
                    success: '#10b981', // Emerald-500
                    error: '#f43f5e',   // Rose-500
                    warning: '#fbbf24', // Amber-400
                    info: '#38bdf8',    // Light Blue
                },
                tuti: {
                    teal: '#2dd4bf', // Old tuti-teal equivalent
                },
                ink: {
                    main: '#ede9fe', // Violet-100
                    soft: '#c4b5fd', // Violet-300
                    muted: '#ddd6fe', // Violet-200
                }
            },
            boxShadow: {
                'game-btn': '0 4px 0 0 rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)',
                'game-panel': 'inset 0 2px 4px rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.4)',
                'game-card': '0 4px 20px rgba(0,0,0,0.3)',
                // Hardware-accelerated Glows (Arcade Callejero)
                'glow-primary': '0 0 30px -5px rgba(255,92,26,0.5)',
                'glow-success': '0 0 20px -5px rgba(200,241,53,0.4)',
                'glow-panic': '0 0 25px -5px rgba(255,61,107,0.5), inset 0 0 150px rgba(255,61,107,0.15)',
                'warm': '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
            },
            zIndex: {
                'dropdown': 10,
                'sticky': 20,
                'modal': 50,
                'toast': 100,
                'overlay': 200,
                'loading': 300,
            }
        },
    },
    plugins: [],
}
