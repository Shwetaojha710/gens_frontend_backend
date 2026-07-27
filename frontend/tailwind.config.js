/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/marketing/**/*.{html,ts}'],
  darkMode: 'class',
  // Scope every generated utility under `.gens-marketing` so Tailwind is
  // completely inert outside the new marketing subtree of this app (which
  // is otherwise a large Bootstrap-based admin/HRMS application sharing one
  // global stylesheet bundle). See frontend/src/marketing-tailwind.css.
  important: '.gens-marketing',
  corePlugins: {
    // Preflight is a global, unscoped element-selector reset (headings,
    // buttons, lists, box-sizing) — the `important` selector above does NOT
    // scope it. Bootstrap's own reboot already normalizes the DOM for the
    // rest of this app, so Preflight is disabled to avoid resetting default
    // styling app-wide the instant this stylesheet is loaded.
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        gens: {
          50: '#eef9f8',
          100: '#d5f2ef',
          200: '#abe5de',
          300: '#72d1c6',
          400: '#3fb8aa',
          500: '#259e90',
          600: '#1a8075',
          700: '#186760',
          800: '#17524d',
          900: '#174541',
          950: '#0b2b3a',
        },
        navy: {
          DEFAULT: '#0b2b3a',
          light: '#0f3d4c',
          dark: '#061e28',
        },
        accent: {
          DEFAULT: '#00b4a6',
          light: '#7ed321',
          dark: '#008f84',
          orange: '#ff8c42',
          warm: '#ffb347',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-mesh': 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(37,158,144,0.15), transparent), radial-gradient(ellipse 60% 50% at 100% 50%, rgba(126,211,33,0.08), transparent)',
        'cta-gradient': 'linear-gradient(135deg, #0b2b3a 0%, #1a8075 50%, #259e90 100%)',
        'btn-gradient': 'linear-gradient(135deg, #1a8075 0%, #7ed321 100%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        marquee: 'marquee 40s linear infinite',
        'marquee-reverse': 'marquee-reverse 40s linear infinite',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'scale-in': 'scaleIn 0.6s ease-out forwards',
        glow: 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-reverse': {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(37,158,144,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(126,211,33,0.4)' },
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(11, 43, 58, 0.08)',
        premium: '0 25px 60px -12px rgba(26, 128, 117, 0.25)',
        card: '0 4px 24px rgba(11, 43, 58, 0.06)',
        'card-hover': '0 12px 40px rgba(11, 43, 58, 0.12)',
        lattice: '0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
