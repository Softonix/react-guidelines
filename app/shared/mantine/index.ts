import { createTheme } from '@mantine/core'

import { colors } from './colors'

export const theme = createTheme({
  primaryColor: 'gold',
  primaryShade: 5,
  autoContrast: true,
  fontFamily: 'var(--font-sans)',
  headings: {
    fontFamily: 'var(--font-sans)',
    fontWeight: '700',
  },
  defaultRadius: 'md',
  radius: {
    xs: '6px',
    sm: '10px',
    md: '12px',
    lg: '18px',
    xl: '24px',
  },
  breakpoints: {
    xs: '36em',
    sm: '40em',
    md: '48em',
    lg: '64em',
    xl: '80em',
  },
  colors,
})

export default theme
