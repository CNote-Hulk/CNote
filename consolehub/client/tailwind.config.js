/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                void:    '#0d0e14',
                deep:    '#13141c',
                surface: '#1a1c27',
                raised:  '#22253a',
                accent:  '#5b73ff',
                ps:      '#0070D1',
                xbox:    '#107C10',
                nint:    '#E60012',
                pcg:     '#9B59B6',
            },
            fontFamily: {
                heading: ['"Exo 2"', 'sans-serif'],
                mono:    ['"JetBrains Mono"', 'monospace'],
            },
            animation: {
                fadeSlide: 'fadeSlide .3s ease-out',
                slideRight: 'slideRight .25s ease-out',
                scaleIn: 'scaleIn .2s ease-out',
            },
            keyframes: {
                fadeSlide: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
                slideRight: { '0%': { opacity: 0, transform: 'translateX(20px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
                scaleIn: { '0%': { opacity: 0, transform: 'scale(.95)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
            },
        },
    },
    plugins: [],
};
