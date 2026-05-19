import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'

import { theme } from '.'

export function MantineConfigProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="dark">
      <ModalsProvider>
        <Notifications position="bottom-left" autoClose={2000} zIndex={2000} />
        <DatesProvider settings={{ consistentWeeks: true }}>{children}</DatesProvider>
      </ModalsProvider>
    </MantineProvider>
  )
}
