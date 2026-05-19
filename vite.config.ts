import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import mantineTheme from 'tailwind-preset-mantine/vite'
import babel from 'vite-plugin-babel'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    babel({
      include: /\.[jt]sx?$/,
      babelConfig: {
        presets: ['@babel/preset-typescript'],
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
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
