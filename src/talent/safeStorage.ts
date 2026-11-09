import { createJSONStorage, StateStorage } from 'zustand/middleware'

const mem = new Map<string, string>()
const fallback: StateStorage = {
  getItem: k => mem.get(k) ?? null,
  setItem: (k, v) => { mem.set(k, v) },
  removeItem: k => { mem.delete(k) },
}

/** localStorage when it works, an in-memory map when it is blocked or missing. */
export const safeStorage = createJSONStorage<any>(() => {
  try {
    const ls = (globalThis as any).localStorage as Storage | undefined
    if (ls) { ls.getItem('__probe'); return ls }
  } catch { /* fall through */ }
  return fallback
})
