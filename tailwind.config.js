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
                // Fondos (Violeta nocturno profundo)
                panel: {
                    base: '#2E0249', 
                    card: '#49107A', 
                    input: '#60199E',
                    raised: '#57138A',
                },
                // Acentos 
                action: {
                    primary: '#fbbf24',
                    'primary-hover': '#f59e0b', 
                    secondary: '#57138A', 
                    'secondary-hover': '#6C1AAB', 
                    success: '#10b981',
                    error: '#f43f5e',
                    warning: '#fbbf24',
                    info: '#38bdf8',
                },
                tuti: {
                    teal: '#2dd4bf',
                },
                ink: {
                    main: '#ede9fe',
                    soft: '#c4b5fd',
                    muted: '#ddd6fe',
                },
                game: {
                    yellow: '#FFD166',
                    'yellow-dark': '#E0B54D',
                    red: '#EF476F',
                    'red-dark': '#C73656', 
                    green: '#06D6A0',
                    'green-dark': '#04A87D',
                    blue: '#118AB2',
                    cream: '#FDFBF7',
                    black: '#0D0D0D'
                }
            },
            boxShadow: {
                'game-btn': '0 4px 0 0 rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)',
                'game-panel': 'inset 0 2px 4px rgba(255,255,255,0.05), 0 4px 12px rgba(0,0,0,0.4)',
                'game-card': '0 4px 20px rgba(0,0,0,0.3)',
                'glow-primary': '0 0 30px -5px rgba(255,92,26,0.5)',
                'glow-success': '0 0 20px -5px rgba(200,241,53,0.4)',
                'glow-panic': '0 0 25px -5px rgba(255,61,107,0.5), inset 0 0 150px rgba(255,61,107,0.15)',
                'warm': '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                '3d-yellow': '0 6px 0 0 #D9A01C',
                '3d-red': '0 6px 0 0 #B92B4F',
                '3d-green': '0 6px 0 0 #049A73',
                '3d-blue': '0 6px 0 0 #0B5C7A',
                '3d-white': '0 6px 0 0 #D4D4D4',
                '3d-panel': '0 6px 0 0 #200133',
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
