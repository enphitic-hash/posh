import { useState, type ReactNode } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Wallet, Wrench, Users, CreditCard, ShieldCheck, HardHat, Handshake, Scale, Landmark, UserSquare2, MessageSquare, Settings as Cog, LogOut, Menu, X, Wifi, WifiOff, Search, Smartphone } from 'lucide-react'
import { usePrefs } from '../data/prefs'
import { useStore, list } from '../data/store'
import { Avatar, ThemedLogo, LogoH, cx, Card, Btn, inputCls, toast, Field } from '../components/ui'
import { ThemeQuick, SettingsPanel } from '../components/Settings'
import Dashboard from './Dashboard'
import { Rentals, Tenants, Landlords } from './Rentals'
import Repairs from './Repairs'
import Cards from './Cards'
import { Passports, PassportDetail } from './Passports'
import { Construction, Sales, Valuations, Mortgages, Messages } from './Business'

const NAV = [
  { to: '/office', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/office/rentals', label: 'Rent & payments', icon: Wallet },
  { to: '/office/repairs', label: 'Repairs', icon: Wrench },
  { to: '/office/tenants', label: 'Tenants', icon: Users },
  { to: '/office/landlords', label: 'Landlords', icon: UserSquare2 },
  { to: '/office/cards', label: 'NFC cards & gates', icon: CreditCard },
  { to: '/office/passports', label: 'Posh Passports', icon: ShieldCheck },
  { to: '/office/construction', label: 'Construction', icon: HardHat },
  { to: '/office/sales', label: 'Sales & listings', icon: Handshake },
  { to: '/office/valuations', label: 'Valuations', icon: Scale },
  { to: '/office/mortgages', label: 'Home Finance', icon: Landmark },
  { to: '/office/messages', label: 'Messages', icon: MessageSquare },
  { to: '/office/settings', label: 'Settings', icon: Cog },
]

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>{sub && <div className="text-sm text-muted mt-0.5">{sub}</div>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted border-b border-line">{head.map((h, i) => <th key={i} className="font-semibold py-2.5 px-3 whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&_td]:py-2.5 [&_td]:px-3">{children}</tbody>
      </table>
    </div>
  )
}

function Login() {
  const db = useStore((s) => s.db)
  const set = usePrefs((s) => s.set)
  const staff = list(db, 'staff')
  const [sel, setSel] = useState(staff[0].id)
  const [pin, setPin] = useState('')
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white bg-[linear-gradient(160deg,#1A8043,#062E17)]">
        <LogoH dark className="w-48" sub="OFFICE" />
        <div><div className="text-xs font-bold tracking-[.3em] text-[#E3B93A]">POSH OFFICE</div><h1 className="font-serif text-5xl mt-3 leading-tight">Every Posh business on one screen.</h1><p className="text-white/75 mt-4 max-w-md">Rent, repairs, NFC cards, passports, building sites, sales, valuations and mortgages, live.</p></div>
        <div className="text-sm text-white/60">Posh Properties Ltd · Plot 301 Kira Road, Bukoto</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-6">
          <ThemedLogo className="w-40" sub="OFFICE" />
          <h2 className="text-xl font-extrabold mt-6">Sign in</h2>
          <form className="space-y-3 mt-4" onSubmit={(e) => { e.preventDefault(); const s = db.staff[sel]; if (pin !== s.pin) return toast('Wrong PIN', 'warn'); set({ officeStaffId: s.id }) }}>
            <Field label="Who are you?"><select className={inputCls} value={sel} onChange={(e) => { setSel(e.target.value); setPin('') }}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}</select></Field>
            <Field label="PIN" hint={`Demo PIN: ${db.staff[sel]?.pin}`}><input className={inputCls} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} autoFocus /></Field>
            <Btn block size="lg" type="submit">Sign in</Btn>
          </form>
        </Card>
      </div>
    </div>
  )
}

