/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                // [FE-1.4] Nunito para headings energéticos, Inter para cuerpo legible
                sans:    ['Inter', 'sans-serif'],
                heading: ['Nunito', 'sans-serif'],
                display: ['Bebas Neue', 'sans-serif'], // timers, letra del round
            },
            colors: {
                // Fondos (identidad morada oscura de marca — preservada)
                panel: {
                    base:   '#2E0249',
                    card:   '#3D0A5E',
                    raised: '#4A0F72',
                    input:  '#5A1488',
                },
                // [FE-1.1] Acentos Neo-Brutalistas (saturados, sólidos)
                game: {
                    yellow:       '#F5C800',
                    'yellow-dark':'#D4A900',
                    orange:       '#FF6B35',
                    red:          '#FF3B30',
                    green:        '#34C759',
                    blue:         '#2DD4BF',
                    white:        '#FFFFFF',
                    cream:        '#FFF8E7',
                    black:        '#0D0D0D',
                },
                // Texto
                ink: {
                    main:  '#F0E6FF',
                    soft:  '#C4B5FD',
                    muted: '#8B6FBE',
                },
                // Compatibilidad con clases legacy (no eliminar hasta migración completa)
                action: {
                    primary:          '#F5C800',
                    'primary-hover':  '#D4A900',
                    secondary:        '#4A0F72',
                    'secondary-hover':'#5A1488',
                    success:          '#34C759',
                    error:            '#FF3B30',
                    warning:          '#FF6B35',
                    info:             '#2DD4BF',
                },
                tuti: {
                    teal: '#2DD4BF',
                },
            },
            // [FE-1.2] Sombras Sólidas Neo-Brutalistas
            boxShadow: {
                'hard-sm':       '3px 3px 0px 0px #0D0D0D',
                'hard':          '5px 5px 0px 0px #0D0D0D',
                'hard-lg':       '7px 7px 0px 0px #0D0D0D',
                'hard-xl':       '10px 10px 0px 0px #0D0D0D',
                'hard-pressed':  '1px 1px 0px 0px #0D0D0D',
                'hard-white-sm': '3px 3px 0px 0px rgba(255,255,255,0.15)',
                'hard-white':    '5px 5px 0px 0px rgba(255,255,255,0.12)',
                'hard-red':      '5px 5px 0px 0px #CC2E25',
                'hard-green':    '5px 5px 0px 0px #28A045',
                'hard-yellow':   '5px 5px 0px 0px #A88C00',
                // Preservadas para layouts de fondo
                'game-panel':    'inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 32px rgba(0,0,0,0.5)',
                'game-card':     '0 4px 24px rgba(0,0,0,0.35)',
                'game-btn':      '0 4px 0 0 rgba(0,0,0,0.15)',
                'glow-red':      '0 0 20px rgba(255,59,48,0.6)',
                'glow-primary':  '0 0 20px rgba(245,200,0,0.4)',
                'glow-success':  '0 0 20px rgba(52,199,89,0.4)',
                'glow-panic':    '0 0 25px rgba(255,59,48,0.5)',
                'warm':          '0 10px 25px -5px rgba(0,0,0,0.4)',
            },
            // [FE-1.3] Bordes
            borderWidth: {
                '3': '3px',
            },
            transitionTimingFunction: {
                'press': 'cubic-bezier(0.36, 0.07, 0.19, 0.97)',
            },
            // [FE-1.5] Animaciones de Juego
            keyframes: {
                'timer-pulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%':      { transform: 'scale(1.08)' },
                },
                'float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%':      { transform: 'translateY(-6px)' },
                },
                'stamp-in': {
                    '0%':   { transform: 'scale(2) rotate(-15deg)', opacity: '0' },
                    '60%':  { transform: 'scale(0.95) rotate(-3deg)', opacity: '1' },
                    '100%': { transform: 'scale(1) rotate(-5deg)', opacity: '1' },
                },
                'slide-in-right': {
                    '0%':   { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                'zoom-in': {
                    '0%':   { transform: 'scale(0.5)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                'shake': {
                    '0%, 100%': { transform: 'translateX(0)' },
                    '20%':      { transform: 'translateX(-4px)' },
                    '40%':      { transform: 'translateX(4px)' },
                    '60%':      { transform: 'translateX(-3px)' },
                    '80%':      { transform: 'translateX(3px)' },
                },
            },
            animation: {
                'timer-pulse': 'timer-pulse 0.6s ease-in-out infinite',
                'float':       'float 3s ease-in-out infinite',
                'stamp-in':    'stamp-in 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards',
                'slide-right': 'slide-in-right 0.25s ease-out forwards',
                'zoom-in':     'zoom-in 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards',
                'shake':       'shake 0.4s ease-in-out',
            },
            zIndex: {
                'dropdown': 10,
                'sticky':   20,
                'modal':    50,
                'toast':    100,
                'overlay':  200,
                'loading':  300,
            }
        },
    },
    plugins: [],
}
