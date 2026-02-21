/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Gold primary color (Luxury Theme)
                primary: '#D4AF37',
                gold: {
                    DEFAULT: '#D4AF37',
                    light: '#E6C86E',
                    dark: '#AA8C2C',
                },
                // Dark gradient colors
                dark: {
                    900: '#060606',
                    800: '#0b0b10',
                    700: '#101018',
                },
            },
            backgroundImage: {
                'gradient-dark': 'linear-gradient(to bottom, #060606, #0b0b10, #101018)',
            },
            backdropBlur: {
                'xl': '20px',
                '2xl': '40px',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-in-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'slide-in': 'slideIn 0.3s ease-out',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideIn: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)' },
                    '100%': { boxShadow: '0 0 40px rgba(212, 175, 55, 0.6)' },
                },
            },
        },
    },
    plugins: [],
}
