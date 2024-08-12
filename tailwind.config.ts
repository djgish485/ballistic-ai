import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'media', // This enables dark mode based on the user's system preferences
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      minWidth: {
        '260': '18rem',
      },
      width: {
        '260': '18rem',
      },
      colors: {
        darkBg: '#1F2937',
        darkText: '#F3F4F6',
        darkBox: '#374151', // Color for box backgrounds in dark mode
        darkMessageBox: '#2C3E50', // Color for message boxes in dark mode
        darkCodeBorder: '#4B5563', // New color for code block borders in dark mode
      },
    },
  },
  plugins: [],
}

export default config