import { useState, type ReactNode } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom'
import { Home, Wallet, Wrench, FileText, User, Search, Heart, CalendarDays, Landmark, HardHat, ClipboardCheck, BarChart3, Building2, Nfc, ChevronLeft, Bell, LogOut, Settings as Cog, Users, Package, AlertCircle, Camera } from 'lucide-react'
import { usePrefs, type Role } from '../data/prefs'
import { useStore } from '../data/store'
import { Btn, cx, Card, Sheet, toast, Avatar, ThemedLogo, Svg, inputCls, Field } from '../components/ui'
import { SettingsPanel } from '../components/Settings'
import { iconPassport } from '../brand/marks'
import { readOnce, webNfcSupported, parseTarget, isIOS } from '../lib/nfc'
import { list } from '../data/store'
import { DEMO_TENANT, DEMO_LANDLORD } from '../data/seed'
import Tenant from './Tenant'
import Buyer from './Buyer'
import Client from './Client'
import Landlord from './Landlord'
import Staff from './Staff'

const TABS: Record<Role, { to: string; label: string; icon: typeof Home }[]> = {
  tenant: [{ to: '/app/home', label: 'Home', icon: Home }, { to: '/app/pay', label: 'Pay', icon: Wallet }, { to: '/app/repairs', label: 'Repairs', icon: Wrench }, { to: '/app/lease', label: 'Lease', icon: FileText }, { to: '/app/me', label: 'Me', icon: User }],
  buyer: [{ to: '/app/search', label: 'Search', icon: Search }, { to: '/app/saved', label: 'Saved', icon: Heart }, { to: '/app/viewings', label: 'Viewings', icon: CalendarDays }, { to: '/app/finance', label: 'Finance', icon: Landmark }, { to: '/app/me', label: 'Me', icon: User }],
  client: [{ to: '/app/build', label: 'My build', icon: HardHat }, { to: '/app/build-pay', label: 'Payments', icon: Wallet }, { to: '/app/build-photos', label: 'Photos', icon: Camera }, { to: '/app/me', label: 'Me', icon: User }],
  landlord: [{ to: '/app/statement', label: 'Statement', icon: BarChart3 }, { to: '/app/units', label: 'Units', icon: Building2 }, { to: '/app/me', label: 'Me', icon: User }],
  site: [{ to: '/app/site', label: 'Site', icon: HardHat }, { to: '/app/crew', label: 'Crew', icon: Users }, { to: '/app/materials', label: 'Materials', icon: Package }, { to: '/app/issues', label: 'Issues', icon: AlertCircle }, { to: '/app/me', label: 'Me', icon: User }],
  caretaker: [{ to: '/app/round', label: 'Round', icon: ClipboardCheck }, { to: '/app/me', label: 'Me', icon: User }],
}
export const HOME: Record<Role, string> = { tenant: '/app/home', buyer: '/app/search', client: '/app/build', landlord: '/app/statement', site: '/app/site', caretaker: '/app/round' }

export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh sm:py-6 sm:bg-[radial-gradient(circle_at_30%_20%,#1A8043_0,#062E17_70%)]">
      <div className="relative mx-auto w-full max-w-[430px] h-dvh sm:h-[880px] flex flex-col bg-bg sm:rounded-[2.75rem] sm:border-[10px] sm:border-black sm:shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function TopBar({ title, sub, back, right }: { title: ReactNode; sub?: ReactNode; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="pt-safe sticky top-0 z-20 bg-bg/90 backdrop-blur">
      <div className="flex items-center gap-2 px-4 h-16">
        {back && <button onClick={() => nav(-1)} className="w-10 h-10 -ml-2 grid place-items-center rounded-full hover:bg-card-2" aria-label="Back"><ChevronLeft /></button>}
        <div className="min-w-0 flex-1">
          <div className="text-xl font-extrabold truncate">{title}</div>
          {sub && <div className="text-xs text-muted truncate">{sub}</div>}
        </div>
        {right}
      </div>
    </div>
  )
}

export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('px-4 pb-6 anim-rise', className)}>{children}</div>
}

