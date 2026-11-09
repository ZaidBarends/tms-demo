import { createJSONStorage } from 'zustand/middleware'

/** localStorage when it works, otherwise an in-memory fallback so the app never crashes. */
export function safeStorage() {
  const mem: Record<string, string> = {}
  return createJSONStorage(() => {
    try {
      const k = '__probe__'
      localStorage.setItem(k, '1'); localStorage.removeItem(k)
      return localStorage
    } catch {
      return { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v }, removeItem: (k: string) => { delete mem[k] } }
    }
  })
}
