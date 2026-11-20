import { Sun, Moon, Monitor, Type, RotateCcw } from 'lucide-react'
import { usePrefs, TEXT_SIZES, type Theme } from '../data/prefs'
import { useStore } from '../data/store'
import { Card, cx, Btn, toast } from './ui'

const THEMES: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'Same as phone', icon: Monitor },
]

export function SettingsPanel({ showReset }: { showReset?: boolean }) {
  const { theme, textSize, reduceMotion, set } = usePrefs()
  const status = useStore((s) => s.status)
  const reset = useStore((s) => s.reset)
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="font-bold mb-1">Appearance</div>
        <div className="text-sm text-muted mb-3">Light, dark, or follow your phone.</div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button key={t.id} role="radio" aria-checked={theme === t.id} onClick={() => set({ theme: t.id })}
              className={cx('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-semibold transition', theme === t.id ? 'border-brand bg-brand-soft text-brand' : 'border-line')}>
              <t.icon size={20} />{t.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="font-bold mb-1 flex items-center gap-2"><Type size={18} />Text size</div>
        <div className="text-sm text-muted mb-3">Make everything bigger or smaller. Saved on this device.</div>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Text size">
          {TEXT_SIZES.map((t) => (
            <button key={t.id} role="radio" aria-checked={textSize === t.id} onClick={() => set({ textSize: t.id })}
              className={cx('flex flex-col items-center justify-end gap-1 rounded-xl border p-2 h-20 transition', textSize === t.id ? 'border-brand bg-brand-soft text-brand' : 'border-line')}>
              <span className="font-serif leading-none" style={{ fontSize: 16 * t.scale * 1.3 }}>Aa</span>
              <span className="text-[11px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-card-2 p-3 text-sm">Preview: <b>Rent due Mon 1 Dec · UGX 2,998,500</b></div>
      </Card>

      <Card className="p-4 flex items-center justify-between gap-3">
        <div><div className="font-bold">Reduce motion</div><div className="text-sm text-muted">Fewer animations.</div></div>
        <button role="switch" aria-checked={reduceMotion} onClick={() => set({ reduceMotion: !reduceMotion })} className={cx('w-12 h-7 rounded-full p-1 transition', reduceMotion ? 'bg-brand' : 'bg-line')}>
          <span className={cx('block w-5 h-5 rounded-full bg-white shadow transition', reduceMotion && 'translate-x-5')} />
        </button>
      </Card>

      <Card className="p-4 text-sm">
        <div className="font-bold mb-1">Data</div>
        <div className="text-muted">{status === 'live' ? 'Live: changes show on every phone and in Posh Office instantly.' : 'Working on this device only (no connection to the live database).'}</div>
        {showReset && <Btn className="mt-3" variant="outline" size="sm" icon={<RotateCcw size={14} />} onClick={async () => { if (confirmReset()) { await reset(); toast('Demo data reset') } }}>Reset demo data</Btn>}
      </Card>
    </div>
  )
}

function confirmReset() { return window.confirm('Reset all demo data back to the starting sample? Payments, repairs and cards made during the demo will be cleared.') }

export function ThemeQuick() {
  const { theme, set } = usePrefs()
  const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' }
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  return <button aria-label={`Theme: ${theme}`} title={`Theme: ${theme}`} onClick={() => set({ theme: next[theme] })} className="w-10 h-10 grid place-items-center rounded-full border border-line bg-card"><Icon size={18} /></button>
}
