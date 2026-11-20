import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { create } from 'zustand'
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { towers, logoHorizontal, sealSvg, iconPassport } from '../brand/marks'
import { initials, hueBg } from '../lib/format'

export const cx = (...a: (string | number | false | null | undefined)[]) => a.filter(Boolean).join(' ')

export function Svg({ html, className }: { html: string; className?: string }) {
  return <span className={cx('[&>svg]:w-full [&>svg]:h-auto', /\b(hidden|block|flex)\b/.test(className ?? '') ? '' : 'inline-block', className)} dangerouslySetInnerHTML={{ __html: html }} />
}
export function TowersMark({ className, light }: { className?: string; light?: boolean }) {
  return <Svg className={className} html={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90">${towers({ sw: 4, red: light ? '#FF6B6F' : undefined, green: light ? '#FFFFFF' : undefined })}</svg>`} />
}
export function LogoH({ className, dark, sub }: { className?: string; dark?: boolean; sub?: string }) {
  return <Svg className={className} html={logoHorizontal(dark, sub)} />
}
export function ThemedLogo({ className, sub }: { className?: string; sub?: string }) {
  return (<>
    <LogoH className={cx(className, 'inline-block dark:hidden')} sub={sub} />
    <LogoH className={cx(className, 'hidden dark:inline-block')} dark sub={sub} />
  </>)
}
export const Seal = ({ className, dark }: { className?: string; dark?: boolean }) => <Svg className={className} html={sealSvg(512, dark)} />
export const AppIcon = ({ className }: { className?: string }) => <Svg className={className} html={iconPassport(512)} />

export function Loader({ label = 'Loading…', full }: { label?: string; full?: boolean }) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-4 text-muted', full && 'min-h-dvh bg-bg')}>
      <span className="tower-draw w-20"><TowersMark /></span>
      <div className="font-serif text-2xl text-ink tracking-wide">POSH</div>
      <div className="text-sm">{label}</div>
    </div>
  )
}

export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={cx('bg-card rounded-2xl border border-line shadow-card', onClick && 'cursor-pointer active:scale-[.99] transition', className)}>{children}</div>
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'soft' | 'danger' | 'outline'; size?: 'sm' | 'md' | 'lg'; block?: boolean; icon?: ReactNode }
export function Btn({ variant = 'primary', size = 'md', block, icon, className, children, ...p }: BtnProps) {
  const v = {
    primary: 'bg-brand text-white hover:bg-brand-2 shadow-sm',
    ghost: 'text-ink hover:bg-card-2',
    soft: 'bg-brand-soft text-brand hover:brightness-95',
    danger: 'bg-posh-red text-white hover:brightness-95',
    outline: 'border border-line bg-card text-ink hover:bg-card-2',
  }[variant]
  const s = { sm: 'h-8 px-3 text-[0.8125rem] rounded-lg', md: 'h-10 px-4 text-sm rounded-xl', lg: 'h-13 px-5 text-base rounded-2xl' }[size]
  return <button {...p} className={cx('inline-flex items-center justify-center gap-2 font-semibold transition disabled:opacity-50 disabled:pointer-events-none', v, s, block && 'w-full', className)}>{icon}{children}</button>
}

const TONES = {
  green: 'bg-brand-soft text-brand',
  red: 'bg-red-soft text-posh-red',
  gold: 'bg-gold-soft text-gold',
  blue: 'bg-blue-soft text-sky-700 dark:text-sky-300',
  gray: 'bg-card-2 text-muted',
  dark: 'bg-ink text-bg',
}
export type Tone = keyof typeof TONES
export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold whitespace-nowrap', TONES[tone], className)}>{children}</span>
}
export const statusTone = (s: string): Tone => (/paid|done|active|genuine|clean|confirmed|ok|delivered|closed|on schedule/i.test(s) ? 'green' : /block|refused|overdue|caveat|failed|urgent|late|behind|low/i.test(s) ? 'red' : /part|grace|booked|pending|due|en route|offer|report|inspection|viewing|in progress/i.test(s) ? 'gold' : /new|assigned|requested|enquiry|ordered/i.test(s) ? 'blue' : 'gray')

export function Avatar({ name, size = 40, tone = 'green' }: { name: string; size?: number; tone?: 'green' | 'red' | 'gold' }) {
  const bg = tone === 'green' ? 'bg-brand text-white' : tone === 'red' ? 'bg-posh-red text-white' : 'bg-gold text-white'
  return <span className={cx('inline-flex items-center justify-center rounded-full font-bold shrink-0', bg)} style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials(name)}</span>
}

