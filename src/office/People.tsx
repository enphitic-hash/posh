import { useState } from 'react'
import { Plus, MessageCircle, Send, Users, RefreshCw, KeyRound, LogOut as MoveOut, Trash2 } from 'lucide-react'
import { useStore, list } from '../data/store'
import { usePrefs } from '../data/prefs'
import type { Tenant, Unit } from '../data/types'
import { ugx, ugxShort, num, fmtDate, fmtDT, nowIso, uid, ago } from '../lib/format'
import { sendMessage, riskList } from '../lib/logic'
import { audit, meName } from '../lib/docs'
import { Card, Stat, Badge, Btn, Sheet, Field, inputCls, toast, cx, Chips, Empty, Avatar } from '../components/ui'
import { ESTATE_LIST } from '../data/seed'
import { PageHead, Table } from './Office'
import { TxnFlow, type TxnPreset } from './Money'

const addMonths = (iso: string, n: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10) }
const daysTo = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 864e5)

// ---------- Units & vacancies ----------
export function Units() {
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const patch = useStore((s) => s.patch)
  const [estate, setEstate] = useState('All')
  const [show, setShow] = useState<'All' | 'Vacant' | 'Let'>('All')
  const [letU, setLetU] = useState<Unit | null>(null)
  const [deposit, setDeposit] = useState<TxnPreset | null>(null)
  const [f, setF] = useState({ name: '', phone: '+256 7', start: new Date().toISOString().slice(0, 10), months: 12, rent: 0 })
  const units = list(db, 'units').filter((u) => (estate === 'All' || u.estate === estate) && (show === 'All' || (show === 'Vacant' ? !u.tenantId : !!u.tenantId))).sort((a, b) => a.estate.localeCompare(b.estate) || a.name.localeCompare(b.name, undefined, { numeric: true }))
  const all = list(db, 'units')
  const vac = all.filter((u) => !u.tenantId)
  const estates = Array.from(new Set(all.map((u) => u.estate)))
  return (<>
    <PageHead title="Units & vacancies" sub={`${all.length} units in ${estates.length} estates`} actions={<><Chips options={['All', 'Vacant', 'Let'] as const} value={show} onChange={setShow} /><select className={inputCls + ' !w-52 !h-9'} value={estate} onChange={(e) => setEstate(e.target.value)}><option>All</option>{(estates.length ? estates : ESTATE_LIST).map((e) => <option key={e}>{e}</option>)}</select></>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      <Stat label="Occupancy" value={`${Math.round(((all.length - vac.length) / Math.max(1, all.length)) * 100)}%`} sub={`${all.length - vac.length} let`} tone="up" />
      <Stat label="Vacant units" value={vac.length} tone={vac.length ? 'warn' : undefined} />
      <Stat label="Rent lost per month" value={ugxShort(vac.reduce((a, u) => a + u.rent, 0))} tone="down" sub="from vacant units" />
      <Stat label="Monthly rent roll" value={ugxShort(all.filter((u) => u.tenantId).reduce((a, u) => a + u.rent + u.service, 0))} />
    </div>
    <Card><Table head={['Estate', 'Unit', 'Beds', 'Rent', 'Service', 'Tenant', 'Landlord', '']}>
      {units.map((u) => { const t = u.tenantId ? db.tenants[u.tenantId] : undefined; return <tr key={u.id}>
        <td>{u.estate}</td><td className="font-semibold">{u.name}</td><td>{u.beds}</td><td>{num(u.rent)}</td><td className="text-muted">{num(u.service)}</td>
        <td>{t ? <>{t.name}<div className="text-xs text-muted">lease to {fmtDate(t.leaseEnd)}</div></> : <Badge tone="gold">Vacant{u.vacantSince ? ` since ${fmtDate(u.vacantSince, { day: 'numeric', month: 'short' })}` : ''}</Badge>}</td>
        <td className="text-muted">{db.landlords[u.landlordId]?.name}</td>
        <td className="whitespace-nowrap">{t ? <Btn size="sm" variant="ghost" icon={<MoveOut size={14} />} onClick={() => { patch('units', u.id, { tenantId: undefined, vacantSince: nowIso().slice(0, 10) }); if (t.cardId) patch('cards', t.cardId, { status: 'Blocked' }); audit(`${t.name} moved out of ${u.estate} ${u.name}`, 'Units'); toast(`${u.name} is now vacant · card blocked`) }}>Move out</Btn> : <Btn size="sm" icon={<KeyRound size={14} />} onClick={() => { setLetU(u); setF({ ...f, rent: u.rent, name: '', phone: '+256 7' }) }}>Let unit</Btn>}</td>
      </tr> })}
    </Table>{!units.length && <Empty>No units match</Empty>}</Card>
    <Sheet open={!!letU} onClose={() => setLetU(null)} title={letU ? `Let ${letU.estate} ${letU.name}` : ''}>{letU && (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3"><Field label="Tenant name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field><Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field></div>
        <div className="grid grid-cols-3 gap-3"><Field label="Lease start"><input type="date" className={inputCls} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field><Field label="Months"><select className={inputCls} value={f.months} onChange={(e) => setF({ ...f, months: +e.target.value })}>{[6, 12, 24].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field><Field label="Rent (UGX)"><input className={inputCls} inputMode="numeric" value={num(f.rent)} onChange={(e) => setF({ ...f, rent: +e.target.value.replace(/\D/g, '') })} /></Field></div>
        <div className="text-sm text-muted">The tenant can sign in to the Posh app with this phone number. Next: take the deposit and first month, and issue a Posh card from NFC cards.</div>
        <Btn block size="lg" disabled={f.name.length < 2} onClick={() => {
          const id = uid('T')
          const t: Tenant = { id, name: f.name, phone: f.phone, unitId: letU.id, leaseStart: f.start, leaseEnd: addMonths(f.start, f.months), wallet: 0, pin: '1234', history: [] }
          put('tenants', t); patch('units', letU.id, { tenantId: id, rent: f.rent, vacantSince: undefined })
          sendMessage({ to: f.name, phone: f.phone, channel: 'WhatsApp', kind: 'welcome', text: `Welcome to Posh Properties, ${f.name.split(' ')[0]}! Your home: ${letU.estate} ${letU.name}. Rent ${ugx(f.rent)} + service ${ugx(letU.service)} due on the 1st. Get the Posh app to pay with your Posh card, MoMo or Airtel.` })
          audit(`Let ${letU.estate} ${letU.name} to ${f.name}`, 'Units')
          setDeposit({ category: 'Security deposit', business: 'Management', party: f.name, phone: f.phone, lines: [{ desc: `Security deposit · ${letU.estate} ${letU.name}`, qty: 1, price: f.rent }, { desc: 'First month rent and service charge', qty: 1, price: f.rent + letU.service }] })
          setLetU(null); toast(`${f.name} added · welcome message sent`)
        }}>Save tenant and take deposit</Btn>
      </div>)}
    </Sheet>
    <TxnFlow open={!!deposit} dir="in" preset={deposit ?? undefined} onClose={() => setDeposit(null)} />
  </>)
}

// ---------- Leases ----------
export function Leases() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const [sel, setSel] = useState<Tenant | null>(null)
  const [f, setF] = useState({ months: 12, pct: 5 })
  const ts = list(db, 'tenants').map((t) => ({ t, d: daysTo(t.leaseEnd) })).sort((a, b) => a.d - b.d)
  const soon = ts.filter((x) => x.d <= 90)
  return (<>
    <PageHead title="Leases" sub={`${soon.length} end in the next 90 days`} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      <Stat label="Ended (not renewed)" value={ts.filter((x) => x.d < 0).length} tone="down" />
      <Stat label="End within 30 days" value={ts.filter((x) => x.d >= 0 && x.d <= 30).length} tone="warn" />
      <Stat label="End within 90 days" value={soon.length} />
      <Stat label="Active leases" value={ts.length} />
    </div>
    <Card><Table head={['Tenant', 'Home', 'Started', 'Ends', 'Rent', '']}>
      {ts.slice(0, 120).map(({ t, d }) => { const u = db.units[t.unitId]; return <tr key={t.id}>
        <td className="font-semibold">{t.name}<div className="text-xs text-muted font-normal">{t.phone}</div></td><td>{u?.estate} {u?.name}</td><td className="text-muted">{fmtDate(t.leaseStart)}</td>
        <td><Badge tone={d < 0 ? 'red' : d <= 30 ? 'gold' : d <= 90 ? 'blue' : 'gray'}>{fmtDate(t.leaseEnd)} · {d < 0 ? `${-d} days ago` : `${d} days`}</Badge></td><td>{u && num(u.rent)}</td>
        <td className="whitespace-nowrap">{d <= 90 && <><Btn size="sm" icon={<RefreshCw size={14} />} onClick={() => setSel(t)}>Renew</Btn><Btn size="sm" variant="ghost" onClick={() => { sendMessage({ to: t.name, phone: t.phone, channel: 'WhatsApp', kind: 'lease', text: `Hello ${t.name.split(' ')[0]}, your Posh lease for ${u?.estate} ${u?.name} ends on ${fmtDate(t.leaseEnd)}. Would you like to renew? Reply YES and we will send the new lease to sign in the Posh app.` }); toast(`Reminder sent to ${t.name}`) }}><MessageCircle size={14} /></Btn></>}</td>
      </tr> })}
    </Table></Card>
    <Sheet open={!!sel} onClose={() => setSel(null)} title={sel ? `Renew lease · ${sel.name}` : ''}>{sel && (() => { const u = db.units[sel.unitId]; const newRent = Math.round((u.rent * (1 + f.pct / 100)) / 5000) * 5000; return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3"><Field label="Renew for"><select className={inputCls} value={f.months} onChange={(e) => setF({ ...f, months: +e.target.value })}>{[6, 12, 24].map((n) => <option key={n} value={n}>{n} months</option>)}</select></Field><Field label="Rent increase"><select className={inputCls} value={f.pct} onChange={(e) => setF({ ...f, pct: +e.target.value })}>{[0, 5, 8, 10].map((n) => <option key={n} value={n}>{n}%</option>)}</select></Field></div>
        <Card className="p-3 text-sm space-y-1"><div className="flex justify-between"><span className="text-muted">New end date</span><b>{fmtDate(addMonths(sel.leaseEnd < nowIso() ? nowIso() : sel.leaseEnd, f.months))}</b></div><div className="flex justify-between"><span className="text-muted">Rent</span><b>{ugx(u.rent)} → {ugx(newRent)}</b></div></Card>
        <Btn block size="lg" onClick={() => {
          const end = addMonths(sel.leaseEnd < nowIso() ? nowIso() : sel.leaseEnd, f.months)
          patch('tenants', sel.id, { leaseEnd: end }); patch('units', u.id, { rent: newRent })
          sendMessage({ to: sel.name, phone: sel.phone, channel: 'WhatsApp', kind: 'lease', text: `Posh: your lease for ${u.estate} ${u.name} is renewed to ${fmtDate(end)}. New rent ${ugx(newRent)} from next month. The lease is in your Posh app.` })
          audit(`Renewed lease · ${sel.name} to ${fmtDate(end)} at ${ugx(newRent)}`, 'Leases'); toast('Lease renewed · tenant told on WhatsApp'); setSel(null)
        }}>Renew and tell the tenant</Btn>
      </div>) })()}
    </Sheet>
  </>)
}

