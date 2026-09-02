/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '12px',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -5px rgba(0,0,0,0.04)',
        'sidebar': '4px 0 24px rgba(0,0,0,0.04)',
      },
      colors: {
        salon: {
          bg: 'rgb(var(--salon-bg) / <alpha-value>)',
          surface: 'rgb(var(--salon-surface) / <alpha-value>)',
          primary: 'rgb(var(--salon-primary) / <alpha-value>)',
          'primary-hover': 'rgb(var(--salon-primary-hover) / <alpha-value>)',
          'text-main': 'rgb(var(--salon-text-main) / <alpha-value>)',
          'text-muted': 'rgb(var(--salon-text-muted) / <alpha-value>)',
          border: 'rgb(var(--salon-border) / <alpha-value>)',
        },
        background: 'rgb(var(--salon-bg) / <alpha-value>)',
        foreground: 'rgb(var(--salon-text-main) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--salon-surface) / <alpha-value>)',
          foreground: 'rgb(var(--salon-text-main) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--salon-surface) / <alpha-value>)',
          foreground: 'rgb(var(--salon-text-main) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--salon-primary) / <alpha-value>)',
          foreground: 'rgb(var(--salon-bg) / <alpha-value>)',
          container: 'rgb(var(--salon-primary) / <alpha-value>)',
          'fixed': 'rgb(var(--salon-primary) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--salon-primary-hover) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--salon-surface) / <alpha-value>)',
          foreground: 'rgb(var(--salon-text-main) / <alpha-value>)',
          container: 'rgb(var(--salon-surface) / <alpha-value>)',
          'fixed': 'rgb(var(--salon-surface) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--salon-surface) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--salon-surface) / <alpha-value>)',
          foreground: 'rgb(var(--salon-text-muted) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--salon-primary) / <alpha-value>)',
          foreground: 'rgb(var(--salon-bg) / <alpha-value>)',
        },
        tertiary: {
          DEFAULT: 'rgb(var(--salon-primary) / <alpha-value>)',
          foreground: 'rgb(var(--salon-bg) / <alpha-value>)',
          container: 'rgb(var(--salon-primary-hover) / <alpha-value>)',
          'fixed': 'rgb(var(--salon-primary) / <alpha-value>)',
          'fixed-dim': 'rgb(var(--salon-primary-hover) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(239 68 68 / <alpha-value>)',
          foreground: 'rgb(255 255 255 / <alpha-value>)',
          container: 'rgb(239 68 68 / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(239 68 68 / <alpha-value>)',
          foreground: 'rgb(255 255 255 / <alpha-value>)',
        },
        border: 'rgb(var(--salon-border) / <alpha-value>)',
        input: 'rgb(var(--salon-border) / <alpha-value>)',
        ring: 'rgb(var(--salon-primary) / <alpha-value>)',
        outline: {
          DEFAULT: 'rgb(var(--salon-text-muted) / <alpha-value>)',
          variant: 'rgb(var(--salon-border) / <alpha-value>)',
        },
        sidebar: {
          DEFAULT: 'rgb(var(--salon-surface) / <alpha-value>)',
          foreground: 'rgb(var(--salon-text-muted) / <alpha-value>)',
          primary: 'rgb(var(--salon-primary) / <alpha-value>)',
          'primary-foreground': 'rgb(var(--salon-bg) / <alpha-value>)',
          accent: 'rgb(var(--salon-surface) / <alpha-value>)',
          'accent-foreground': 'rgb(var(--salon-text-muted) / <alpha-value>)',
          border: 'rgb(var(--salon-border) / <alpha-value>)',
          ring: 'rgb(var(--salon-primary) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--salon-surface) / <alpha-value>)',
          alt: 'rgb(var(--salon-bg) / <alpha-value>)',
          bright: 'rgb(var(--salon-surface) / <alpha-value>)',
          dim: 'rgb(var(--salon-bg) / <alpha-value>)',
          tint: 'rgb(var(--salon-primary) / <alpha-value>)',
          variant: 'rgb(var(--salon-border) / <alpha-value>)',
          container: {
            DEFAULT: 'rgb(var(--salon-surface) / <alpha-value>)',
            low: 'rgb(var(--salon-surface) / <alpha-value>)',
            lowest: 'rgb(var(--salon-bg) / <alpha-value>)',
            high: 'rgb(var(--salon-border) / <alpha-value>)',
            highest: 'rgb(var(--salon-border) / <alpha-value>)',
          },
        },
        'on-surface': {
          DEFAULT: 'rgb(var(--salon-text-main) / <alpha-value>)',
          variant: 'rgb(var(--salon-text-muted) / <alpha-value>)',
        },
        'on-background': 'rgb(var(--salon-text-main) / <alpha-value>)',
        'on-primary': 'rgb(var(--salon-bg) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--salon-bg) / <alpha-value>)',
        'on-primary-fixed': 'rgb(var(--salon-bg) / <alpha-value>)',
        'on-primary-fixed-variant': 'rgb(var(--salon-bg) / <alpha-value>)',
        'on-secondary': 'rgb(var(--salon-text-main) / <alpha-value>)',
        'on-secondary-container': 'rgb(var(--salon-text-main) / <alpha-value>)',
        'on-secondary-fixed': 'rgb(var(--salon-text-main) / <alpha-value>)',
        'on-secondary-fixed-variant': 'rgb(var(--salon-text-main) / <alpha-value>)',
        'on-tertiary': 'rgb(var(--salon-bg) / <alpha-value>)',
        'on-tertiary-container': 'rgb(var(--salon-bg) / <alpha-value>)',
        'on-tertiary-fixed': 'rgb(var(--salon-bg) / <alpha-value>)',
        'on-tertiary-fixed-variant': 'rgb(var(--salon-bg) / <alpha-value>)',
        'on-error': 'rgb(255 255 255 / <alpha-value>)',
        'on-error-container': 'rgb(255 255 255 / <alpha-value>)',
        'inverse-primary': 'rgb(var(--salon-primary) / <alpha-value>)',
        'inverse-surface': 'rgb(var(--salon-text-main) / <alpha-value>)',
        'inverse-on-surface': 'rgb(var(--salon-bg) / <alpha-value>)',
        branding: {
          primary: 'rgb(var(--salon-primary) / <alpha-value>)',
          secondary: 'rgb(var(--salon-primary-hover) / <alpha-value>)',
          accent: 'rgb(var(--salon-primary) / <alpha-value>)',
          background: 'rgb(var(--salon-bg) / <alpha-value>)',
        },
        chart: {
          '1': 'rgb(var(--salon-primary) / <alpha-value>)',
          '2': 'rgb(16 185 129 / <alpha-value>)',
          '3': 'rgb(var(--salon-primary-hover) / <alpha-value>)',
          '4': 'rgb(99 102 241 / <alpha-value>)',
          '5': 'rgb(239 68 68 / <alpha-value>)',
        },
      },
      spacing: {
        'container-max': '1280px',
        'stack-sm': '0.5rem',
        'stack-md': '1rem',
        'stack-lg': '2rem',
        'gutter': '1.5rem',
        'margin-desktop': '2.5rem',
        'margin-mobile': '1rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'headline-xl': ['48px', { lineHeight: '56px', letterSpacing: '-0.025em', fontWeight: '800' }],
        'headline-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.025em', fontWeight: '700' }],
        'headline-lg-mobile': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'label-md': ['14px', { lineHeight: '16px', fontWeight: '600' }],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.2s ease-out',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
