import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'],
      },
      colors: {
        yellow:   '#F5C535',
        pink:     '#E83567',
        teal:     '#2EAA8A',
        blue:     '#2878B5',
        offblack: '#1A1A1A',
        grey:     '#6B6B6B',
        border:   '#E4E4E4',
        light:    '#F6F6F6',
        bg:       '#F0F0F0',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
export default config
