/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                // BiKitchen Brand Colors
                bikitchen: {
                    orange: '#FF671D',
                    'orange-light': '#FF8A4D',
                    'orange-dark': '#E85A15',
                    brown: '#B18978',
                    'brown-light': '#C4A08E',
                    'brown-dark': '#9A7262',
                    cream: '#FDFBF9',
                    'cream-dark': '#F5F3F1',
                    charcoal: '#2A2A2A',
                    'charcoal-light': '#3B3A39',
                    'charcoal-dark': '#1F1E1E',
                },
                // Legacy compatibility colors
                bg: '#FDFBF9',
                border: '#E8E4E0',
                input: '#E8E4E0',
                ring: '#FF671D',
                background: '#FDFBF9',
                foreground: '#2A2A2A',
                surface: '#FFFFFF',
                // Primary - Naranja BiKitchen
                primary: {
                    DEFAULT: '#FF671D',
                    dark: '#E85A15',
                    50: '#FFF4ED',
                    100: '#FFE4D6',
                    200: '#FFC9AD',
                    300: '#FFA77A',
                    400: '#FF8A4D',
                    500: '#FF671D',
                    600: '#E85A15',
                    700: '#C44A10',
                    800: '#9C3B0D',
                    900: '#7A2F0A',
                    foreground: '#ffffff',
                },
                // Secondary - Marrón BiKitchen
                secondary: {
                    DEFAULT: '#B18978',
                    50: '#FAF6F4',
                    100: '#F2EAE6',
                    200: '#E5D5CD',
                    300: '#D4BAA9',
                    400: '#C4A08E',
                    500: '#B18978',
                    600: '#9A7262',
                    700: '#7D5C4F',
                    800: '#5F463C',
                    900: '#42312A',
                    foreground: '#ffffff',
                },
                // Accent - Naranja
                accent: {
                    DEFAULT: '#FF671D',
                    soft: 'rgba(255, 103, 29, 0.1)',
                    foreground: '#ffffff',
                },
                // Muted
                muted: {
                    DEFAULT: '#9A9590',
                    foreground: '#6B6560',
                },
                // Card
                card: {
                    DEFAULT: '#FFFFFF',
                    hover: '#F5F3F1',
                },
                // Glow effects
                glow: {
                    primary: 'rgba(255, 103, 29, 0.2)',
                    accent: 'rgba(177, 137, 120, 0.2)',
                },
                // Gray scale for compatibility
                gray: {
                    50: '#FAFAFA',
                    100: '#F5F3F1',
                    200: '#E8E4E0',
                    300: '#D4D0CC',
                    400: '#9A9590',
                    500: '#6B6560',
                    600: '#4A4847',
                    700: '#3B3A39',
                    800: '#2A2A2A',
                    900: '#1F1E1E',
                },
            },
            fontFamily: {
                sans: ["Montserrat", "sans-serif"],
                display: ["Montserrat", "sans-serif"],
                serif: ["Georgia", "serif"],
            },
            borderRadius: {
                'xl': '16px',
                '2xl': '20px',
                '3xl': '24px',
            },
            boxShadow: {
                'bikitchen': '0 4px 16px rgba(42, 42, 42, 0.1)',
                'bikitchen-lg': '0 8px 24px rgba(42, 42, 42, 0.12)',
                'bikitchen-glow': '0 0 20px rgba(255, 103, 29, 0.3)',
                'inner-sm': 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
            },
            backgroundImage: {
                'gradient-bikitchen': 'linear-gradient(135deg, #FF671D 0%, #B18978 100%)',
                'gradient-bikitchen-reverse': 'linear-gradient(90deg, #B18978 0%, #FF671D 100%)',
                'gradient-warm': 'linear-gradient(180deg, #FDFBF9 0%, #F5F3F1 100%)',
                'gradient-dark': 'linear-gradient(180deg, #1F1E1E 0%, #2A2A2A 100%)',
                'gradient-button': 'linear-gradient(135deg, #FF671D 0%, #E85A15 100%)',
                'gradient-button-hover': 'linear-gradient(135deg, #E85A15 0%, #B18978 100%)',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "slide-in-from-bottom": {
                    from: { transform: "translateY(20px)", opacity: "0" },
                    to: { transform: "translateY(0)", opacity: "1" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.5s ease-out",
                "slide-in": "slide-in-from-bottom 0.7s ease-out",
            },
        },
    },
    plugins: [],
}
