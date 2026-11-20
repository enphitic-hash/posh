import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, MessageCircle, CheckCircle2, Camera, AlertCircle, Users, Package } from 'lucide-react'
import { useStore, list } from '../data/store'
import type { Deal, Listing, Valuation } from '../data/types'
import { ugx, ugxShort, fmtDate, fmtDT, fmtTime, ago, nowIso, uid } from '../lib/format'
import { sendMessage, waLink } from '../lib/logic'
import { Card, Stat, Badge, Btn, Progress, statusTone, Sheet, Field, inputCls, toast, cx, Chips, PhotoTile } from '../components/ui'
import { PageHead, Table } from './Office'
import { price } from '../app/Buyer'
import { TxnFlow, type TxnPreset } from './Money'

export function Construction() {
  const db = useStore((s) => s.db)
  const [sp, setSp] = useSearchParams()
  const sites = list(db, 'sites')
  const sel = sp.get('id') ? db.sites[sp.get('id')!] : undefined
  const workers = list(db, 'workers')
  const [pay, setPay] = useState<{ preset: TxnPreset; siteId: string; stage: string } | null>(null)
  return (<>
    <PageHead title="Construction" sub={`${sites.length} active sites · ${sites.filter((s) => s.daysLate).length} behind`} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat label="Active sites" value={sites.length} />
      <Stat label="Workers on site today" value={workers.filter((w) => w.in && !w.out).length + 182} sub="clocked in by card" />
      <Stat label="Contract value" value={ugxShort(sites.reduce((a, s) => a + s.budget, 0))} />
      <Stat label="Open site issues" value={sites.reduce((a, s) => a + s.issues.filter((i) => i.open).length, 0)} tone="down" sub="reported from the site app" />
    </div>
    <Card className="mt-4">
      <Table head={['Site', 'Client', 'Manager', 'Progress', 'Paid', 'Handover', 'Status']}>
        {sites.map((s) => <tr key={s.id} className="hover:bg-card-2 cursor-pointer" onClick={() => setSp({ id: s.id })}><td className="font-semibold">{s.name}</td><td>{s.client}</td><td className="text-muted">{s.manager}</td><td className="w-40"><div className="flex items-center gap-2"><Progress value={s.progress} tone={s.daysLate ? 'red' : 'green'} /><span className="text-xs">{s.progress}%</span></div></td><td>{ugxShort(s.paid)}</td><td className="text-muted">{fmtDate(s.handover, { month: 'short', year: 'numeric' })}</td><td><Badge tone={s.daysLate ? 'red' : 'green'}>{s.daysLate ? `${s.daysLate} days late` : 'On schedule'}</Badge></td></tr>)}
      </Table>
    </Card>
    <Sheet wide open={!!sel} onClose={() => setSp({})} title={sel?.name}>{sel && (() => {
      const ws = workers.filter((w) => w.siteId === sel.id)
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-4 gap-2 text-sm">
            <Card className="p-3"><div className="text-xs text-muted">Progress</div><b>{sel.progress}%</b></Card>
            <Card className="p-3"><div className="text-xs text-muted">Budget</div><b>{ugxShort(sel.budget)}</b></Card>
            <Card className="p-3"><div className="text-xs text-muted">Paid</div><b>{ugxShort(sel.paid)}</b></Card>
            <Card className="p-3"><div className="text-xs text-muted">Photos</div><b>{sel.photos}</b></Card>
          </div>
          <Field label={`Progress: ${sel.progress}%`}><input type="range" min={0} max={100} value={sel.progress} onChange={(e) => useStore.getState().patch('sites', sel.id, { progress: +e.target.value })} className="w-full accent-[var(--brand)]" /></Field>
          {sel.stages.length > 0 && <div><div className="font-bold text-sm mb-1">Stage payments</div><Table head={['Stage', 'Amount', 'Status', 'Paid']}>{sel.stages.map((st) => <tr key={st.name}><td>{st.name}</td><td>{ugx(st.amount)}</td><td><Badge tone={statusTone(st.status)}>{st.status}</Badge></td><td className="text-muted text-xs">{st.paidOn ? `${fmtDate(st.paidOn)} · ${st.method}` : st.status !== 'Paid' ? <Btn size="sm" onClick={() => setPay({ siteId: sel.id, stage: st.name, preset: { category: 'Construction stage', business: 'Construction', party: sel.client, phone: sel.clientPhone, propertyId: sel.propertyId, lines: [{ desc: `${st.name} stage · ${sel.name}`, qty: 1, price: st.amount }] } })}>Take payment</Btn> : ''}</td></tr>)}</Table></div>}
          {ws.length > 0 && <div><div className="font-bold text-sm mb-1 flex items-center gap-1"><Users size={14} />Crew today ({ws.filter((w) => w.in && !w.out).length}/{ws.length})</div><div className="flex flex-wrap gap-1">{ws.map((w) => <Badge key={w.id} tone={w.in && !w.out ? (w.late ? 'red' : 'green') : 'gray'}>{w.name.split(' ')[1] ?? w.name} {w.in ? fmtTime(w.in) : ''}</Badge>)}</div></div>}
          {sel.materials.length > 0 && <div><div className="font-bold text-sm mb-1 flex items-center gap-1"><Package size={14} />Materials</div><div className="flex flex-wrap gap-1">{sel.materials.map((m, i) => <Badge key={i} tone={statusTone(m.status)}>{m.item} · {m.qty} · {m.status}</Badge>)}</div></div>}
          <div><div className="font-bold text-sm mb-1 flex items-center gap-1"><AlertCircle size={14} />Issues</div>{sel.issues.length ? sel.issues.map((i) => <div key={i.id} className="flex gap-2 items-center text-sm py-1">{i.photo && <img src={i.photo} alt="" className="w-10 h-10 rounded object-cover" />}<span className="flex-1">{i.text}</span><span className="text-xs text-muted">{ago(i.at)}</span><Badge tone={i.open ? 'red' : 'green'}>{i.open ? 'Open' : 'Resolved'}</Badge></div>) : <div className="text-sm text-muted">None</div>}</div>
          <div><div className="font-bold text-sm mb-1 flex items-center gap-1"><Camera size={14} />Updates to client</div>{sel.updates.map((u, i) => <div key={i} className="flex gap-2 text-sm py-1">{u.photo ? <img src={u.photo} alt="" className="w-10 h-10 rounded object-cover" /> : <PhotoTile hue={35} className="w-10 h-10 rounded" />}<div><div>{u.text}</div><div className="text-xs text-muted">{fmtDT(u.at)}</div></div></div>)}{!sel.updates.length && <div className="text-sm text-muted">None yet</div>}</div>
          <Btn variant="outline" icon={<MessageCircle size={16} />} onClick={() => window.open(waLink(sel.clientPhone, `Hello ${sel.client}, update from Posh Construction on ${sel.name}: ${sel.progress}% complete.`), '_blank')}>WhatsApp the client</Btn>
        </div>)
    })()}</Sheet>
    <TxnFlow open={!!pay} dir="in" preset={pay?.preset} onClose={() => setPay(null)} onSaved={(t) => { if (!pay) return; const site = useStore.getState().db.sites[pay.siteId]; useStore.getState().patch('sites', site.id, { paid: site.paid + t.paid, stages: site.stages.map((x) => (x.name === pay.stage ? { ...x, status: t.paid >= x.amount ? 'Paid' : 'Due', paidOn: t.paid >= x.amount ? t.at : undefined, method: t.method } : x)), updates: [...site.updates, { at: t.at, text: `Payment received: ${ugx(t.paid)} for ${pay.stage} (receipt ${t.no}). Thank you!` }] }); sendMessage({ to: site.client, phone: site.clientPhone, channel: 'WhatsApp', kind: 'receipt', text: `Posh Construction: we received ${ugx(t.paid)} for ${pay.stage} on ${site.name}. Receipt ${t.no}.` }) }} />
  </>)
}

