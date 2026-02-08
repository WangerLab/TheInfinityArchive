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
        display: ['Cinzel', 'serif'],
        tactical: ['Orbitron', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
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
        steel: 'hsl(var(--steel))',
        rust: 'hsl(var(--rust))',
        // Faction colors
        imperium: 'hsl(var(--faction-imperium))',
        chaos: 'hsl(var(--faction-chaos))',
        xenos: 'hsl(var(--faction-xenos))',
      },
      boxShadow: {
        'glow-gold': '0 0 20px hsl(var(--gold) / 0.4)',
        'glow-green': '0 0 20px hsl(var(--terminal-green) / 0.4)',
        'glow-chaos': '0 0 20px hsl(var(--chaos-purple) / 0.4)',
        'glow-xenos': '0 0 20px hsl(var(--xenos-cyan) / 0.4)',
        'panel': '0 4px 20px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 200, 100, 0.03)',
        'inset-dark': 'inset 0 2px 6px rgba(0, 0, 0, 0.6)'
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
