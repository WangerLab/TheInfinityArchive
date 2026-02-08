/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Cinzel', 'Orbitron', 'serif'],
        tactical: ['Orbitron', 'JetBrains Mono', 'sans-serif'],
        data: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
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
        // Custom Grimdark colors
        gold: {
          DEFAULT: 'hsl(var(--gold))',
          dim: 'hsl(var(--gold-dim))',
          bright: 'hsl(var(--gold-bright))'
        },
        terminal: {
          DEFAULT: 'hsl(var(--terminal-green))',
          dim: 'hsl(var(--terminal-green-dim))',
          bright: 'hsl(var(--terminal-green-bright))'
        },
        blood: 'hsl(var(--blood-red))',
        void: 'hsl(var(--void-black))',
        slate: {
          dark: 'hsl(var(--slate-dark))'
        },
        steel: 'hsl(var(--steel))',
        rust: 'hsl(var(--rust))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      boxShadow: {
        'glow-gold': '0 0 20px hsl(var(--gold) / 0.3)',
        'glow-green': '0 0 20px hsl(var(--terminal-green) / 0.3)',
        'panel': '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 200, 100, 0.05)',
        'inset-dark': 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
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
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px hsl(var(--gold) / 0.3)' },
          '50%': { boxShadow: '0 0 20px hsl(var(--gold) / 0.6), 0 0 40px hsl(var(--gold) / 0.2)' }
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.8' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.9' },
          '97%': { opacity: '1' }
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '0.1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'flicker': 'flicker 4s ease-in-out infinite',
        'scan': 'scan 8s linear infinite'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
