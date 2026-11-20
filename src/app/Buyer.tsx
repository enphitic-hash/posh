import { useMemo, useState } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom'
import { Search, Heart, Sparkles, BadgeCheck, Home as HomeIcon, MessageCircle, MapPin, BedDouble, Bath, ShieldCheck, Calendar, CheckCircle2, Circle, Landmark, SlidersHorizontal } from 'lucide-react'
import { create } from 'zustand'
import { useStore, list } from '../data/store'
import { usePrefs } from '../data/prefs'
import type { Listing } from '../data/types'
import { matchListings, parseQuery, poshWa } from '../lib/logic'
import { ugx, ugxShort, nowIso, uid, num } from '../lib/format'
import { Card, Btn, Badge, Chips, PhotoTile, Section, Field, inputCls, toast, cx, Empty, Sheet } from '../components/ui'
import { TopBar, Screen, NfcButton } from './MobileApp'

const KIND_LABEL = ['Rent', 'Buy', 'Land', 'Commercial', 'Short stay'] as const
type K = (typeof KIND_LABEL)[number]

const useSaved = create<{ ids: string[]; toggle: (id: string) => void }>((set, get) => ({
  ids: (() => { try { return JSON.parse(localStorage.getItem('posh.saved') || '[]') } catch { return [] } })(),
  toggle: (id) => { const ids = get().ids.includes(id) ? get().ids.filter((x) => x !== id) : [...get().ids, id]; set({ ids }); try { localStorage.setItem('posh.saved', JSON.stringify(ids)) } catch { /* */ } },
}))

export const price = (l: Listing) => l.per === 'mo' ? `${ugxShort(l.price)}/mo` : l.per === 'night' ? `${ugxShort(l.price)}/night` : ugxShort(l.price)

export function ListingCard({ l, why }: { l: Listing; why?: string[] }) {
  const nav = useNavigate()
  const { ids, toggle } = useSaved()
  const saved = ids.includes(l.id)
  return (
    <Card onClick={() => nav(`/app/listing/${l.id}`)} className="overflow-hidden">
      <PhotoTile hue={l.hue} className="h-36">
        <div className="absolute top-2 left-2 flex gap-1">{l.tag && <Badge tone="dark" className="!bg-white !text-black">{l.tag}</Badge>}{l.verified && <Badge className="!bg-brand !text-white"><BadgeCheck size={12} />Posh Verified</Badge>}</div>
        <button onClick={(e) => { e.stopPropagation(); toggle(l.id) }} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-white grid place-items-center" aria-label="Save"><Heart size={16} className={saved ? 'fill-posh-red text-posh-red' : 'text-posh-red'} /></button>
        <HomeIcon className="absolute left-3 bottom-3 text-white/90" size={28} />
      </PhotoTile>
      <div className="p-3 flex justify-between gap-2">
        <div className="min-w-0"><div className="font-bold truncate">{l.title} · {l.area}</div><div className="text-xs text-muted truncate">{l.features.slice(0, 3).join(' · ')}</div>{why && why.length > 0 && <div className="text-[11px] text-brand mt-0.5 truncate">✓ {why.join(' · ')}</div>}</div>
        <div className="font-extrabold text-brand whitespace-nowrap text-sm">{price(l)}</div>
      </div>
    </Card>
  )
}

