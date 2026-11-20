import { create } from 'zustand'

export type Theme = 'system' | 'light' | 'dark'
export const TEXT_SIZES = [
  { id: 'sm', label: 'Small', scale: 0.9 },
  { id: 'md', label: 'Normal', scale: 1 },
  { id: 'lg', label: 'Large', scale: 1.15 },
  { id: 'xl', label: 'Extra large', scale: 1.3 },
] as const
export type TextSize = (typeof TEXT_SIZES)[number]['id']

interface Session { tenantId?: string; staffId?: string; role?: Role; buyerName?: string; buyerPhone?: string }
export type Role = 'tenant' | 'buyer' | 'client' | 'landlord' | 'site' | 'caretaker'

interface Prefs {
  theme: Theme
  textSize: TextSize
  reduceMotion: boolean
  app: Session
  officeStaffId?: string
  set: (p: Partial<Omit<Prefs, 'set'>>) => void
}

const KEY = 'posh.prefs.v1'
function load(): Partial<Prefs> { try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} } }

export const usePrefs = create<Prefs>((set, get) => ({
  theme: 'system', textSize: 'md', reduceMotion: false, app: {}, ...load(),
  set: (p) => {
    set(p)
    const { set: _s, ...rest } = { ...get() }
    void _s
    try { localStorage.setItem(KEY, JSON.stringify(rest)) } catch { /* ignore */ }
    applyPrefs()
  },
}))

export function applyPrefs() {
  const { theme, textSize, reduceMotion } = usePrefs.getState()
  const root = document.documentElement
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.dataset.theme = dark ? 'dark' : 'light'
  const scale = TEXT_SIZES.find((t) => t.id === textSize)?.scale ?? 1
  root.style.fontSize = `${16 * scale}px`
  root.classList.toggle('reduce-motion', reduceMotion)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#062E17' : '#136734')
}
if (typeof window !== 'undefined') matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefs)
