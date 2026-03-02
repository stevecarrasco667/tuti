/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                tuti: {
                    base: '#4F8CFF',
                    soft: '#63B3FF',
                    alt: '#7BA7FF',
                    teal: '#6AD7E5',
                },
                panel: {
                    base: '#0f172a',
                    card: '#1e293b',
                    input: '#334155',
                },
                action: {
                    primary: '#d97706',
                    'primary-hover': '#b45309',
                    secondary: '#475569',
                    'secondary-hover': '#334155',
                    accent: '#f59e0b',
                    error: '#ef4444',
                    warning: '#FACC15',
                },
                ink: {
                    main: '#f1f5f9',
                    muted: '#94a3b8',
                }
            },
            boxShadow: {
                'game-btn': '0 4px 0 0 rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)',
                'game-panel': 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.05)',
                'game-card': '0 2px 8px rgba(79, 140, 255, 0.15)',
                'warm': '0 10px 25px -5px rgba(44, 42, 41, 0.08), 0 8px 10px -6px rgba(44, 42, 41, 0.04)',
            }
        },
    },
    plugins: [],
}
