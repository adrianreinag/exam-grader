const { fontFamily } = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/ui/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/infrastructure/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-inter)',
                    ...fontFamily.sans
                ]
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			surface: '#161B22',
  			border: 'hsl(var(--border))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				hover: '#79C0FF',
  				light: 'rgba(88, 166, 255, 0.1)',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			success: {
  				DEFAULT: '#39D39F',
  				light: 'rgba(57, 211, 159, 0.1)'
  			},
  			warning: {
  				DEFAULT: '#D29922',
  				light: 'rgba(210, 153, 34, 0.1)'
  			},
  			danger: {
  				DEFAULT: '#F85149',
  				hover: '#DA3633',
  				light: 'rgba(248, 81, 73, 0.1)'
  			},
  			text: {
  				primary: '#C9D1D9',
  				secondary: '#8B949E',
  				tertiary: '#484F58',
  				inverse: '#0D1117'
  			},
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
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
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.5s ease-out forwards',
  			'subtle-pulse': 'subtlePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: 0,
  					transform: 'translateY(10px)'
  				},
  				'100%': {
  					opacity: 1,
  					transform: 'translateY(0)'
  				}
  			},
  			subtlePulse: {
  				'0%, 100%': {
  					opacity: 1
  				},
  				'50%': {
  					opacity: 0.7
  				}
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			sm: '0 0 #0000',
  			DEFAULT: '0 0 #0000',
  			md: '0 0 #0000',
  			lg: '0 0 #0000',
  			xl: '0 0 #0000',
  			'2xl': '0 0 #0000',
  			inner: '0 0 #0000',
  			none: '0 0 #0000'
  		},
  		dropShadow: {
  			sm: '0 0 #0000',
  			DEFAULT: '0 0 #0000',
  			md: '0 0 #0000',
  			lg: '0 0 #0000',
  			xl: '0 0 #0000',
  			'2xl': '0 0 #0000'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};