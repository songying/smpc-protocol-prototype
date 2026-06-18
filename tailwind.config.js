/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Fintech / data-platform palette (dark-first) ──────────────────
        // Deep navy/slate surfaces with a teal + electric-blue accent system,
        // reading like a modern trading / analytics terminal.
        // Theme-aware: backed by CSS variables (see globals.css) so these
        // tokens flip between dark (default) and light (.light on <html>).
        surface: {
          base: 'rgb(var(--surface-base) / <alpha-value>)',     // app background
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',       // panels
          raised: 'rgb(var(--surface-raised) / <alpha-value>)', // cards
          inset: 'rgb(var(--surface-inset) / <alpha-value>)',   // wells / inputs
        },
        line: {
          DEFAULT: 'rgb(var(--line) / <alpha-value>)', // hairline borders
          strong: 'rgb(var(--line-strong) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)', // primary text
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',   // secondary text
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',   // tertiary / captions
        },
        // Accents
        brand: {
          primary: '#2DD4BF',   // teal — primary action / privacy
          secondary: '#3B82F6', // electric blue — data / links
          accent: '#A78BFA',    // violet — settlement / web3
          success: '#34D399',
          warn: '#FBBF24',
          danger: '#FB7185',
        },
        // Role hues (muted for dark)
        role: {
          'data-provider': '#A78BFA',
          'auditor': '#22D3EE',
          'data-consumer': '#A3E635',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(45,212,191,0.25), 0 8px 30px -8px rgba(45,212,191,0.35)',
        'glow-blue': '0 0 0 1px rgba(59,130,246,0.25), 0 8px 30px -8px rgba(59,130,246,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid-fade': 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.08) 1px, transparent 0)',
        'mesh': 'radial-gradient(60% 80% at 20% 0%, rgba(45,212,191,0.10) 0%, transparent 60%), radial-gradient(50% 60% at 100% 0%, rgba(59,130,246,0.12) 0%, transparent 55%)',
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'shimmer': 'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slide-in': {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
    },
  },
  plugins: [],
};
