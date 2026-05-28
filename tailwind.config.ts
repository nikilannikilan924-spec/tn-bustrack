import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          950: '#08131e',
          900: '#12263b',
          700: '#1f4373'
        }
      },
      boxShadow: {
        soft: '0 20px 40px rgba(8, 22, 40, 0.12)'
      },
      fontFamily: {
        orbitron: ['var(--font-orbitron)'],
        jetbrains: ['var(--font-jetbrains)'],
        tamil: ['var(--font-tamil)']
      }
    }
  },
  plugins: []
};

export default config;