export function PhotoTile({ hue, className, children }: { hue: number; className?: string; children?: ReactNode }) {
  return (
    <div className={cx('relative overflow-hidden', className)} style={{ background: hueBg(hue) }}>
      <svg viewBox="0 0 200 120" className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="xMidYMax slice"><g fill="none" stroke="#fff" strokeWidth="2"><path d="M20 120V70h30v50M60 120V45h28v75M98 120V30h24v90M132 120V55h26v65M168 120V75h22v45" /></g></svg>
      {children}
    </div>
  )
}

export function Stat({ label, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'up' | 'down' | 'warn'; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-[0.8125rem] text-muted">{icon}{label}</div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
      {sub && <div className={cx('mt-0.5 text-xs font-medium', tone === 'up' ? 'text-brand' : tone === 'down' ? 'text-posh-red' : tone === 'warn' ? 'text-gold' : 'text-muted')}>{sub}</div>}
    </Card>
  )
}

export function Chips<T extends string>({ options, value, onChange, className }: { options: readonly T[] | T[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx('flex gap-2 overflow-x-auto no-scrollbar', className)}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} className={cx('h-9 px-4 rounded-full text-sm font-semibold whitespace-nowrap border transition', value === o ? 'bg-ink text-bg border-ink' : 'bg-card border-line text-ink')}>{o}</button>
      ))}
    </div>
  )
}

export function Sheet({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', h)
    return () => removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={cx('anim-rise w-full bg-card text-ink rounded-t-3xl sm:rounded-3xl max-h-[92dvh] overflow-y-auto pb-safe', wide ? 'sm:max-w-2xl' : 'sm:max-w-md')}>
        <div className="sticky top-0 z-10 bg-card flex items-center justify-between px-5 pt-4 pb-2">
          <div className="text-lg font-bold">{title}</div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-card-2" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[0.8125rem] font-semibold text-muted mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted mt-1">{hint}</span>}
    </label>
  )
}
export const inputCls = 'w-full h-11 rounded-xl border border-line bg-card px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20'

export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('mt-5', className)}>
      <div className="flex items-center justify-between mb-2"><h3 className="font-bold">{title}</h3>{action}</div>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="text-center text-muted text-sm py-8">{children}</div>
}

// ---------- Toasts ----------
interface ToastItem { id: number; text: string; tone: 'ok' | 'warn' | 'info' }
const useToasts = create<{ items: ToastItem[] }>(() => ({ items: [] }))
export function toast(text: string, tone: ToastItem['tone'] = 'ok') {
  const id = Date.now() + Math.random()
  useToasts.setState((s) => ({ items: [...s.items, { id, text, tone }] }))
  setTimeout(() => useToasts.setState((s) => ({ items: s.items.filter((x) => x.id !== id) })), 3600)
}
export function Toaster() {
  const items = useToasts((s) => s.items)
  return (
    <div className="fixed z-[60] top-3 inset-x-0 flex flex-col items-center gap-2 pointer-events-none px-3">
      {items.map((t) => (
        <div key={t.id} className="anim-rise pointer-events-auto flex items-center gap-2 bg-ink text-bg rounded-2xl px-4 py-3 text-sm font-medium shadow-lg max-w-md">
          {t.tone === 'ok' ? <CheckCircle2 size={18} className="text-green-400" /> : t.tone === 'warn' ? <AlertTriangle size={18} className="text-amber-400" /> : <Info size={18} className="text-sky-400" />}
          {t.text}
        </div>
      ))}
    </div>
  )
}

export function useNow(ms = 30000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setN(Date.now()), ms); return () => clearInterval(i) }, [ms])
  return n
}

export function Bars({ data, height = 120, highlightLast = true }: { data: { label: string; value: number }[]; height?: number; highlightLast?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
          <div title={String(d.value)} className={cx('w-full rounded-md transition-all', highlightLast && i === data.length - 1 ? 'bg-brand' : 'bg-brand-soft')} style={{ height: `${Math.max(4, (d.value / max) * (height - 22))}px` }} />
          <div className="text-[0.625rem] text-muted">{d.label}</div>
        </div>
      ))}
    </div>
  )
}

export function Progress({ value, tone = 'green' }: { value: number; tone?: 'green' | 'red' | 'gold' }) {
  return <div className="w-full min-w-12 h-2 rounded-full bg-card-2 overflow-hidden"><div className={cx('h-full rounded-full', tone === 'green' ? 'bg-brand' : tone === 'red' ? 'bg-posh-red' : 'bg-gold')} style={{ width: `${Math.min(100, value)}%` }} /></div>
}
