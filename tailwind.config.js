/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F8FA',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        'primary-text': '#111827',
        'secondary-text': '#667085',
        'muted-text': '#98A2B3',
        'primary-green': '#16A34A',
        'ai-blue': '#2563EB',
        'brand-navy': '#0B1F3A',
        warning: '#F59E0B',
        danger: '#DC2626',
      },
      borderRadius: {
        enterprise: '10px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
