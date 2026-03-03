import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function computeExpiresAt(duration: '1d' | '1w' | '1m'): Date {
  const now = new Date()
  if (duration === '1d') return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  if (duration === '1w') return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
}