const STAGES: Deal['stage'][] = ['Enquiry', 'Viewing', 'Offer', 'Closed']
export function Sales() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const last = useStore((s) => s.lastChange)
  const [tab, setTab] = useState<'Pipeline' | 'Viewings' | 'Listings'>('Pipeline')
  const [add, setAdd] = useState(false)
  const [pay, setPay] = useState<TxnPreset | null>(null)
  const deals = list(db, 'deals').sort((a, b) => b.updated.localeCompare(a.updated))
  const views = list(db, 'viewings').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (<>
    <PageHead title="Sales & listings" sub={`${deals.length} deals · ${views.filter((v) => v.status === 'Requested').length} viewings to confirm`} actions={<><Chips options={['Pipeline', 'Viewings', 'Listings'] as const} value={tab} onChange={setTab} />{tab === 'Listings' && <Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>New listing</Btn>}</>} />
    {tab === 'Pipeline' && (
      <div className="grid grid-flow-col auto-cols-[minmax(250px,1fr)] gap-3 overflow-x-auto pb-3">
        {STAGES.map((st) => { const ds = deals.filter((d) => d.stage === st); return (
          <div key={st} className="bg-card-2 rounded-2xl p-2">
            <div className="flex justify-between px-2 py-1.5"><b className="text-sm">{st}</b><span className="text-xs text-muted">{ds.length} · {ugxShort(ds.reduce((a, d) => a + d.value, 0))} fees</span></div>
            <div className="space-y-2 max-h-[560px] overflow-y-auto">{ds.map((d) => (
              <Card key={d.id} className={cx('p-3', last?.id === d.id && 'flash')}>
                <div className="font-semibold text-sm">{d.client}</div>
                <div className="text-xs text-muted">{d.title}</div>
                <div className="flex items-center gap-1 mt-2"><Badge>{d.source}</Badge><span className="text-xs text-muted ml-auto">{ago(d.updated)}</span></div>
                {st !== 'Closed' && <div className="flex gap-1 mt-2"><Btn size="sm" variant="soft" onClick={() => { patch('deals', d.id, { stage: STAGES[STAGES.indexOf(st) + 1], updated: nowIso() }); toast(`${d.client} moved to ${STAGES[STAGES.indexOf(st) + 1]}`) }}>→ {STAGES[STAGES.indexOf(st) + 1]}</Btn><Btn size="sm" variant="ghost" onClick={() => window.open(waLink(d.phone, `Hello ${d.client}, this is Posh Properties about the ${d.title}.`), '_blank')}><MessageCircle size={14} /></Btn></div>}
                {(st === 'Offer' || st === 'Closed') && <Btn size="sm" variant={st === 'Closed' ? 'soft' : 'outline'} className="mt-2 w-full" onClick={() => { const l = d.listingId ? db.listings[d.listingId] : undefined; const rent = l?.kind === 'Rent' || l?.kind === 'Short stay'; setPay({ category: rent ? 'Security deposit' : l?.kind === 'Land' ? 'Plot sale' : st === 'Closed' ? 'Sales commission' : 'Property sale deposit', business: rent ? 'Management' : 'Sales', party: d.client, phone: d.phone, propertyId: l?.propertyId, lines: [{ desc: `${st === 'Closed' && !rent ? 'Commission' : rent ? 'Deposit and first month' : 'Deposit'} · ${d.title}`, qty: 1, price: rent ? (l?.price ?? d.value) * 2 : st === 'Closed' ? d.value : Math.round(((l?.price ?? d.value * 33) * 0.1) / 100000) * 100000 }] }) }}>Take payment · receipt</Btn>}
              </Card>))}</div>
          </div>) })}
      </div>
    )}
    {tab === 'Viewings' && (
      <Card><Table head={['Booked', 'Client', 'Listing', 'When', 'Agent', 'Status', '']}>
        {views.map((v) => { const l = db.listings[v.listingId]; return <tr key={v.id} className={cx(last?.id === v.id && 'flash')}><td className="text-muted text-xs">{ago(v.createdAt)}</td><td className="font-semibold">{v.name}<div className="text-xs text-muted">{v.phone}</div></td><td>{l?.title} · {l?.area}</td><td className="whitespace-nowrap">{v.date}, {v.time}</td><td className="text-muted">{v.agent}</td><td><Badge tone={statusTone(v.status)}>{v.status}</Badge></td><td className="whitespace-nowrap">{v.status === 'Requested' && <Btn size="sm" onClick={() => { patch('viewings', v.id, { status: 'Confirmed' }); sendMessage({ to: v.name, phone: v.phone, channel: 'WhatsApp', kind: 'viewing', text: `Posh: your viewing of the ${l?.title} in ${l?.area} is confirmed for ${v.date}, ${v.time}. ${v.agent} will meet you. Tap the Posh plaque at the gate when you arrive.` }); toast('Confirmed · client told on WhatsApp') }}>Confirm</Btn>}{v.status === 'Confirmed' && <Btn size="sm" variant="outline" onClick={() => patch('viewings', v.id, { status: 'Done' })}>Done</Btn>}</td></tr> })}
      </Table></Card>
    )}
    {tab === 'Listings' && (
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">{list(db, 'listings').map((l) => (
        <Card key={l.id} className="overflow-hidden"><PhotoTile hue={l.hue} className="h-28">{l.verified && <Badge className="absolute top-2 left-2 !bg-brand !text-white">Verified</Badge>}</PhotoTile><div className="p-3"><div className="font-semibold text-sm">{l.title} · {l.area}</div><div className="text-xs text-muted">{l.kind} · {l.id}</div><div className="font-bold text-brand mt-1">{price(l)}</div><div className="text-xs text-muted mt-1">{views.filter((v) => v.listingId === l.id).length} viewings · {deals.filter((d) => d.listingId === l.id).length} leads</div></div></Card>))}</div>
    )}
    <NewListing open={add} onClose={() => setAdd(false)} />
    <TxnFlow open={!!pay} dir="in" preset={pay ?? undefined} onClose={() => setPay(null)} />
  </>)
}

