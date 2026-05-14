/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                heading: ['Nunito', 'sans-serif'],
                display: ['Bebas Neue', 'sans-serif'],
            },
            colors: {
                // Fondos (Midnight Indigo)
                panel: {
                    base: '#1e1b4b', 
                    card: '#312e81', 
                    input: '#3730a3',
                    raised: '#2e2978',
                },
                // Acentos 
                action: {
                    primary: '#fbbf24',
                    'primary-hover': '#f59e0b', 
                    secondary: '#6366f1',
                    'secondary-hover': '#818cf8',
                    success: '#34d399',
                    error: '#fb7185',
                    warning: '#fbbf24',
                    info: '#7dd3fc',
                },
                tuti: {
                    teal: '#2dd4bf',
                },
                ink: {
                    main: '#e0e7ff',
                    soft: '#a5b4fc',
                    muted: '#818cf8',
                },
                game: {
                    yellow: '#fde68a',
                    'yellow-dark': '#fbbf24',
                    red: '#fb7185',
                    'red-dark': '#f43f5e', 
                    green: '#34d399',
                    'green-dark': '#10b981',
                    blue: '#60a5fa',
                    cream: '#f0f4ff',
                    black: '#0f0e2d'
                }
            },
            boxShadow: {
                'game-btn': '0 4px 0 0 rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)',
                'game-panel': 'inset 0 2px 4px rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.4)',
                'game-card': '0 4px 20px rgba(0,0,0,0.3)',
                'glow-primary': '0 0 30px -5px rgba(251,191,36,0.5)',
                'glow-success': '0 0 20px -5px rgba(52,211,153,0.4)',
                'glow-panic': '0 0 25px -5px rgba(251,113,133,0.5), inset 0 0 150px rgba(251,113,133,0.15)',
                'warm': '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                '3d-yellow': '0 6px 0 0 #d97706',
                '3d-red': '0 6px 0 0 #be123c',
                '3d-green': '0 6px 0 0 #047857',
                '3d-blue': '0 6px 0 0 #0284c7',
                '3d-white': '0 6px 0 0 #9ca3af',
                '3d-panel': '0 6px 0 0 #0c0b20',
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
