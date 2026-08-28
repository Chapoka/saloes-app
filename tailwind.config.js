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
  			'2xl': '1rem',
  			'3xl': '1.5rem',
  		},
  		boxShadow: {
  			'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  			'card-hover': '0 10px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -5px rgba(0,0,0,0.04)',
  			'sidebar': '4px 0 24px rgba(0,0,0,0.04)',
  			'glow': '0 0 20px rgba(var(--branding-primary) / 0.15)',
  			'glow-lg': '0 0 40px rgba(var(--branding-primary) / 0.2)',
  		},
  		colors: {
  			background: 'rgb(11 19 38 / <alpha-value>)',
  			foreground: 'rgb(218 226 253 / <alpha-value>)',
  			card: {
  				DEFAULT: 'rgb(30 41 59 / <alpha-value>)',
  				foreground: 'rgb(218 226 253 / <alpha-value>)',
  			},
  			popover: {
  				DEFAULT: 'rgb(30 41 59 / <alpha-value>)',
  				foreground: 'rgb(218 226 253 / <alpha-value>)',
  			},
  			primary: {
  				DEFAULT: 'rgb(192 193 255 / <alpha-value>)',
  				foreground: 'rgb(16 0 169 / <alpha-value>)',
  				container: 'rgb(128 131 255 / <alpha-value>)',
  				'fixed': 'rgb(225 224 255 / <alpha-value>)',
  				'fixed-dim': 'rgb(192 193 255 / <alpha-value>)',
  			},
  			secondary: {
  				DEFAULT: 'rgb(208 188 255 / <alpha-value>)',
  				foreground: 'rgb(60 0 145 / <alpha-value>)',
  				container: 'rgb(87 27 193 / <alpha-value>)',
  				'fixed': 'rgb(233 221 255 / <alpha-value>)',
  				'fixed-dim': 'rgb(208 188 255 / <alpha-value>)',
  			},
  			muted: {
  				DEFAULT: 'rgb(30 41 59 / <alpha-value>)',
  				foreground: 'rgb(199 196 215 / <alpha-value>)',
  			},
  			accent: {
  				DEFAULT: 'rgb(255 185 95 / <alpha-value>)',
  				foreground: 'rgb(71 42 0 / <alpha-value>)',
  			},
  			tertiary: {
  				DEFAULT: 'rgb(255 185 95 / <alpha-value>)',
  				foreground: 'rgb(71 42 0 / <alpha-value>)',
  				container: 'rgb(202 129 0 / <alpha-value>)',
  				'fixed': 'rgb(255 221 184 / <alpha-value>)',
  				'fixed-dim': 'rgb(255 185 95 / <alpha-value>)',
  			},
  			error: {
  				DEFAULT: 'rgb(255 180 171 / <alpha-value>)',
  				foreground: 'rgb(105 0 5 / <alpha-value>)',
  				container: 'rgb(147 0 10 / <alpha-value>)',
  			},
  			destructive: {
  				DEFAULT: 'rgb(239 68 68 / <alpha-value>)',
  				foreground: 'rgb(255 255 255 / <alpha-value>)',
  			},
  			border: 'rgb(70 69 84 / <alpha-value>)',
  			input: 'rgb(45 52 73 / <alpha-value>)',
  			ring: 'rgb(192 193 255 / <alpha-value>)',
  			outline: {
  				DEFAULT: 'rgb(144 143 160 / <alpha-value>)',
  				variant: 'rgb(70 69 84 / <alpha-value>)',
  			},
  			chart: {
  				'1': 'rgb(192 193 255 / <alpha-value>)',
  				'2': 'rgb(16 185 129 / <alpha-value>)',
  				'3': 'rgb(255 185 95 / <alpha-value>)',
  				'4': 'rgb(87 27 193 / <alpha-value>)',
  				'5': 'rgb(255 180 171 / <alpha-value>)',
  			},
  			sidebar: {
  				DEFAULT: 'rgb(11 19 38 / <alpha-value>)',
  				foreground: 'rgb(199 196 215 / <alpha-value>)',
  				primary: 'rgb(192 193 255 / <alpha-value>)',
  				'primary-foreground': 'rgb(16 0 169 / <alpha-value>)',
  				accent: 'rgb(30 41 59 / <alpha-value>)',
  				'accent-foreground': 'rgb(199 196 215 / <alpha-value>)',
  				border: 'rgb(30 41 59 / <alpha-value>)',
  				ring: 'rgb(192 193 255 / <alpha-value>)',
  			},
  			branding: {
  				primary: 'rgb(var(--branding-primary) / <alpha-value>)',
  				secondary: 'rgb(var(--branding-secondary) / <alpha-value>)',
  				accent: 'rgb(var(--branding-accent) / <alpha-value>)',
  				background: 'rgb(var(--branding-background) / <alpha-value>)',
  			},
  			surface: {
  				DEFAULT: 'rgb(30 41 59 / <alpha-value>)',
  				alt: 'rgb(30 27 75 / <alpha-value>)',
  				bright: 'rgb(49 57 77 / <alpha-value>)',
  				dim: 'rgb(11 19 38 / <alpha-value>)',
  				tint: 'rgb(192 193 255 / <alpha-value>)',
  				variant: 'rgb(45 52 73 / <alpha-value>)',
  				container: {
  					DEFAULT: 'rgb(23 31 51 / <alpha-value>)',
  					low: 'rgb(19 27 46 / <alpha-value>)',
  					lowest: 'rgb(6 14 32 / <alpha-value>)',
  					high: 'rgb(34 42 61 / <alpha-value>)',
  					highest: 'rgb(45 52 73 / <alpha-value>)',
  				},
  			},
  			'on-surface': {
  				DEFAULT: 'rgb(218 226 253 / <alpha-value>)',
  				variant: 'rgb(199 196 215 / <alpha-value>)',
  			},
  			'on-background': 'rgb(218 226 253 / <alpha-value>)',
  			'on-primary': 'rgb(16 0 169 / <alpha-value>)',
  			'on-primary-container': 'rgb(13 0 150 / <alpha-value>)',
  			'on-primary-fixed': 'rgb(7 0 108 / <alpha-value>)',
  			'on-primary-fixed-variant': 'rgb(47 46 190 / <alpha-value>)',
  			'on-secondary': 'rgb(60 0 145 / <alpha-value>)',
  			'on-secondary-container': 'rgb(196 171 255 / <alpha-value>)',
  			'on-secondary-fixed': 'rgb(35 0 92 / <alpha-value>)',
  			'on-secondary-fixed-variant': 'rgb(85 22 190 / <alpha-value>)',
  			'on-tertiary': 'rgb(71 42 0 / <alpha-value>)',
  			'on-tertiary-container': 'rgb(62 36 0 / <alpha-value>)',
  			'on-tertiary-fixed': 'rgb(42 23 0 / <alpha-value>)',
  			'on-tertiary-fixed-variant': 'rgb(101 62 0 / <alpha-value>)',
  			'on-error': 'rgb(105 0 5 / <alpha-value>)',
  			'on-error-container': 'rgb(255 218 214 / <alpha-value>)',
  			'inverse-primary': 'rgb(73 75 214 / <alpha-value>)',
  			'inverse-surface': 'rgb(218 226 253 / <alpha-value>)',
  			'inverse-on-surface': 'rgb(40 48 68 / <alpha-value>)',
  			'accent-yellow': 'rgb(245 158 11 / <alpha-value>)',
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
  			'body-md': ['Inter'],
  			'body-lg': ['Inter'],
  			'body-sm': ['Inter'],
  			'headline-xl': ['Inter'],
  			'headline-lg': ['Inter'],
  			'headline-lg-mobile': ['Inter'],
  			'headline-md': ['Inter'],
  			'label-md': ['Inter'],
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
