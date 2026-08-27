export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#16202C',
        surface: '#1E2C3A',
        line: '#2A3C4E',
        mist: '#EDE8E1',
        aqua: '#9E6634',
        coral: '#B85D38',
        sand: '#C4B59D',
      },
      fontFamily: {
        display: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      boxShadow: {
        lift: '0 22px 60px rgba(0,0,0,.28)',
      },
    },
  },
  plugins: [],
};