function NewListing({ open, onClose }: { open: boolean; onClose: () => void }) {
  const put = useStore((s) => s.put)
  const [f, setF] = useState({ title: '', kind: 'Rent' as Listing['kind'], area: '', beds: '3', price: '', features: '' })
  const save = () => {
    if (!f.title || !f.area || !f.price) return toast('Fill title, area and price', 'warn')
    const l: Listing = { id: uid('LS'), title: f.title, kind: f.kind, area: f.area, beds: +f.beds || undefined, price: +f.price.replace(/\D/g, ''), per: f.kind === 'Rent' || f.kind === 'Commercial' ? 'mo' : f.kind === 'Short stay' ? 'night' : undefined, features: f.features.split(',').map((x) => x.trim()).filter(Boolean), verified: true, hue: Math.floor(Math.random() * 200), tag: 'New', agent: 'Diana Atuhaire', description: `${f.title} in ${f.area}. Listed by Posh Properties.` }
    put('listings', l); toast('Listing is live in the Posh app'); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="New listing">
      <div className="space-y-3">
        <Field label="Title"><input className={inputCls} placeholder="3-bed apartment" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Listing['kind'] })}>{['Rent', 'Buy', 'Land', 'Commercial', 'Short stay'].map((k) => <option key={k}>{k}</option>)}</select></Field><Field label="Area"><input className={inputCls} placeholder="Ntinda" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field></div>
        <div className="grid grid-cols-2 gap-3"><Field label="Beds"><input className={inputCls} value={f.beds} onChange={(e) => setF({ ...f, beds: e.target.value })} /></Field><Field label="Price (UGX)"><input className={inputCls} inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field></div>
        <Field label="Features" hint="Comma separated"><input className={inputCls} placeholder="Parking, Generator, Near schools" value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} /></Field>
        <Btn block size="lg" onClick={save}>Publish</Btn>
      </div>
    </Sheet>
  )
}

