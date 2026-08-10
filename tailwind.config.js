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
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
   				DEFAULT: 'hsl(var(--sidebar-background))',
   				foreground: 'hsl(var(--sidebar-foreground))',
   				primary: 'hsl(var(--sidebar-primary))',
   				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
   				accent: 'hsl(var(--sidebar-accent))',
   				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
   				border: 'hsl(var(--sidebar-border))',
   				ring: 'hsl(var(--sidebar-ring))'
   			},
    			branding: {
    				primary: 'rgb(var(--branding-primary) / <alpha-value>)',
    				secondary: 'rgb(var(--branding-secondary) / <alpha-value>)',
    				accent: 'rgb(var(--branding-accent) / <alpha-value>)',
    				background: 'rgb(var(--branding-background) / <alpha-value>)',
    			},
  			surface: {
  				'50': '#F8FAFC',
  				'100': '#F1F5F9',
  				'200': '#E2E8F0',
  				'300': '#CBD5E1',
  				'400': '#94A3B8',
  				'500': '#64748B',
  				'600': '#475569',
  				'700': '#334155',
  				'800': '#1E293B',
  				'900': '#0F172A',
  				'950': '#020617',
  			}
  		},
  		fontFamily: {
  			sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  			display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  		},
  		fontSize: {
  			'2xs': ['0.625rem', { lineHeight: '0.875rem' }],
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
