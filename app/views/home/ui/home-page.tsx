import { Text, Title } from '@mantine/core'
import { useState } from 'react'

export default function HomePage() {
  const [state] = useState(0)
  const derivedState = state + 2
  return (
    <main className="container mx-auto flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Title order={1}>Welcome {derivedState}</Title>
      <Text c="dimmed" size="lg">
        React Router v7 + Mantine + Tailwind scaffold.
      </Text>
    </main>
  )
}