function SearchTab() {
  const db = useStore((s) => s.db)
  const [kind, setKind] = useState<K>('Rent')
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('Ntinda, 3 bed, under 3m a month')
  const [verified, setVerified] = useState(false)
  const query = useMemo(() => parseQuery(applied), [applied])
  const matches = useMemo(() => matchListings(db, query, kind), [db, query, kind])
  const shown = matches.filter((m) => !verified || m.l.verified)
  const effKind = (query.kind ?? kind) as K
  const all = list(db, 'listings').filter((l) => l.kind === effKind && (!verified || l.verified))
  const rest = all.filter((l) => !shown.some((m) => m.l.id === l.id))
  return (<>
    <TopBar title="Find your home" sub="Posh Properties · Kampala" right={<NfcButton />} />
    <Screen>
      <form onSubmit={(e) => { e.preventDefault(); setApplied(q || applied); const pk = parseQuery(q).kind; if (pk) setKind(pk as K) }} className="flex items-center gap-2 bg-card border border-line rounded-2xl px-3 h-12">
        <Search size={18} className="text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={applied} className="flex-1 bg-transparent outline-none text-sm" aria-label="Describe the home you want" />
        <button type="button" onClick={() => setVerified(!verified)} aria-label="Posh Verified only" className={cx('p-1.5 rounded-lg', verified && 'bg-brand-soft text-brand')}><SlidersHorizontal size={18} /></button>
      </form>
      <Chips className="mt-3" options={KIND_LABEL} value={effKind} onChange={(k) => { setKind(k); setApplied(applied.replace(/\b(buy|rent|plot|land|shop|office|night)\b/gi, '')) }} />
      {verified && <div className="text-xs text-brand font-semibold mt-2 flex items-center gap-1"><BadgeCheck size={14} />Showing Posh Verified only</div>}
      {shown.length > 0 && (
        <div className="mt-4 rounded-2xl border border-brand/30 bg-brand-soft p-3 flex gap-3">
          <span className="w-9 h-9 rounded-xl bg-brand text-white grid place-items-center shrink-0"><Sparkles size={18} /></span>
          <div><div className="font-bold text-brand">{shown.length} home{shown.length > 1 ? 's' : ''} match you</div><div className="text-xs text-muted">{describe(query, effKind)}</div></div>
        </div>
      )}
      <div className="space-y-3 mt-3">
        {shown.map((m) => <ListingCard key={m.l.id} l={m.l} why={m.why} />)}
        {rest.length > 0 && <div className="text-sm font-bold pt-2">More {effKind.toLowerCase()} listings</div>}
        {rest.map((l) => <ListingCard key={l.id} l={l} />)}
        {shown.length + rest.length === 0 && <Empty>No listings yet.</Empty>}
      </div>
    </Screen>
  </>)
}
function describe(q: ReturnType<typeof parseQuery>, kind: string) {
  const bits = [q.beds && `${q.beds}-bed`, kind === 'Rent' ? 'to rent' : kind === 'Buy' ? 'to buy' : kind.toLowerCase(), q.area && `in ${q.area[0].toUpperCase() + q.area.slice(1)}`, q.max && `under ${ugxShort(q.max)}`, ...q.words.map((w) => (w === 'school' ? 'near schools' : `with ${w}`))].filter(Boolean)
  return `Posh AI read your search as: ${bits.join(', ')}.`
}

