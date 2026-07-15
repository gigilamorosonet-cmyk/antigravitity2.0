import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

const API = '/api'

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('an_token')
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  // Pas de redirection en mode démo publique
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Erreur ${res.status}`)
  }
  return res.json()
}

export const fmtCost = (c: number) => c < 0.01 ? `$${c.toFixed(4)}` : `$${c.toFixed(2)}`
export const fmtTokens = (t: number) => t > 1_000_000 ? `${(t / 1e6).toFixed(1)}M` : t > 1000 ? `${(t / 1000).toFixed(1)}k` : `${t}`