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
                    base: '#F4F1EA',
                    card: '#E8E3D8',
                    modal: '#E8E3D8',
                    input: '#DFD9CD',
                },
                action: {
                    primary: '#D46A54',
                    'primary-hover': '#BF5A46',
                    secondary: '#7A937D',
                    'secondary-hover': '#687F6B',
                    accent: '#D4A35B',
                    error: '#C44D4D',
                    blue: '#3B82F6',
                    cyan: '#38BDF8',
                    hover: '#27AE60',
                    warning: '#FACC15',
                },
                ink: {
                    main: '#2C2A29',
                    soft: '#7D7873',
                    muted: '#7D7873',
                    inverse: '#ffffff',
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
