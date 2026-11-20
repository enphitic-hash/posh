import { useState, type ReactNode } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Wallet, Wrench, Users, CreditCard, ShieldCheck, HardHat, Handshake, Scale, Landmark, UserSquare2, MessageSquare, Settings as Cog, LogOut, Menu, X, Wifi, WifiOff, Search, Smartphone, Banknote, Receipt, FileText, ShoppingCart, PieChart, Building2, FileSignature, Truck, Megaphone, IdCard, History } from 'lucide-react'
import { usePrefs } from '../data/prefs'
import { useStore, list } from '../data/store'
import { Avatar, ThemedLogo, LogoH, cx, Card, Btn, inputCls, toast, Field } from '../components/ui'
import { uid, nowIso } from '../lib/format'
import { ThemeQuick, SettingsPanel } from '../components/Settings'
import Dashboard from './Dashboard'
import { Rentals, Tenants, Landlords } from './Rentals'
import Repairs from './Repairs'
import Cards from './Cards'
import { Passports, PassportDetail } from './Passports'
import { Construction, Sales, Valuations, Mortgages, Messages } from './Business'
import { Cashier, Receipts, Invoices, Purchases, Finance, Suppliers } from './Money'
import { Units, Leases, StaffPage, Broadcast, Activity } from './People'

