/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary": "#6366F1",
        "primary-dark": "#4F46E5",
        "accent-cyan": "#22D3EE",
        "accent-indigo": "#6366F1",
        "background-light": "#F9FAFB",
        "background-dark": "#0F172A",
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "sans": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "2xl": "2rem",
        "3xl": "2.5rem"
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(34, 211, 238, 0.5)',
        'glow-indigo': '0 0 20px -5px rgba(99, 102, 241, 0.4)',
      }
    },
  },
  plugins: [],
};
