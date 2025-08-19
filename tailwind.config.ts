import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
				changed: {
					DEFAULT: 'hsl(var(--changed))',
					foreground: 'hsl(var(--changed-foreground))'
				},
				'species-beef': 'hsl(var(--species-beef))',
				'species-beef-bg': 'hsl(var(--species-beef-bg))',
				'species-beef-foreground': 'hsl(var(--species-beef-foreground))',
				'species-lamb': 'hsl(var(--species-lamb))',
				'species-lamb-bg': 'hsl(var(--species-lamb-bg))',
				'species-lamb-foreground': 'hsl(var(--species-lamb-foreground))',
				'species-mutton': 'hsl(var(--species-mutton))',
				'species-mutton-bg': 'hsl(var(--species-mutton-bg))',
				'species-mutton-foreground': 'hsl(var(--species-mutton-foreground))',
				'species-goat': 'hsl(var(--species-goat))',
				'species-goat-bg': 'hsl(var(--species-goat-bg))',
				'species-goat-foreground': 'hsl(var(--species-goat-foreground))',
				'kpi-title': 'hsl(var(--kpi-title))',
				'kpi-value': 'hsl(var(--kpi-value))',
				'primary-hover': 'hsl(var(--primary-hover))',
				'primary-focus-ring': 'hsl(var(--primary-focus-ring))',
				'table-header-bg': 'hsl(var(--table-header-bg))',
				'table-header-text': 'hsl(var(--table-header-text))',
				'table-zebra': 'hsl(var(--table-zebra))',
				'table-hover': 'hsl(var(--table-hover))',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
