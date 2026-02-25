/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'sans-serif'],
            },
            colors: {
                brand: {
                    purple: '#6D28D9',
                    lime: '#A3E635',
                    pink: '#F472B6',
                    cyan: '#22D3EE',
                    deep: '#1E1B4B',
                },
            },
            animation: {
                'bounce-slow': 'bounce 2s infinite',
                'mesh': 'mesh 10s ease infinite',
            },
            keyframes: {
                mesh: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
            },
        },
    },
    plugins: [],
}