export function NfcButton() {
  const [open, setOpen] = useState(false)
  return (<>
    <button onClick={() => setOpen(true)} aria-label="Tap a Posh card or plaque" className="w-10 h-10 grid place-items-center rounded-full bg-card border border-line"><Nfc size={18} /></button>
    <NfcSheet open={open} onClose={() => setOpen(false)} />
  </>)
}

export function NfcSheet({ open, onClose, onRead, title = 'Tap a Posh card or plaque' }: { open: boolean; onClose: () => void; onRead?: (r: { serial?: string; target: ReturnType<typeof parseTarget> }) => void; title?: string }) {
  const nav = useNavigate()
  const [state, setState] = useState<'idle' | 'scan' | 'err'>('idle')
  const [err, setErr] = useState('')
  const db = useStore((s) => s.db)
  const handle = (serial: string | undefined, target: ReturnType<typeof parseTarget>) => {
    // A card may be identified by its chip serial even if its URL record was never written.
    let t = target
    if (!t && serial) { const c = list(db, 'cards').find((x) => x.uid === serial); if (c) t = c.propertyId && c.type === 'Plaque' ? { type: 'passport', id: c.propertyId } : { type: 'card', id: c.id } }
    onClose(); setState('idle')
    if (onRead) return onRead({ serial, target: t })
    if (!t) return toast(`Unknown card${serial ? ` (${serial})` : ''}. Ask the Posh office to register it.`, 'warn')
    nav(t.type === 'card' ? `/c/${t.id}${serial ? `?uid=${encodeURIComponent(serial)}` : ''}` : `/p/${t.id}${serial ? `?uid=${encodeURIComponent(serial)}` : ''}`)
  }
  const start = async () => {
    setState('scan'); setErr('')
    try { const r = await readOnce(); handle(r.serial, parseTarget(r.url)) } catch (e) { setState('err'); setErr((e as Error).message) }
  }
  return (
    <Sheet open={open} onClose={() => { onClose(); setState('idle') }} title={title}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="relative w-36 h-36 grid place-items-center">
          {state === 'scan' && <span className="absolute inset-0 rounded-full border-4 border-brand pulse-ring" />}
          <div className="w-28 h-28 rounded-full bg-brand-soft text-brand grid place-items-center"><Nfc size={52} /></div>
        </div>
        {webNfcSupported() ? (<>
          <p className="text-sm text-muted">{state === 'scan' ? 'Hold the card flat on the back of your phone…' : 'Press start, then hold the Posh card or plaque to the back of your phone.'}</p>
          {state !== 'scan' && <Btn block size="lg" onClick={start}>Start reading</Btn>}
        </>) : (
          <p className="text-sm text-muted">{isIOS() ? 'On iPhone: lock nothing, just hold the top edge of the iPhone to the card. A Posh notification appears; tap it to open.' : 'This browser cannot read NFC. Use Chrome on Android, the Posh Android app, or an iPhone tap.'}</p>
        )}
        {err && <p className="text-sm text-posh-red">{err}</p>}
        <div className="w-full border-t border-line pt-3">
          <div className="text-xs text-muted mb-2">No card to hand? Try the demo ones:</div>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="outline" size="sm" onClick={() => handle('04:73:D4:CA:04:19:90', { type: 'card', id: 'PC-0412-B4-7781' })}>Nakato's Posh card</Btn>
            <Btn variant="outline" size="sm" onClick={() => handle(undefined, { type: 'passport', id: 'PP-KLA-0412' })}>Kiwatule plaque</Btn>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

export function BellButton() {
  const nav = useNavigate()
  return <button onClick={() => nav('/app/inbox')} aria-label="Messages" className="relative w-10 h-10 grid place-items-center rounded-full bg-card border border-line"><Bell size={18} /><span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-posh-red" /></button>
}

function Welcome() {
  const { set } = usePrefs()
  const nav = useNavigate()
  const db = useStore((s) => s.db)
  const [login, setLogin] = useState<null | 'tenant' | 'staff'>(null)
  const [phone, setPhone] = useState('+256 772 300 412')
  const [pin, setPin] = useState('1234')
  const go = (role: Role, extra: object = {}) => { set({ app: { role, ...extra } }); nav(HOME[role], { replace: true }) }
  const roles: { role: Role | 'staff'; title: string; sub: string; icon: typeof Home }[] = [
    { role: 'tenant', title: 'I rent a Posh home', sub: 'Pay rent, repairs, lease, receipts', icon: Home },
    { role: 'buyer', title: 'Find a home or plot', sub: 'Rent, buy, land · book viewings', icon: Search },
    { role: 'client', title: 'Posh is building for me', sub: 'Progress, photos, stage payments', icon: HardHat },
    { role: 'landlord', title: 'I am a landlord', sub: 'Statements, payouts, URA tax', icon: BarChart3 },
    { role: 'staff', title: 'Posh staff', sub: 'Site manager · caretaker', icon: ClipboardCheck },
  ]
  return (
    <Frame>
      <div className="flex-1 overflow-y-auto">
        <div className="pt-safe bg-[linear-gradient(160deg,#1A8043,#062E17)] text-white rounded-b-[2.5rem]"><div className="px-6 pt-10 pb-16">
          <Svg className="w-16 rounded-2xl overflow-hidden shadow-lg" html={iconPassport(256)} />
          <h1 className="mt-5 font-serif text-4xl leading-tight">Welcome to Posh</h1>
          <p className="mt-2 text-white/80">Your home, your payments and your property's passport, in one app.</p>
        </div></div>
        <div className="relative z-10 px-4 -mt-8 space-y-3 pb-8">
          {roles.map((r) => (
            <Card key={r.role} onClick={() => (r.role === 'tenant' ? setLogin('tenant') : r.role === 'staff' ? setLogin('staff') : r.role === 'landlord' ? go('landlord', { tenantId: DEMO_LANDLORD }) : go(r.role as Role))} className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand grid place-items-center shrink-0"><r.icon /></div>
              <div className="flex-1"><div className="font-bold">{r.title}</div><div className="text-sm text-muted">{r.sub}</div></div>
            </Card>
          ))}
          <div className="text-center pt-2"><ThemedLogo className="w-32 opacity-80" sub="PROPERTIES LTD" /></div>
        </div>
      </div>
      <Sheet open={login === 'tenant'} onClose={() => setLogin(null)} title="Sign in as a tenant">
        <form className="space-y-3" onSubmit={(e) => {
          e.preventDefault()
          const digits = phone.replace(/\D/g, '').slice(-9)
          const t = list(db, 'tenants').find((x) => x.phone.replace(/\D/g, '').slice(-9) === digits)
          if (!t) return toast('No Posh tenant with that number', 'warn')
          if (pin !== t.pin) return toast('Wrong PIN', 'warn')
          go('tenant', { tenantId: t.id })
        }}>
          <Field label="Phone number"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></Field>
          <Field label="PIN" hint="Demo: Nakato Sarah, +256 772 300 412, PIN 1234"><input className={inputCls} value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" type="password" maxLength={4} /></Field>
          <Btn block size="lg" type="submit">Sign in</Btn>
          <Btn block variant="ghost" type="button" onClick={() => go('tenant', { tenantId: DEMO_TENANT })}>Use the demo tenant</Btn>
        </form>
      </Sheet>
      <Sheet open={login === 'staff'} onClose={() => setLogin(null)} title="Posh staff">
        <div className="space-y-3">
          <Card onClick={() => go('site', { staffId: 'S-3' })} className="p-4 flex items-center gap-3"><Avatar name="Paul Okello" /><div><div className="font-bold">Eng. Paul Okello</div><div className="text-sm text-muted">Site manager · Kira-Mulawa 77</div></div></Card>
          <Card onClick={() => go('caretaker', { staffId: 'S-4' })} className="p-4 flex items-center gap-3"><Avatar name="Moses Kizza" tone="gold" /><div><div className="font-bold">Moses Kizza</div><div className="text-sm text-muted">Caretaker · Naguru Heights</div></div></Card>
        </div>
      </Sheet>
    </Frame>
  )
}

function Me() {
  const { app, set } = usePrefs()
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const role = app.role!
  const name = role === 'tenant' ? db.tenants[app.tenantId!]?.name : role === 'landlord' ? db.landlords[DEMO_LANDLORD].name : role === 'client' ? 'Joan Atuhaire' : app.staffId ? db.staff[app.staffId]?.name : 'Guest'
  const sub = role === 'tenant' ? (() => { const u = db.units[db.tenants[app.tenantId!]?.unitId]; return u ? `${u.estate} · ${u.name}` : '' })() : { buyer: 'Home seeker', client: 'Posh Construction client', landlord: 'Landlord · Ntinda', site: 'Site manager', caretaker: 'Caretaker', tenant: '' }[role]
  return (<>
    <TopBar title="Me" right={<NfcButton />} />
    <Screen>
      <Card className="p-4 flex items-center gap-3"><Avatar name={name ?? 'Guest'} size={52} /><div><div className="font-bold text-lg">{name}</div><div className="text-sm text-muted">{sub}</div></div></Card>
      <h3 className="font-bold mt-6 mb-2 flex items-center gap-2"><Cog size={18} />Settings</h3>
      <SettingsPanel />
      <div className="mt-6 space-y-2">
        <Btn block variant="outline" onClick={() => nav('/app/inbox')} icon={<Bell size={16} />}>Messages and WhatsApp receipts</Btn>
        <Btn block variant="outline" icon={<LogOut size={16} />} onClick={() => { set({ app: {} }); nav('/app', { replace: true }) }}>Switch account</Btn>
      </div>
      <div className="text-center text-xs text-muted mt-6">Posh app 1.0 · Posh Properties Ltd · {useStore.getState().status === 'live' ? 'live' : 'offline'}</div>
    </Screen>
  </>)
}

function Inbox() {
  const { app } = usePrefs()
  const db = useStore((s) => s.db)
  const me = app.role === 'tenant' ? db.tenants[app.tenantId!]?.name : app.role === 'landlord' ? db.landlords[DEMO_LANDLORD].name : app.buyerName
  const msgs = list(db, 'messages').filter((m) => !me || m.to === me).sort((a, b) => b.at.localeCompare(a.at))
  return (<>
    <TopBar title="Messages" back />
    <Screen className="space-y-2">
      {msgs.length === 0 && <div className="text-center text-muted py-10">No messages yet.</div>}
      {msgs.map((m) => (
        <Card key={m.id} className="p-3">
          <div className="flex justify-between text-xs text-muted"><span className="font-semibold text-brand">{m.channel}</span><span>{new Date(m.at).toLocaleString('en-GB', { timeZone: 'Africa/Kampala', dateStyle: 'medium', timeStyle: 'short' })}</span></div>
          <div className="text-sm mt-1">{m.text}</div>
        </Card>
      ))}
    </Screen>
  </>)
}

export default function MobileApp() {
  const role = usePrefs((s) => s.app.role)
  const loc = useLocation()
  if (!role) return loc.pathname === '/app' || loc.pathname === '/app/' ? <Welcome /> : <Navigate to="/app" replace />
  const tabs = TABS[role]
  const hideTabs = /\/app\/(pay\/|receipt|listing|book|inbox)/.test(loc.pathname)
  return (
    <Frame>
      <main className="flex-1 overflow-y-auto overscroll-contain" id="app-scroll">
        <Routes>
          <Route index element={<Navigate to={HOME[role]} replace />} />
          <Route path="me" element={<Me />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="*" element={role === 'tenant' ? <Tenant /> : role === 'buyer' ? <Buyer /> : role === 'client' ? <Client /> : role === 'landlord' ? <Landlord /> : <Staff />} />
        </Routes>
      </main>
      {!hideTabs && (
        <nav className="pb-safe border-t border-line bg-card grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 pt-2.5 pb-1 text-[0.6875rem] font-semibold', isActive ? 'text-brand' : 'text-muted')}>
              <t.icon size={22} />{t.label}
            </NavLink>
          ))}
        </nav>
      )}
    </Frame>
  )
}