function ListingDetail() {
  const { id } = useParams()
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const { ids, toggle } = useSaved()
  const l = db.listings[id!]
  if (!l) return <Navigate to="/app/search" replace />
  const p = l.propertyId ? db.properties[l.propertyId] : undefined
  return (<>
    <div className="relative">
      <PhotoTile hue={l.hue} className="h-64 pt-safe"><HomeIcon className="absolute left-5 bottom-5 text-white" size={40} /></PhotoTile>
      <button onClick={() => nav(-1)} className="absolute top-4 left-4 mt-[env(safe-area-inset-top)] h-10 px-3 rounded-full bg-white/90 text-black font-semibold text-sm">← Back</button>
      <button onClick={() => toggle(l.id)} className="absolute top-4 right-4 mt-[env(safe-area-inset-top)] w-10 h-10 rounded-full bg-white/90 grid place-items-center"><Heart size={18} className={ids.includes(l.id) ? 'fill-posh-red text-posh-red' : 'text-posh-red'} /></button>
    </div>
    <Screen className="pt-4">
      <div className="flex justify-between gap-3"><h1 className="text-2xl font-extrabold">{l.title}</h1><div className="text-xl font-extrabold text-brand whitespace-nowrap">{price(l)}</div></div>
      <div className="text-muted flex items-center gap-1 mt-1"><MapPin size={16} />{l.area}, Kampala</div>
      <div className="flex gap-4 mt-3 text-sm">{l.beds && <span className="flex items-center gap-1"><BedDouble size={18} />{l.beds} beds</span>}{l.baths && <span className="flex items-center gap-1"><Bath size={18} />{l.baths} baths</span>}</div>
      <div className="flex flex-wrap gap-2 mt-3">{l.features.map((f) => <Badge key={f}>{f}</Badge>)}</div>
      <p className="mt-4 text-sm text-muted">{l.description}</p>
      {p ? (
        <Card onClick={() => nav(`/p/${p.id}`)} className="p-4 mt-4 flex items-center gap-3">
          <ShieldCheck className="text-brand" size={28} />
          <div className="flex-1"><div className="font-bold">Posh Passport {p.id}</div><div className="text-xs text-muted">Title {p.titleStatus.toLowerCase()} · valued {ugxShort(p.value)} · {p.timeline.length} records</div></div>
          <span className="text-brand text-sm font-semibold">Open</span>
        </Card>
      ) : !l.verified && <div className="mt-4 text-sm text-gold bg-gold-soft rounded-xl p-3">Not yet Posh Verified: title check pending.</div>}
      {l.kind === 'Buy' && <Card className="p-4 mt-3 flex items-center gap-3"><Landmark className="text-gold" /><div className="flex-1 text-sm"><b>Posh Home Finance</b><div className="text-muted">About {ugx(Math.round(l.price * 0.7 * (0.155 / 12) / (1 - Math.pow(1 + 0.155 / 12, -180))))}/month over 15 years</div></div><Btn size="sm" variant="soft" onClick={() => nav('/app/finance')}>Check</Btn></Card>}
      <div className="text-xs text-muted mt-4">Agent: {l.agent} · No viewing fees at Posh</div>
      <Btn block size="lg" className="mt-3" icon={<MessageCircle size={18} />} onClick={() => nav(`/app/book/${l.id}`)}>Book a viewing on WhatsApp</Btn>
    </Screen>
  </>)
}