const VSTEPS: Valuation['status'][] = ['Requested', 'Inspection', 'Report', 'Done']
export function Valuations() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const vs = list(db, 'valuations').sort((a, b) => a.due.localeCompare(b.due))
  const [pay, setPay] = useState<TxnPreset | null>(null)
  return (<>
    <PageHead title="Valuations" sub={`Posh Valuers · ${vs.filter((v) => v.status !== 'Done').length} open · ${vs.filter((v) => v.bank).length} for banks`} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">{VSTEPS.map((s) => <Stat key={s} label={s} value={vs.filter((v) => v.status === s).length} />)}</div>
    <Card><Table head={['Ref', 'Property', 'Client', 'Purpose', 'Bank', 'Due', 'Value', 'Status', '']}>
      {vs.map((v) => { const p = db.properties[v.propertyId]; const next = VSTEPS[VSTEPS.indexOf(v.status) + 1]; return <tr key={v.id}><td className="font-mono text-xs">{v.id}</td><td>{p?.title}<div className="text-xs text-muted">{p?.area}</div></td><td>{v.client}</td><td>{v.purpose}</td><td>{v.bank ?? '—'}</td><td className="whitespace-nowrap">{fmtDate(v.due, { day: 'numeric', month: 'short' })}</td><td>{v.value ? ugxShort(v.value) : '—'}</td><td><Badge tone={statusTone(v.status)}>{v.status}</Badge></td><td>{next && <Btn size="sm" variant="soft" onClick={() => { const value = next === 'Done' ? (v.value ?? p?.value) : v.value; patch('valuations', v.id, { status: next, value }); if (next === 'Done' && p) patch('properties', p.id, { timeline: [...p.timeline, { date: nowIso().slice(0, 10), biz: 'Valuation', title: `Valued at ${ugxShort(value ?? 0)}`, detail: `Posh Valuers report${v.bank ? ` for ${v.bank}` : ''}.` }] }); toast(`${v.id} → ${next}`) }}>→ {next}</Btn>} <Btn size="sm" variant="ghost" onClick={() => setPay({ category: 'Valuation fee', business: 'Valuation', party: v.client, phone: undefined, propertyId: v.propertyId, lines: [{ desc: `Valuation report ${v.id}${v.bank ? ` for ${v.bank}` : ''} · ${p?.title ?? ''}`, qty: 1, price: (v.value ?? p?.value ?? 300000000) > 500000000 ? 3500000 : 2400000 }] })}>Fee</Btn></td></tr> })}
    </Table></Card>
    <TxnFlow open={!!pay} dir="in" preset={pay ?? undefined} onClose={() => setPay(null)} />
  </>)
}