function GlobalSearch() {
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const s = q.trim().toLowerCase()
  const hits = s.length < 2 ? [] : [
    ...list(db, 'tenants').filter((t) => t.name.toLowerCase().includes(s) || t.phone.replace(/\s/g, '').includes(s.replace(/\s/g, ''))).slice(0, 5).map((t) => ({ k: t.id, label: t.name, sub: `Tenant · ${db.units[t.unitId]?.estate} ${db.units[t.unitId]?.name}`, to: `/office/tenants?id=${t.id}` })),
    ...list(db, 'properties').filter((p) => p.id.toLowerCase().includes(s) || p.title.toLowerCase().includes(s) || p.area.toLowerCase().includes(s)).slice(0, 5).map((p) => ({ k: p.id, label: `${p.id} · ${p.title}`, sub: `Passport · ${p.area}`, to: `/office/passports/${p.id}` })),
    ...list(db, 'payments').filter((p) => p.receipt.toLowerCase().includes(s) || p.ref.toLowerCase().includes(s)).slice(0, 3).map((p) => ({ k: p.id, label: p.receipt, sub: `Payment · ${db.tenants[p.tenantId]?.name}`, to: `/office/rentals?q=${p.receipt}` })),
    ...list(db, 'cards').filter((c) => c.id.toLowerCase().includes(s)).slice(0, 3).map((c) => ({ k: c.id, label: c.id, sub: `Card · ${c.holder}`, to: `/office/cards?q=${c.id}` })),
  ]
  return (
    <div className="relative flex-1 max-w-md">
      <div className="flex items-center gap-2 h-10 rounded-xl border border-line bg-card px-3"><Search size={16} className="text-muted" /><input value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} placeholder="Search tenant, plot, receipt, card or PP number" className="flex-1 bg-transparent outline-none text-sm min-w-0" /></div>
      {open && hits.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-card border border-line rounded-xl shadow-lg overflow-hidden">
          {hits.map((h) => <button key={h.k} onMouseDown={() => { nav(h.to); setQ('') }} className="w-full text-left px-3 py-2 hover:bg-card-2"><div className="text-sm font-semibold">{h.label}</div><div className="text-xs text-muted">{h.sub}</div></button>)}
        </div>
      )}
    </div>
  )
}

export default function Office() {
  const staffId = usePrefs((s) => s.officeStaffId)
  const set = usePrefs((s) => s.set)
  const db = useStore((s) => s.db)
  const status = useStore((s) => s.status)
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const me = staffId ? db.staff[staffId] : undefined
  if (!me) return <Login />
  const side = (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMenu(false)} className={({ isActive }) => cx('flex items-center gap-3 h-10 px-3 rounded-xl text-sm font-semibold transition', isActive ? 'bg-brand text-white' : 'text-muted hover:bg-card-2 hover:text-ink')}>
          <n.icon size={18} />{n.label}
        </NavLink>
      ))}
    </nav>
  )
  return (
    <div className="min-h-dvh flex">
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-line bg-card sticky top-0 h-dvh">
        <div className="px-5 h-16 flex items-center border-b border-line"><ThemedLogo className="w-36" sub="OFFICE" /></div>
        <div className="flex-1 overflow-y-auto">{side}</div>
        <div className="p-3 border-t border-line"><NavLink to="/app" className="flex items-center gap-2 text-sm text-muted hover:text-ink px-3 h-9"><Smartphone size={16} />Open the Posh app</NavLink></div>
      </aside>
      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden bg-black/40" onClick={() => setMenu(false)}>
          <aside className="w-72 h-full bg-card overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 h-16 flex items-center justify-between border-b border-line"><ThemedLogo className="w-32" sub="OFFICE" /><button onClick={() => setMenu(false)}><X /></button></div>
            {side}
          </aside>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 flex items-center gap-3 px-4 lg:px-6 border-b border-line bg-bg/90 backdrop-blur">
          <button className="lg:hidden w-10 h-10 grid place-items-center" onClick={() => setMenu(true)} aria-label="Menu"><Menu /></button>
          <GlobalSearch />
          <div className="flex-1" />
          <span className={cx('hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 h-7 rounded-full', status === 'live' ? 'bg-brand-soft text-brand' : 'bg-gold-soft text-gold')}>{status === 'live' ? <><span className="w-2 h-2 rounded-full bg-brand animate-pulse" /><Wifi size={14} />Live</> : <><WifiOff size={14} />Offline</>}</span>
          <ThemeQuick />
          <div className="hidden md:flex items-center gap-2"><Avatar name={me.name} size={34} /><div className="leading-tight"><div className="text-sm font-semibold">{me.name}</div><div className="text-xs text-muted">{me.role}</div></div></div>
          <button onClick={() => set({ officeStaffId: undefined })} className="w-10 h-10 grid place-items-center rounded-full hover:bg-card-2" aria-label="Sign out" title="Sign out"><LogOut size={18} /></button>
        </header>
        <main key={loc.pathname} className="flex-1 p-4 lg:p-6 anim-rise">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="rentals" element={<Rentals />} />
            <Route path="repairs" element={<Repairs />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="landlords" element={<Landlords />} />
            <Route path="cards" element={<Cards />} />
            <Route path="passports" element={<Passports />} />
            <Route path="passports/:id" element={<PassportDetail />} />
            <Route path="construction" element={<Construction />} />
            <Route path="sales" element={<Sales />} />
            <Route path="valuations" element={<Valuations />} />
            <Route path="mortgages" element={<Mortgages />} />
            <Route path="messages" element={<Messages />} />
            <Route path="settings" element={<div className="max-w-xl"><PageHead title="Settings" sub="Saved on this computer" /><SettingsPanel showReset /></div>} />
            <Route path="*" element={<Navigate to="/office" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
