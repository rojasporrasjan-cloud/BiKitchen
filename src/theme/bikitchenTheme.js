/**
 * BiKitchen Theme - Línea Gráfica Oficial
 * 
 * Paleta de colores, tipografía y estilos según el documento oficial.
 * @author BiKitchen Design Team
 * @date 2024
 */

export const colors = {
  // Colores Primarios
  primary: {
    DEFAULT: '#FF671D',
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
  },
  
  // Colores Secundarios (Marrón cálido)
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
  },
  
  // Neutros
  neutral: {
    white: '#FDFBF9',
    light: '#F5F3F1',
    gray: '#E8E4E0',
    medium: '#9A9590',
    dark: '#2A2A2A',
    black: '#1F1E1E',
  },
  
  // Modo Oscuro
  dark: {
    bg: '#1F1E1E',
    surface: '#2A2A2A',
    elevated: '#3B3A39',
    border: '#4A4847',
    text: '#F5F3F1',
    muted: '#9A9590',
  },
};

export const typography = {
  fontFamily: {
    primary: ['Montserrat', 'sans-serif'],
    display: ['Mermaid Bold', 'Montserrat', 'sans-serif'],
    accent: ['FSPDEMO LC', 'Montserrat', 'sans-serif'],
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};

export const gradients = {
  primary: 'linear-gradient(135deg, #FF671D 0%, #B18978 100%)',
  primaryReverse: 'linear-gradient(90deg, #B18978 0%, #FF671D 100%)',
  warm: 'linear-gradient(180deg, #FDFBF9 0%, #F5F3F1 100%)',
  dark: 'linear-gradient(180deg, #1F1E1E 0%, #2A2A2A 100%)',
  button: 'linear-gradient(135deg, #FF671D 0%, #E85A15 100%)',
  buttonHover: 'linear-gradient(135deg, #E85A15 0%, #B18978 100%)',
};

export const shadows = {
  sm: '0 1px 2px rgba(42, 42, 42, 0.05)',
  DEFAULT: '0 2px 8px rgba(42, 42, 42, 0.08)',
  md: '0 4px 16px rgba(42, 42, 42, 0.1)',
  lg: '0 8px 24px rgba(42, 42, 42, 0.12)',
  xl: '0 16px 48px rgba(42, 42, 42, 0.16)',
  inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
  glow: '0 0 20px rgba(255, 103, 29, 0.3)',
};

export const borderRadius = {
  sm: '8px',
  DEFAULT: '12px',
  md: '16px',
  lg: '20px',
  xl: '24px',
  full: '9999px',
};

// CSS Variables para modo claro/oscuro
export const cssVariables = {
  light: {
    '--color-bg': colors.neutral.white,
    '--color-bg-secondary': colors.neutral.light,
    '--color-surface': '#FFFFFF',
    '--color-text': colors.neutral.dark,
    '--color-text-muted': colors.neutral.medium,
    '--color-primary': colors.primary.DEFAULT,
    '--color-secondary': colors.secondary.DEFAULT,
    '--color-border': colors.neutral.gray,
    '--color-accent': colors.primary.DEFAULT,
  },
  dark: {
    '--color-bg': colors.dark.bg,
    '--color-bg-secondary': colors.dark.surface,
    '--color-surface': colors.dark.elevated,
    '--color-text': colors.dark.text,
    '--color-text-muted': colors.dark.muted,
    '--color-primary': colors.primary.DEFAULT,
    '--color-secondary': colors.secondary.DEFAULT,
    '--color-border': colors.dark.border,
    '--color-accent': colors.primary.DEFAULT,
  },
};

export default {
  colors,
  typography,
  gradients,
  shadows,
  borderRadius,
  cssVariables,
};