function dayChips() {
  const out: { label: string; key: string }[] = []
  const d = new Date()
  for (let i = 1; out.length < 5; i++) {
    const x = new Date(d.getTime() + i * 864e5)
    if (x.getDay() === 0) continue
    out.push({ key: x.toISOString().slice(0, 10), label: x.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Kampala' }) })
  }
  return out
}

function Book() {
  const { id } = useParams()
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const { app, set } = usePrefs()
  const nav = useNavigate()
  const l = db.listings[id!]
  const days = useMemo(dayChips, [])
  const [day, setDay] = useState(days[1]?.label ?? days[0].label)
  const [time, setTime] = useState('11:30')
  const [name, setName] = useState(app.buyerName ?? '')
  const [phone, setPhone] = useState(app.buyerPhone ?? '')
  const [done, setDone] = useState<string | null>(null)
  if (!l) return <Navigate to="/app/search" replace />
  const taken = (t: string) => list(db, 'viewings').some((v) => v.listingId === l.id && v.date === day && v.time === t && v.status !== 'Cancelled')
  const submit = () => {
    if (!name.trim() || phone.replace(/\D/g, '').length < 9) return toast('Add your name and phone', 'warn')
    const v = { id: uid('V'), listingId: l.id, name: name.trim(), phone, date: day, time, status: 'Requested' as const, createdAt: nowIso(), agent: l.agent }
    put('viewings', v)
    put('deals', { id: uid('D'), client: v.name, phone, listingId: l.id, title: `${l.title} · ${l.area}`, stage: 'Viewing', value: l.per ? l.price * 12 * 0.1 : l.price * 0.05, agent: l.agent, updated: nowIso(), source: 'App' })
    set({ app: { ...app, buyerName: v.name, buyerPhone: phone } })
    const text = `Hello Posh Properties, I'd like to view the ${l.title} in ${l.area} (${price(l)}, ref ${l.id}) on ${day} at ${time}. My name is ${v.name}, ${phone}.`
    setDone(text)
  }
  return (<>
    <TopBar back title="Book a free viewing" sub={`${l.title} · ${l.area}`} />
    <Screen className="space-y-4">
      <div className="rounded-2xl bg-brand-soft text-brand p-3 text-sm font-semibold">No viewing fees at Posh.</div>
      <div><div className="text-sm font-semibold text-muted mb-2">Day</div><Chips options={days.map((d) => d.label)} value={day} onChange={setDay} /></div>
      <div><div className="text-sm font-semibold text-muted mb-2">Time</div>
        <div className="grid grid-cols-4 gap-2">{['09:00', '10:00', '11:30', '13:00', '14:30', '15:30', '16:30', '17:30'].map((t) => <button key={t} disabled={taken(t)} onClick={() => setTime(t)} className={cx('h-10 rounded-xl border text-sm font-semibold disabled:opacity-30 disabled:line-through', time === t ? 'bg-brand text-white border-brand' : 'bg-card border-line')}>{t}</button>)}</div>
      </div>
      <Field label="Your name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Phone (WhatsApp)"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+256 7xx xxx xxx" /></Field>
      <Card className="p-3 text-sm flex gap-2"><ShieldCheck size={18} className="text-brand shrink-0" />When you arrive, tap your phone on the Posh plaque at the gate to see the property's passport.</Card>
      <Btn block size="lg" icon={<Calendar size={18} />} onClick={submit}>Book {day}, {time}</Btn>
    </Screen>
    <Sheet open={!!done} onClose={() => { setDone(null); nav('/app/viewings', { replace: true }) }} title="Viewing requested">
      <div className="text-center">
        <CheckCircle2 size={48} className="mx-auto text-brand" />
        <p className="mt-2 text-sm text-muted">Posh has your booking for <b className="text-ink">{day}, {time}</b>. Send it on WhatsApp so {l.agent.split(' ')[0]} confirms it straight away.</p>
        <Btn block size="lg" className="mt-4 !bg-[#25D366]" icon={<MessageCircle size={18} />} onClick={() => { window.open(poshWa(done!), '_blank'); setDone(null); nav('/app/viewings', { replace: true }) }}>Send on WhatsApp</Btn>
      </div>
    </Sheet>
  </>)
}

function Saved() {
  const db = useStore((s) => s.db)
  const ids = useSaved((s) => s.ids)
  const ls = ids.map((i) => db.listings[i]).filter(Boolean)
  return (<><TopBar title="Saved" /><Screen className="space-y-3">{ls.length === 0 ? <Empty>Tap ♡ on a listing to save it here.</Empty> : ls.map((l) => <ListingCard key={l.id} l={l} />)}</Screen></>)
}

function Viewings() {
  const db = useStore((s) => s.db)
  const app = usePrefs((s) => s.app)
  const patch = useStore((s) => s.patch)
  const vs = list(db, 'viewings').filter((v) => !app.buyerPhone || v.phone === app.buyerPhone).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (<>
    <TopBar title="Viewings" sub={app.buyerName ? `For ${app.buyerName}` : 'All viewings'} />
    <Screen className="space-y-2">
      {vs.length === 0 && <Empty>No viewings yet. Book one from any listing.</Empty>}
      {vs.map((v) => { const l = db.listings[v.listingId]; return (
        <Card key={v.id} className="p-3 flex items-center gap-3">
          <PhotoTile hue={l?.hue ?? 140} className="w-14 h-14 rounded-xl" />
          <div className="flex-1 min-w-0"><div className="font-bold truncate">{l?.title} · {l?.area}</div><div className="text-xs text-muted">{v.date}, {v.time} · {v.agent}</div></div>
          <div className="flex flex-col items-end gap-1"><Badge tone={v.status === 'Confirmed' ? 'green' : v.status === 'Cancelled' ? 'red' : 'blue'}>{v.status}</Badge>{v.status !== 'Cancelled' && v.status !== 'Done' && <button className="text-xs text-muted underline" onClick={() => patch('viewings', v.id, { status: 'Cancelled' })}>Cancel</button>}</div>
        </Card>) })}
    </Screen>
  </>)
}

function Finance() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const m = db.mortgages['PHF-2291']
  const [priceV, setPrice] = useState(780000000)
  const [dep, setDep] = useState(30)
  const [years, setYears] = useState(15)
  const loan = priceV * (1 - dep / 100)
  const monthly = (rate: number) => { const r = rate / 100 / 12; return (loan * r) / (1 - Math.pow(1 + r, -years * 12)) }
  const steps = ['Documents', 'Title and valuation', 'Bank offers', 'Sign offer and sale agreement', 'Keys, title transfer, plaque re-registered']
  return (<>
    <TopBar title="Posh Home Finance" sub="Mortgages with 3 partner banks" />
    <Screen className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="font-bold">How much can I borrow?</div>
        <Field label={`Home price · ${ugxShort(priceV)}`}><input type="range" min={100e6} max={3e9} step={10e6} value={priceV} onChange={(e) => setPrice(+e.target.value)} className="w-full accent-[var(--brand)]" /></Field>
        <Field label={`Deposit · ${dep}% (${ugxShort(priceV * dep / 100)})`}><input type="range" min={10} max={60} value={dep} onChange={(e) => setDep(+e.target.value)} className="w-full accent-[var(--brand)]" /></Field>
        <Chips options={['10', '15', '20']} value={String(years)} onChange={(v) => setYears(+v)} />
        <div className="grid grid-cols-3 gap-2 text-center">{[['Stanbic', 15.5], ['Absa', 16.25], ['dfcu', 16.5]].map(([b, r]) => <div key={b} className="rounded-xl bg-card-2 p-2"><div className="text-xs text-muted">{b} {r}%</div><div className="font-bold text-sm">{ugxShort(monthly(r as number))}/mo</div></div>)}</div>
      </Card>
      {m && (<>
        <Section title={`Your application ${m.id}`}>
          <Card className="p-4">
            <div className="text-sm text-muted">{db.properties[m.propertyId]?.title} · {db.properties[m.propertyId]?.area}</div>
            <div className="text-2xl font-extrabold mt-1">{ugx(m.amount)}</div>
            <div className="text-xs text-muted">Pre-approved · 70% of value · {m.years} years</div>
            <div className="mt-4 space-y-3">{steps.map((s, i) => <div key={s} className="flex items-center gap-3 text-sm">{i + 1 < m.step ? <CheckCircle2 className="text-brand" size={20} /> : i + 1 === m.step ? <span className="w-5 h-5 rounded-full border-[5px] border-brand" /> : <Circle className="text-line" size={20} />}<span className={cx(i + 1 === m.step && 'font-bold')}>{s}</span><span className="ml-auto text-xs text-muted">{i + 1 < m.step ? 'Done' : i + 1 === m.step ? 'Now' : 'Next'}</span></div>)}</div>
          </Card>
        </Section>
        <Section title="Bank offers">
          <div className="space-y-2">{m.offers.map((o) => (
            <Card key={o.bank} className={cx('p-4 flex items-center gap-3', o.chosen && 'ring-2 ring-brand')}>
              <Landmark className="text-muted" />
              <div className="flex-1"><div className="font-bold">{o.bank} · {o.rate}%</div><div className="text-xs text-muted">{ugx(o.monthly)} a month</div></div>
              {o.chosen ? <Badge tone="green">Chosen</Badge> : <Btn size="sm" onClick={() => { patch('mortgages', m.id, { offers: m.offers.map((x) => ({ ...x, chosen: x.bank === o.bank })), step: Math.max(m.step, 4) }); toast(`${o.bank} offer chosen. Posh will prepare the papers.`) }}>Choose</Btn>}
            </Card>))}</div>
        </Section>
      </>)}
      <div className="text-xs text-muted text-center">Monthly figures are estimates · {num(dep)}% deposit · rates from partner banks</div>
    </Screen>
  </>)
}

export default function Buyer() {
  return (
    <Routes>
      <Route path="search" element={<SearchTab />} />
      <Route path="listing/:id" element={<ListingDetail />} />
      <Route path="book/:id" element={<Book />} />
      <Route path="saved" element={<Saved />} />
      <Route path="viewings" element={<Viewings />} />
      <Route path="finance" element={<Finance />} />
      <Route path="*" element={<Navigate to="/app/search" replace />} />
    </Routes>
  )
}
