import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getApiUrl() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_API_URL || 'https://api.retrieval.rethoriq.com'
  }
  return 'http://localhost:8000'
}
