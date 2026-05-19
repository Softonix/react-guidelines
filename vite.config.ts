import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import mantineTheme from 'tailwind-preset-mantine/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    mantineTheme({
      input: './app/shared/mantine/index.ts',
      output: './app/theme.css',
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
