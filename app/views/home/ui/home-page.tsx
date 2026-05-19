import { Text, Title } from '@mantine/core'

export default function HomePage() {
  return (
    <main className="container mx-auto flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Title order={1}>Welcome</Title>
      <Text c="dimmed" size="lg">
        React Router v7 + Mantine + Tailwind scaffold.
      </Text>
    </main>
  )
}