// ---------- Staff ----------
export function StaffPage() {
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const remove = useStore((s) => s.remove)
  const me = usePrefs((s) => s.officeStaffId)
  const [add, setAdd] = useState(false)
  const [f, setF] = useState({ name: '', role: 'Cashier', phone: '', email: '', pin: '' })
  const last = (name: string) => list(db, 'audit').filter((a) => a.who === name).sort((a, b) => b.at.localeCompare(a.at))[0]
  return (<>
    <PageHead title="Staff" sub="Who can sign in to Posh Office" actions={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add staff</Btn>} />
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{list(db, 'staff').map((s) => { const l = last(s.name); return (
      <Card key={s.id} className="p-4 flex gap-3 items-start"><Avatar name={s.name} /><div className="flex-1 min-w-0"><div className="font-bold">{s.name} {s.id === me && <Badge tone="green">You</Badge>}</div><div className="text-sm text-muted">{s.role}</div><div className="text-xs text-muted mt-1">{s.phone || s.email || '—'}</div><div className="text-xs text-muted">{l ? `Last: ${l.action} · ${ago(l.at)}` : 'No activity yet'}</div></div>
        {s.id !== me && !['S-1'].includes(s.id) && <button className="text-muted hover:text-posh-red" aria-label="Remove" onClick={() => { remove('staff', s.id); audit(`Removed staff ${s.name}`, 'Staff'); toast(`${s.name} removed`) }}><Trash2 size={16} /></button>}
      </Card>) })}</div>
    <Sheet open={add} onClose={() => setAdd(false)} title="Add staff">
      <div className="space-y-3">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Role"><select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{['Director', 'Accountant', 'Cashier', 'Property manager', 'Sales agent', 'Site manager', 'Caretaker', 'Valuer', 'Front desk'].map((r) => <option key={r}>{r}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field><Field label="Email"><input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field></div>
        <Field label="PIN" hint="Demo: any PIN signs in"><input className={inputCls} inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} /></Field>
        <Btn block size="lg" disabled={f.name.length < 2} onClick={() => { put('staff', { id: uid('S'), ...f, pin: f.pin || '0000' }); audit(`Added staff ${f.name} (${f.role})`, 'Staff'); toast(`${f.name} can now sign in`); setAdd(false); setF({ name: '', role: 'Cashier', phone: '', email: '', pin: '' }) }}>Save</Btn>
      </div>
    </Sheet>
  </>)
}

