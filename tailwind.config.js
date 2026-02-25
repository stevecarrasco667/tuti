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
                    base: '#DCE9FF',
                    card: '#EAF2FF',
                    modal: '#E3EEFF',
                    input: '#F1F6FF',
                },
                action: {
                    primary: '#2ECC71',
                    blue: '#3B82F6',
                    cyan: '#38BDF8',
                    hover: '#27AE60',
                    error: '#EF4444',
                    warning: '#FACC15',
                },
                ink: {
                    main: '#0F172A',
                    soft: '#334155',
                    muted: '#64748B',
                    inverse: '#ffffff',
                }
            },
            boxShadow: {
                'game-btn': '0 4px 0 0 rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.1)',
                'game-panel': 'inset 0 2px 4px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.05)',
                'game-card': '0 2px 8px rgba(79, 140, 255, 0.15)',
            }
        },
    },
    plugins: [],
}
