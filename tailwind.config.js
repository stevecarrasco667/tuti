/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                // Inyectamos Nunito como fuente principal geométrica y playful
                sans: ['Nunito', 'sans-serif'],
            },
            colors: {
                tuti: {
                    base: '#4F8CFF',
                    soft: '#63B3FF',
                    alt: '#7BA7FF',
                    teal: '#6AD7E5',
                },
                panel: {
                    base: '#2E0249', // Violeta nocturno profundo
                    card: '#49107A', // Violeta sólido rico
                    input: '#60199E', // Violeta vibrante y maleable
                },
                action: {
                    primary: '#fbbf24', // Amber-400 ultra vibrante
                    'primary-hover': '#f59e0b',
                    secondary: '#57138A', // Cápsulas secundarias translúcidas
                    'secondary-hover': '#6C1AAB',
                    accent: '#fbbf24',
                    error: '#f43f5e', // Rose-500 palpitante
                    warning: '#fbbf24',
                },
                ink: {
                    main: '#ede9fe', // Violet-100 anti fatiga
                    muted: '#ddd6fe', // Violet-200
                }
            },
            boxShadow: {
                'game-btn': '0 4px 0 0 rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)',
                'game-panel': 'inset 0 2px 4px rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.2)',
                'game-card': '0 4px 20px rgba(0,0,0,0.15)',
                // SPRINT V1 GLOWS: Elimina sombras negras por auras de color
                'glow-primary': '0 4px 15px rgba(251,191,36,0.5)',
                'glow-panic': 'inset 0 0 150px rgba(244,63,94,0.4)',
                'warm': '0 10px 25px -5px rgba(44, 42, 41, 0.08), 0 8px 10px -6px rgba(44, 42, 41, 0.04)',
            }
        },
    },
    plugins: [],
}