// ---------- Broadcast ----------
const AUD = ['All tenants', 'One estate', 'Late payers (Posh AI)', 'Landlords', 'Building clients', 'Buyers in the pipeline'] as const
export function Broadcast() {
  const db = useStore((s) => s.db)
  const [aud, setAud] = useState<(typeof AUD)[number]>('All tenants')
  const [estate, setEstate] = useState(ESTATE_LIST[0])
  const [ch, setCh] = useState<'WhatsApp' | 'SMS'>('WhatsApp')
  const [text, setText] = useState('Hello {name}, Posh Properties here. Water will be off on Saturday 9am–1pm for tank cleaning. Thank you for your patience.')
  const people: { name: string; phone: string }[] = (() => {
    const ten = list(db, 'tenants')
    if (aud === 'All tenants') return ten
    if (aud === 'One estate') return ten.filter((t) => db.units[t.unitId]?.estate === estate)
    if (aud === 'Late payers (Posh AI)') return riskList(db, 50).map((r) => db.tenants[r.tenantId])
    if (aud === 'Landlords') return list(db, 'landlords')
    if (aud === 'Building clients') return list(db, 'sites').map((s) => ({ name: s.client, phone: s.clientPhone }))
    return list(db, 'deals').filter((d) => d.stage !== 'Closed').map((d) => ({ name: d.client, phone: d.phone }))
  })()
  const fill = (n: string) => text.replace(/\{name\}/g, n.replace(/^(Dr\.|Eng\.|Hajji)\s+/, '').split(' ')[0])
  const sent = list(db, 'messages').filter((m) => m.kind === 'broadcast').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20)
  return (<>
    <PageHead title="Broadcast" sub="One message to many people, by WhatsApp or SMS" />
    <div className="grid lg:grid-cols-[1fr_340px] gap-4">
      <Card className="p-5 space-y-3">
        <Field label="Send to"><select className={inputCls} value={aud} onChange={(e) => setAud(e.target.value as typeof aud)}>{AUD.map((a) => <option key={a}>{a}</option>)}</select></Field>
        {aud === 'One estate' && <Field label="Estate"><select className={inputCls} value={estate} onChange={(e) => setEstate(e.target.value)}>{ESTATE_LIST.map((e) => <option key={e}>{e}</option>)}</select></Field>}
        <Chips options={['WhatsApp', 'SMS'] as const} value={ch} onChange={setCh} />
        <Field label="Message" hint="{name} becomes each person's first name"><textarea rows={5} className={inputCls + ' !h-auto py-2'} value={text} onChange={(e) => setText(e.target.value)} /></Field>
        <div className="flex flex-wrap gap-2">{['Rent for {month} is due on the 1st. Pay with your Posh card, MoMo or Airtel in the Posh app.', 'Hello {name}, the gate system will be upgraded tonight. Your Posh card keeps working.', 'Hello {name}, season’s greetings from all of us at Posh Properties!'].map((t) => <button key={t} onClick={() => setText(t.replace('{month}', 'December'))} className="text-xs px-3 h-8 rounded-full border border-line">{t.slice(0, 34)}…</button>)}</div>
        <Btn size="lg" icon={<Send size={16} />} disabled={!people.length || !text.trim()} onClick={() => { people.forEach((p) => sendMessage({ to: p.name, phone: p.phone, channel: ch, kind: 'broadcast', text: fill(p.name) })); audit(`Broadcast to ${people.length} (${aud}) by ${ch}`, 'Broadcast'); toast(`Sent to ${people.length} people by ${ch}`) }}>Send to {people.length} people</Btn>
      </Card>
      <div className="space-y-3">
        <Card className="p-4"><div className="text-xs text-muted mb-1">Preview</div><div className={cx('rounded-2xl p-3 text-sm', ch === 'WhatsApp' ? 'bg-[#DCF8C6] text-black' : 'bg-card-2')}>{people[0] ? fill(people[0].name) : '—'}</div><div className="text-xs text-muted mt-2 flex items-center gap-1"><Users size={12} />{people.slice(0, 4).map((p) => p.name).join(', ')}{people.length > 4 ? ` and ${people.length - 4} more` : ''}</div></Card>
        <Card className="p-4"><div className="font-bold text-sm mb-2">Recently sent</div>{sent.length ? sent.map((m) => <div key={m.id} className="text-xs py-1 border-b border-line last:border-0"><b>{m.to}</b> · {m.channel} · {ago(m.at)}</div>) : <div className="text-xs text-muted">Nothing yet</div>}</Card>
      </div>
    </div>
  </>)
}

// ---------- Activity ----------
export function Activity() {
  const db = useStore((s) => s.db)
  const [area, setArea] = useState('All')
  const items = list(db, 'audit').sort((a, b) => b.at.localeCompare(a.at))
  const areas = Array.from(new Set(items.map((a) => a.area)))
  return (<>
    <PageHead title="Activity log" sub={`Who did what in Posh Office · you are ${meName()}`} actions={<select className={inputCls + ' !w-48 !h-9'} value={area} onChange={(e) => setArea(e.target.value)}><option>All</option>{areas.map((a) => <option key={a}>{a}</option>)}</select>} />
    <Card><Table head={['When', 'Who', 'Area', 'What']}>{items.filter((a) => area === 'All' || a.area === area).slice(0, 300).map((a) => <tr key={a.id}><td className="text-xs text-muted whitespace-nowrap">{fmtDT(a.at)}</td><td className="font-semibold whitespace-nowrap">{a.who}</td><td><Badge>{a.area}</Badge></td><td>{a.action}</td></tr>)}</Table>{!items.length && <Empty>No activity yet</Empty>}</Card>
  </>)
}