type NavItem = { to: string; label: string; icon: typeof Wallet; end?: boolean }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Money', items: [
    { to: '/office', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/office/cashier', label: 'Cashier', icon: Banknote },
    { to: '/office/receipts', label: 'Receipts register', icon: Receipt },
    { to: '/office/invoices', label: 'Invoices', icon: FileText },
    { to: '/office/purchases', label: 'Purchases & expenses', icon: ShoppingCart },
    { to: '/office/finance', label: 'Finance', icon: PieChart },
  ] },
  { group: 'Rentals', items: [
    { to: '/office/rentals', label: 'Rent & payments', icon: Wallet },
    { to: '/office/units', label: 'Units & vacancies', icon: Building2 },
    { to: '/office/leases', label: 'Leases', icon: FileSignature },
    { to: '/office/tenants', label: 'Tenants', icon: Users },
    { to: '/office/landlords', label: 'Landlords', icon: UserSquare2 },
    { to: '/office/repairs', label: 'Repairs', icon: Wrench },
  ] },
  { group: 'Property', items: [
    { to: '/office/passports', label: 'Posh Passports', icon: ShieldCheck },
    { to: '/office/construction', label: 'Construction', icon: HardHat },
    { to: '/office/sales', label: 'Sales & listings', icon: Handshake },
    { to: '/office/valuations', label: 'Valuations', icon: Scale },
    { to: '/office/mortgages', label: 'Home Finance', icon: Landmark },
    { to: '/office/suppliers', label: 'Suppliers', icon: Truck },
  ] },
  { group: 'Cards & people', items: [
    { to: '/office/cards', label: 'NFC cards & gates', icon: CreditCard },
    { to: '/office/messages', label: 'Messages', icon: MessageSquare },
    { to: '/office/broadcast', label: 'Broadcast', icon: Megaphone },
    { to: '/office/staff', label: 'Staff', icon: IdCard },
    { to: '/office/activity', label: 'Activity log', icon: History },
    { to: '/office/settings', label: 'Settings', icon: Cog },
  ] },
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
  const put = useStore((s) => s.put)
  const set = usePrefs((s) => s.set)
  const staff = list(db, 'staff')
  const [sel, setSel] = useState(staff[0].id)
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Cashier')
  const other = sel === 'other'
  return (
    <div className="min-h-dvh grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white bg-[linear-gradient(160deg,#1A8043,#062E17)]">
        <LogoH dark className="w-48" sub="OFFICE" />
        <div><div className="text-xs font-bold tracking-[.3em] text-[#E3B93A]">POSH OFFICE</div><h1 className="font-serif text-5xl mt-3 leading-tight">Every Posh business on one screen.</h1><p className="text-white/75 mt-4 max-w-md">Rent, cashier and receipts, purchases, invoices, repairs, NFC cards, passports, building sites, sales, valuations and mortgages, live.</p></div>
        <div className="text-sm text-white/60">Posh Properties Ltd · Plot 301 Kira Road, Bukoto</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-sm p-6">
          <ThemedLogo className="w-40" sub="OFFICE" />
          <h2 className="text-xl font-extrabold mt-6">Sign in</h2>
          <form className="space-y-3 mt-4" onSubmit={(e) => {
            e.preventDefault()
            if (pin.length < 4) return toast('Enter any 4-digit PIN', 'warn')
            if (other) {
              if (name.trim().length < 2) return toast('Type your name', 'warn')
              const ex = staff.find((x) => x.name.toLowerCase() === name.trim().toLowerCase())
              if (ex) return set({ officeStaffId: ex.id })
              const id = uid('S')
              put('staff', { id, name: name.trim(), role, email: '', pin, phone: '' })
              put('audit', { id: uid('A'), at: nowIso(), who: name.trim(), action: `New staff sign-in (${role})`, area: 'Staff' })
              return set({ officeStaffId: id })
            }
            put('audit', { id: uid('A'), at: nowIso(), who: db.staff[sel].name, action: 'Signed in to Posh Office', area: 'Login' })
            set({ officeStaffId: sel })
          }}>
            <Field label="Who are you?"><select className={inputCls} value={sel} onChange={(e) => setSel(e.target.value)}>{staff.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.role}</option>)}<option value="other">Someone else (type your name)</option></select></Field>
            {other && <>
              <Field label="Your name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sarah Namuli" autoFocus /></Field>
              <Field label="Role"><select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>{['Cashier', 'Accountant', 'Property manager', 'Sales agent', 'Site manager', 'Front desk', 'Director'].map((r) => <option key={r}>{r}</option>)}</select></Field>
            </>}
            <Field label="PIN" hint="Demo: any 4-digit PIN works"><input className={inputCls} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus={!other} /></Field>
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
    ...list(db, 'payments').filter((p) => p.receipt.toLowerCase().includes(s) || p.ref.toLowerCase().includes(s)).slice(0, 3).map((p) => ({ k: p.id, label: p.receipt, sub: `Payment · ${db.tenants[p.tenantId]?.name}`, to: `/office/receipts?q=${p.receipt}` })),
    ...list(db, 'txns').filter((t) => t.no.toLowerCase().includes(s) || t.party.toLowerCase().includes(s)).slice(0, 4).map((t) => ({ k: t.id, label: `${t.no} · ${t.party}`, sub: `${t.dir === 'in' ? 'Receipt' : 'Voucher'} · ${t.category}`, to: `/office/receipts?q=${t.no}` })),
    ...list(db, 'invoices').filter((i) => i.no.toLowerCase().includes(s) || i.party.toLowerCase().includes(s)).slice(0, 3).map((i) => ({ k: i.id, label: `${i.no} · ${i.party}`, sub: `Invoice · ${i.status}`, to: '/office/invoices' })),
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
      {NAV.map((g) => (<div key={g.group} className="mb-2">
        <div className="px-3 pt-2 pb-1 text-[0.6875rem] font-bold tracking-wider uppercase text-muted/80">{g.group}</div>
        {g.items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setMenu(false)} className={({ isActive }) => cx('flex items-center gap-3 h-9 px-3 rounded-xl text-sm font-semibold transition', isActive ? 'bg-brand text-white' : 'text-muted hover:bg-card-2 hover:text-ink')}>
            <n.icon size={17} />{n.label}
          </NavLink>
        ))}
      </div>))}
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
            <Route path="cashier" element={<Cashier />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="finance" element={<Finance />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="units" element={<Units />} />
            <Route path="leases" element={<Leases />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="broadcast" element={<Broadcast />} />
            <Route path="activity" element={<Activity />} />
            <Route path="settings" element={<div className="max-w-xl"><PageHead title="Settings" sub="Saved on this computer" /><SettingsPanel showReset /></div>} />
            <Route path="*" element={<Navigate to="/office" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