export function Mortgages() {
  const db = useStore((s) => s.db)
  const ms = list(db, 'mortgages')
  const steps = ['Documents', 'Title & valuation', 'Bank offers', 'Sign', 'Keys']
  return (<>
    <PageHead title="Posh Home Finance" sub="Mortgages with Stanbic, Absa and dfcu" />
    <div className="grid md:grid-cols-2 gap-4">{ms.map((m) => { const p = db.properties[m.propertyId]; const chosen = m.offers.find((o) => o.chosen); return (
      <Card key={m.id} className="p-5">
        <div className="flex justify-between"><div><div className="font-mono text-xs text-muted">{m.id}</div><div className="font-bold text-lg">{m.applicant}</div><div className="text-sm text-muted">{p?.title} · {p?.area}</div></div><div className="text-right"><div className="text-xs text-muted">Loan</div><div className="font-extrabold">{ugxShort(m.amount)}</div><div className="text-xs text-muted">{m.years} yrs · {Math.round((m.amount / m.price) * 100)}% LTV</div></div></div>
        <div className="flex gap-1 mt-4">{steps.map((s, i) => <div key={s} className="flex-1"><div className={cx('h-1.5 rounded-full', i + 1 < m.step ? 'bg-brand' : i + 1 === m.step ? 'bg-gold' : 'bg-card-2')} /><div className="text-[10px] text-muted mt-1">{s}</div></div>)}</div>
        <div className="mt-3 text-sm space-y-1">{m.offers.map((o) => <div key={o.bank} className="flex justify-between"><span>{o.bank} · {o.rate}%</span><span className={cx(o.chosen && 'font-bold text-brand')}>{ugx(o.monthly)}/mo {o.chosen && '✓'}</span></div>)}</div>
        <div className="flex flex-wrap gap-1 mt-3">{m.docs.map((d) => <Badge key={d.name} tone={d.done ? 'green' : 'gray'}>{d.done && <CheckCircle2 size={10} />}{d.name}</Badge>)}</div>
        {chosen && <div className="text-xs text-brand mt-2 font-semibold">Client chose {chosen.bank}</div>}
      </Card>) })}</div>
  </>)
}

export function Messages() {
  const db = useStore((s) => s.db)
  const last = useStore((s) => s.lastChange)
  const [ch, setCh] = useState<'All' | 'WhatsApp' | 'SMS' | 'Email'>('All')
  const ms = list(db, 'messages').filter((m) => ch === 'All' || m.channel === ch).sort((a, b) => b.at.localeCompare(a.at))
  return (<>
    <PageHead title="Messages" sub="Every receipt, reminder and booking Posh sent" actions={<Chips options={['All', 'WhatsApp', 'SMS', 'Email'] as const} value={ch} onChange={setCh} />} />
    <Card><Table head={['Sent', 'To', 'Channel', 'Type', 'Message']}>
      {ms.map((m) => <tr key={m.id} className={cx(last?.id === m.id && 'flash')}><td className="text-xs text-muted whitespace-nowrap">{fmtDT(m.at)}</td><td className="font-semibold whitespace-nowrap">{m.to}<div className="text-xs text-muted font-normal">{m.phone}</div></td><td><Badge tone={m.channel === 'WhatsApp' ? 'green' : 'blue'}>{m.channel}</Badge></td><td className="text-muted">{m.kind}</td><td className="max-w-xl">{m.text}</td></tr>)}
    </Table></Card>
  </>)
}
