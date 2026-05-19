import type { ClassValue } from 'clsx'

declare global {
  interface ClassProps {
    className?: ClassValue
  }

  interface ClassNamesProp<T extends string | number | symbol> {
    classNames?: Partial<Record<T, ClassValue>>
  }
}

export {}
