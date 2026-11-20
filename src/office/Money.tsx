import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Camera, Printer, Wallet, Receipt, ShoppingCart, FileText, TrendingUp, TrendingDown, Search, Home, HardHat, Scale, Handshake, Map, BedDouble, Landmark, Download, CreditCard, Banknote, Smartphone } from 'lucide-react'
import { useStore, list } from '../data/store'
import type { Line, Money, Txn, Invoice, PayMethod, DB } from '../data/types'
import { ugx, ugxShort, num, fmtDate, fmtDT, monthLabel, nowIso, currentRentMonth } from '../lib/format'
import { recordPayment, tenantDue } from '../lib/logic'
import { type PDoc, docFromPayment, docFromTxn, docFromInvoice, lineTotal, nextNo, meName, audit } from '../lib/docs'
import { Checkout, DocSheet, type PayResult } from '../components/Checkout'
import { Card, Stat, Badge, Btn, Sheet, Field, inputCls, toast, cx, Chips, Empty } from '../components/ui'
import { shrink } from '../app/Tenant'
import { PageHead, Table } from './Office'

// ---------- categories ----------
export const IN_CATS: { cat: string; biz: string; icon: typeof Home; desc: string; price: number }[] = [
  { cat: 'Property sale deposit', biz: 'Sales', icon: Handshake, desc: 'Deposit on house', price: 50000000 },
  { cat: 'Property sale balance', biz: 'Sales', icon: Handshake, desc: 'Balance on house purchase', price: 150000000 },
  { cat: 'Plot sale', biz: 'Sales', icon: Map, desc: 'Residential plot 50x100', price: 95000000 },
  { cat: 'Sales commission', biz: 'Sales', icon: Handshake, desc: 'Agency commission 3%', price: 6000000 },
  { cat: 'Construction stage', biz: 'Construction', icon: HardHat, desc: 'Construction stage payment', price: 80000000 },
  { cat: 'Architecture & design', biz: 'Construction', icon: HardHat, desc: 'House plans and approvals', price: 4500000 },
  { cat: 'Renovation', biz: 'Construction', icon: HardHat, desc: 'Renovation works', price: 12000000 },
  { cat: 'Valuation fee', biz: 'Valuation', icon: Scale, desc: 'Valuation report', price: 2400000 },
  { cat: 'Survey fee', biz: 'Survey', icon: Map, desc: 'Boundary opening and survey', price: 1800000 },
  { cat: 'Short stay booking', biz: 'Management', icon: BedDouble, desc: 'Furnished apartment, per night', price: 280000 },
  { cat: 'Security deposit', biz: 'Management', icon: Home, desc: 'Security deposit (1 month)', price: 1800000 },
  { cat: 'Management fee', biz: 'Management', icon: Home, desc: 'Property management fee', price: 1500000 },
  { cat: 'Mortgage advisory fee', biz: 'Finance', icon: Landmark, desc: 'Posh Home Finance advisory', price: 1500000 },
  { cat: 'Card replacement', biz: 'Management', icon: CreditCard, desc: 'Lost Posh card replacement', price: 25000 },
  { cat: 'Other income', biz: 'Office', icon: Receipt, desc: '', price: 0 },
]
export const OUT_CATS = ['Building materials', 'Steel & roofing', 'Fuel', 'Utilities', 'Salaries', 'Site wages', 'Repairs contractor', 'Landlord payout', 'Office supplies', 'Marketing', 'Transport', 'Equipment', 'Blank NFC cards', 'Taxes (URA)', 'Bank charges', 'Other expense']
const BUSINESSES = ['Sales', 'Construction', 'Management', 'Valuation', 'Survey', 'Finance', 'Office']
const RENT_METHODS: Money[] = ['MTN MoMo', 'Airtel Money', 'Visa', 'Mastercard', 'Bank transfer', 'Cash']

const month = (iso: string) => iso.slice(0, 7)
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })

/** Every money movement as one list: rent payments + other receipts + vouchers. */
export interface Row { no: string; at: string; dir: 'in' | 'out'; party: string; business: string; category: string; method: string; amount: number; status: string; doc: () => PDoc }
export function allRows(db: DB): Row[] {
  const rent = list(db, 'payments').filter((p) => p.status !== 'Failed').map((p): Row => ({ no: p.receipt, at: p.at, dir: 'in', party: db.tenants[p.tenantId]?.name ?? '', business: 'Management', category: 'Rent', method: p.method, amount: p.amount, status: p.status, doc: () => docFromPayment(db, p) }))
  const tx = list(db, 'txns').map((t): Row => ({ no: t.no, at: t.at, dir: t.dir, party: t.party, business: t.business, category: t.category, method: t.method, amount: t.paid, status: t.status, doc: () => docFromTxn(db, t) }))
  return [...rent, ...tx].sort((a, b) => b.at.localeCompare(a.at))
}

function Parties({ id }: { id: string }) {
  const db = useStore((s) => s.db)
  const names = useMemo(() => Array.from(new Set([...list(db, 'tenants').map((t) => t.name), ...list(db, 'deals').map((d) => d.client), ...list(db, 'sites').map((s) => s.client), ...list(db, 'landlords').map((l) => l.name), ...list(db, 'suppliers').map((s) => s.name), ...list(db, 'valuations').map((v) => v.client)])).sort(), [db])
  return <datalist id={id}>{names.map((n) => <option key={n} value={n} />)}</datalist>
}
function phoneOf(db: DB, name: string) {
  const n = name.trim().toLowerCase()
  return list(db, 'tenants').find((t) => t.name.toLowerCase() === n)?.phone ?? list(db, 'deals').find((d) => d.client.toLowerCase() === n)?.phone ?? list(db, 'sites').find((s) => s.client.toLowerCase() === n)?.clientPhone ?? list(db, 'landlords').find((l) => l.name.toLowerCase() === n)?.phone ?? list(db, 'suppliers').find((s) => s.name.toLowerCase() === n)?.phone
}

function LinesEditor({ lines, set }: { lines: Line[]; set: (l: Line[]) => void }) {
  const up = (i: number, p: Partial<Line>) => set(lines.map((l, j) => (j === i ? { ...l, ...p } : l)))
  return (
    <div>
      <div className="text-[0.8125rem] font-semibold text-muted mb-1">Items</div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_64px_120px_32px] gap-2 items-center">
            <input className={inputCls} placeholder="Description" value={l.desc} onChange={(e) => up(i, { desc: e.target.value })} />
            <input className={inputCls + ' text-center px-1'} inputMode="numeric" value={l.qty || ''} onChange={(e) => up(i, { qty: +e.target.value.replace(/\D/g, '') })} aria-label="Quantity" />
            <input className={inputCls + ' text-right'} inputMode="numeric" placeholder="Price" value={l.price ? num(l.price) : ''} onChange={(e) => up(i, { price: +e.target.value.replace(/\D/g, '') })} aria-label="Unit price" />
            <button onClick={() => set(lines.filter((_, j) => j !== i))} disabled={lines.length === 1} className="text-muted disabled:opacity-30" aria-label="Remove"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-2"><Btn size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => set([...lines, { desc: '', qty: 1, price: 0 }])}>Add item</Btn><div className="font-extrabold">Total {ugx(lineTotal(lines))}</div></div>
    </div>
  )
}

export interface TxnPreset { category?: string; business?: string; party?: string; phone?: string; lines?: Line[]; propertyId?: string; invoiceId?: string; supplierId?: string; note?: string; lockAmount?: boolean }

/** A sale (money in) or purchase (money out): form → payment flow → printed receipt or voucher. */
export function TxnFlow({ open, onClose, dir, preset, onSaved }: { open: boolean; onClose: () => void; dir: 'in' | 'out'; preset?: TxnPreset; onSaved?: (t: Txn) => void }) {
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const first = IN_CATS[0]
  const init = () => ({
    category: preset?.category ?? (dir === 'in' ? first.cat : OUT_CATS[0]),
    business: preset?.business ?? (dir === 'in' ? first.biz : 'Construction'),
    party: preset?.party ?? '', phone: preset?.phone ?? '',
    lines: preset?.lines ?? [{ desc: dir === 'in' ? first.desc : '', qty: 1, price: dir === 'in' ? first.price : 0 }],
    propertyId: preset?.propertyId ?? '', supplierId: preset?.supplierId ?? '', note: preset?.note ?? '', photo: '', credit: false,
  })
  const [f, setF] = useState(init)
  const [pay, setPay] = useState(false)
  const [key, setKey] = useState('')
  const k = JSON.stringify(preset ?? {}) + open
  if (open && key !== k) { setKey(k); setF(init()); setPay(false) }
  const total = lineTotal(f.lines)
  const pickCat = (cat: string) => {
    const c = IN_CATS.find((x) => x.cat === cat)
    setF({ ...f, category: cat, business: c?.biz ?? f.business, lines: c && !preset?.lines ? [{ desc: c.desc, qty: 1, price: c.price }] : f.lines })
  }
  const pickSupplier = (id: string) => { const s = db.suppliers[id]; setF({ ...f, supplierId: id, party: s?.name ?? f.party, phone: s?.phone ?? f.phone, category: s && OUT_CATS.includes(s.category) ? s.category : f.category }) }
  const save = (r: PayResult | null): PDoc => {
    const no = nextNo(useStore.getState().db, dir === 'in' ? 'SR' : 'PV')
    const paid = r ? r.paid : 0
    const t: Txn = {
      id: no, no, dir, category: f.category, business: f.business, party: f.party.trim(), phone: f.phone || r?.payerPhone || undefined, lines: f.lines.filter((l) => l.desc || l.price), total, paid,
      method: r?.method ?? 'Bank transfer', ref: r?.ref ?? 'On credit', status: paid < total ? 'Part' : 'Paid', at: nowIso(), by: meName(), note: f.note || (r ? undefined : 'Not yet paid (on credit)'), photo: f.photo || undefined,
      propertyId: f.propertyId || undefined, supplierId: f.supplierId || undefined, invoiceId: preset?.invoiceId, tendered: r?.tendered, change: r?.change, payer: r?.payer,
    }
    put('txns', t)
    audit(`${dir === 'in' ? 'Receipt' : 'Payment voucher'} ${no} · ${f.party} · ${ugx(paid)}`, dir === 'in' ? 'Cashier' : 'Purchases')
    if (f.propertyId && db.properties[f.propertyId] && dir === 'in') {
      const p = db.properties[f.propertyId]
      useStore.getState().patch('properties', p.id, { timeline: [...p.timeline, { date: t.at.slice(0, 10), biz: (['Sales', 'Construction', 'Management', 'Valuation', 'Finance', 'Survey'].includes(f.business) ? f.business : 'Sales') as 'Sales', title: `${f.category}: ${ugxShort(paid)}`, detail: `Receipt ${no}, ${t.method}.` }] })
    }
    onSaved?.(t)
    return docFromTxn(useStore.getState().db, t)
  }
  const [creditDoc, setCreditDoc] = useState<PDoc | null>(null)
  const ok = f.party.trim().length > 1 && total > 0
  return (<>
    <Sheet wide open={open && !pay && !creditDoc} onClose={onClose} title={dir === 'in' ? 'New sale · receipt' : 'New purchase · payment voucher'}>
      <div className="space-y-3">
        {dir === 'in' ? (
          <Field label="What is being paid for?"><select className={inputCls} value={f.category} onChange={(e) => pickCat(e.target.value)}>{IN_CATS.map((c) => <option key={c.cat} value={c.cat}>{c.cat} · {c.biz}</option>)}</select></Field>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Supplier"><select className={inputCls} value={f.supplierId} onChange={(e) => pickSupplier(e.target.value)}><option value="">Other / type below</option>{list(db, 'suppliers').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Expense type"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{OUT_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          </div>
        )}
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label={dir === 'in' ? 'Customer / client' : 'Paid to'}><input list="posh-parties" className={inputCls} value={f.party} onChange={(e) => { const v = e.target.value; setF({ ...f, party: v, phone: f.phone || phoneOf(db, v) || '' }) }} placeholder="Name" /></Field>
          <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" placeholder="+256 7…" /></Field>
          <Field label={dir === 'in' ? 'Business' : 'Charge to'}><select className={inputCls} value={f.business} onChange={(e) => setF({ ...f, business: e.target.value })}>{BUSINESSES.map((b) => <option key={b}>{b}</option>)}</select></Field>
        </div>
        <Parties id="posh-parties" />
        <LinesEditor lines={f.lines} set={(lines) => setF({ ...f, lines })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Property passport (optional)"><select className={inputCls} value={f.propertyId} onChange={(e) => setF({ ...f, propertyId: e.target.value })}><option value="">None</option>{list(db, 'properties').map((p) => <option key={p.id} value={p.id}>{p.id} · {p.title}</option>)}</select></Field>
          <Field label="Note (optional)"><input className={inputCls} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={dir === 'in' ? 'e.g. balance due 15 Dec' : 'e.g. for Kira-Mulawa 77 roof'} /></Field>
        </div>
        {dir === 'out' && (
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-line text-sm font-semibold cursor-pointer"><Camera size={16} />{f.photo ? 'Change photo' : "Photo of supplier's receipt"}<input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, photo: await shrink(file, 700) }) }} /></label>
            {f.photo && <img src={f.photo} alt="" className="h-12 rounded border border-line" />}
            <label className="ml-auto inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={f.credit} onChange={(e) => setF({ ...f, credit: e.target.checked })} />Bought on credit (pay later)</label>
          </div>
        )}
        <Btn block size="lg" disabled={!ok} icon={dir === 'in' ? <Wallet size={18} /> : <ShoppingCart size={18} />} onClick={() => { if (f.credit) { setCreditDoc(save(null)); toast('Saved as unpaid. Pay it from Purchases.') } else setPay(true) }}>
          {!ok ? 'Fill in who and the items' : f.credit ? `Save ${ugx(total)} as unpaid` : dir === 'in' ? `Take payment · ${ugx(total)}` : `Pay supplier · ${ugx(total)}`}
        </Btn>
      </div>
    </Sheet>
    <Checkout open={open && pay} onClose={() => { setPay(false); onClose() }} title={dir === 'in' ? `Take payment · ${f.category}` : `Pay · ${f.category}`} amount={total} party={f.party} phone={f.phone} dir={dir} onPaid={save} />
    <DocSheet doc={creditDoc} onClose={() => { setCreditDoc(null); onClose() }} />
  </>)
}

/** Rent at the counter: pick tenant → payment flow → rent receipt. */
export function RentFlow({ open, onClose, tenantId }: { open: boolean; onClose: () => void; tenantId?: string }) {
  const db = useStore((s) => s.db)
  const [tid, setTid] = useState(tenantId ?? '')
  const [pay, setPay] = useState(false)
  const m = currentRentMonth()
  const t = db.tenants[tid]
  const due = t ? tenantDue(db, t, m) : undefined
  return (<>
    <Sheet open={open && !pay} onClose={onClose} title="Rent payment">
      <div className="space-y-3">
        <Field label="Tenant"><select className={inputCls} value={tid} onChange={(e) => setTid(e.target.value)}><option value="">Choose…</option>{list(db, 'tenants').sort((a, b) => a.name.localeCompare(b.name)).map((x) => <option key={x.id} value={x.id}>{x.name} · {db.units[x.unitId]?.estate.replace('Posh ', '')} {db.units[x.unitId]?.name}</option>)}</select></Field>
        {due && <Card className="p-3 text-sm space-y-1">{due.lines.map((l) => <div key={l.label} className="flex justify-between"><span>{l.label}</span><span>{num(l.amount)}</span></div>)}<div className="flex justify-between"><span className="text-muted">Already paid for {monthLabel(m, true)}</span><span>{num(due.paid)}</span></div><div className="flex justify-between font-extrabold border-t border-line pt-1"><span>Balance</span><span>{ugx(due.balance)}</span></div></Card>}
        <Btn block size="lg" disabled={!due || due.balance <= 0} onClick={() => setPay(true)}>{due && due.balance <= 0 ? `${monthLabel(m, true)} is fully paid` : 'Take payment'}</Btn>
      </div>
    </Sheet>
    {t && due && <Checkout open={open && pay} onClose={() => { setPay(false); onClose() }} title={`Rent · ${monthLabel(m, true)}`} amount={due.balance} party={t.name} phone={t.phone} methods={RENT_METHODS} onPaid={(r) => {
      const fixed = r.paid < due.balance ? [{ label: 'Part payment', amount: r.paid }] : due.paid > 0 ? [{ label: `Balance for ${monthLabel(m, true)}`, amount: r.paid }] : due.lines.map((l) => ({ ...l }))
      const p = recordPayment({ tenantId: t.id, amount: r.paid, method: r.method as PayMethod, via: 'Office', month: m, lines: fixed, ref: r.ref, part: r.paid < due.balance ? `Balance ${ugx(due.balance - r.paid)}` : undefined })
      audit(`Rent receipt ${p.receipt} · ${t.name} · ${ugx(r.paid)}`, 'Cashier')
      const d = docFromPayment(useStore.getState().db, p)
      return { ...d, by: meName(), tendered: r.tendered, change: r.change }
    }} />}
  </>)
}

// ---------- Cashier ----------
export function Cashier() {
  const db = useStore((s) => s.db)
  const [flow, setFlow] = useState<null | { dir: 'in' | 'out'; preset?: TxnPreset }>(null)
  const [rent, setRent] = useState(false)
  const [view, setView] = useState<PDoc | null>(null)
  const today = todayKey()
  const rows = allRows(db).filter((r) => dayKey(r.at) === today)
  const inn = rows.filter((r) => r.dir === 'in'), out = rows.filter((r) => r.dir === 'out')
  const by = (m: string) => inn.filter((r) => r.method === m).reduce((a, r) => a + r.amount, 0) - out.filter((r) => r.method === m).reduce((a, r) => a + r.amount, 0)
  return (<>
    <PageHead title="Cashier" sub={`${fmtDate(nowIso(), { weekday: 'long', day: 'numeric', month: 'long' })} · served by ${meName()}`} actions={<><Btn variant="outline" icon={<ShoppingCart size={16} />} onClick={() => setFlow({ dir: 'out' })}>Pay out</Btn><Btn icon={<Plus size={16} />} onClick={() => setFlow({ dir: 'in' })}>New sale</Btn></>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat label="Taken today" value={ugxShort(inn.reduce((a, r) => a + r.amount, 0))} sub={`${inn.length} receipts`} tone="up" icon={<TrendingUp size={16} />} />
      <Stat label="Paid out today" value={ugxShort(out.reduce((a, r) => a + r.amount, 0))} sub={`${out.length} vouchers`} tone="down" icon={<TrendingDown size={16} />} />
      <Stat label="Cash in drawer (today)" value={ugxShort(Math.max(0, by('Cash')))} icon={<Banknote size={16} />} />
      <Stat label="Mobile money (today)" value={ugxShort(by('MTN MoMo') + by('Airtel Money'))} icon={<Smartphone size={16} />} />
    </div>
    <h3 className="font-bold mt-6 mb-2">Take a payment for</h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
      <Tile icon={Home} title="Rent" sub="Tenant rent and charges" onClick={() => setRent(true)} />
      {IN_CATS.filter((c) => c.cat !== 'Other income').map((c) => <Tile key={c.cat} icon={c.icon} title={c.cat} sub={c.biz} onClick={() => setFlow({ dir: 'in', preset: { category: c.cat, business: c.biz, lines: [{ desc: c.desc, qty: 1, price: c.price }] } })} />)}
      <Tile icon={Receipt} title="Anything else" sub="Type your own items" onClick={() => setFlow({ dir: 'in', preset: { category: 'Other income', business: 'Office', lines: [{ desc: '', qty: 1, price: 0 }] } })} />
    </div>
    <h3 className="font-bold mt-6 mb-2">Today at the counter</h3>
    <Card>{rows.length ? <RowsTable rows={rows} onView={setView} /> : <Empty>No payments yet today. Choose one above to start.</Empty>}</Card>
    <TxnFlow open={!!flow} dir={flow?.dir ?? 'in'} preset={flow?.preset} onClose={() => setFlow(null)} />
    <RentFlow open={rent} onClose={() => setRent(false)} />
    <DocSheet doc={view} onClose={() => setView(null)} />
  </>)
}
function Tile({ icon: I, title, sub, onClick }: { icon: typeof Home; title: string; sub: string; onClick: () => void }) {
  return <Card onClick={onClick} className="p-3 flex items-center gap-3 hover:border-brand"><span className="w-10 h-10 rounded-xl bg-brand-soft text-brand grid place-items-center shrink-0"><I size={18} /></span><div className="min-w-0"><div className="font-semibold text-sm leading-tight">{title}</div><div className="text-xs text-muted">{sub}</div></div></Card>
}

function RowsTable({ rows, onView }: { rows: Row[]; onView: (d: PDoc) => void }) {
  return (
    <Table head={['No.', 'Date', 'Who', 'For', 'Method', 'Amount', 'Status', '']}>
      {rows.map((r) => (
        <tr key={r.no} className="hover:bg-card-2 cursor-pointer" onClick={() => onView(r.doc())}>
          <td className="font-mono text-xs whitespace-nowrap">{r.no}</td>
          <td className="text-xs text-muted whitespace-nowrap">{fmtDT(r.at)}</td>
          <td className="font-semibold">{r.party}</td>
          <td><div>{r.category}</div><div className="text-xs text-muted">{r.business}</div></td>
          <td className="whitespace-nowrap">{r.method}</td>
          <td className={cx('font-bold whitespace-nowrap', r.dir === 'in' ? 'text-brand' : 'text-posh-red')}>{r.dir === 'in' ? '+' : '−'}{num(r.amount)}</td>
          <td><Badge tone={r.status === 'Part' ? 'gold' : r.dir === 'in' ? 'green' : 'gray'}>{r.status === 'Part' ? 'Part / credit' : r.dir === 'in' ? 'Received' : 'Paid out'}</Badge></td>
          <td><Btn size="sm" variant="ghost" icon={<Printer size={14} />}>Print</Btn></td>
        </tr>
      ))}
    </Table>
  )
}

// ---------- Receipts register ----------
export function Receipts() {
  const db = useStore((s) => s.db)
  const [sp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [dir, setDir] = useState<'All' | 'Money in' | 'Money out' | 'Rent'>('All')
  const [view, setView] = useState<PDoc | null>(null)
  const s = q.trim().toLowerCase()
  const rows = allRows(db).filter((r) => (dir === 'All' || (dir === 'Money in' && r.dir === 'in') || (dir === 'Money out' && r.dir === 'out') || (dir === 'Rent' && r.category === 'Rent')) && (!s || `${r.no} ${r.party} ${r.category} ${r.business} ${r.method}`.toLowerCase().includes(s)))
  const shown = rows.slice(0, 300)
  const csv = () => {
    const out = [['No', 'Date', 'Direction', 'Party', 'Business', 'Category', 'Method', 'Amount', 'Status'], ...rows.map((r) => [r.no, r.at, r.dir, r.party, r.business, r.category, r.method, r.amount, r.status])].map((x) => x.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([out], { type: 'text/csv' })); a.download = 'posh-receipts.csv'; a.click()
  }
  return (<>
    <PageHead title="Receipts register" sub={`Every receipt and voucher · ${rows.length} shown`} actions={<><Chips options={['All', 'Money in', 'Rent', 'Money out'] as const} value={dir} onChange={setDir} /><Btn variant="outline" icon={<Download size={16} />} onClick={csv}>CSV</Btn></>} />
    <div className="flex items-center gap-2 h-11 rounded-xl border border-line bg-card px-3 mb-3 max-w-lg"><Search size={16} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Receipt no., name, method or category" className="flex-1 bg-transparent outline-none text-sm" /></div>
    <Card>{shown.length ? <RowsTable rows={shown} onView={setView} /> : <Empty>Nothing matches</Empty>}</Card>
    {rows.length > shown.length && <div className="text-xs text-muted mt-2">Showing the latest 300. Search to find older ones.</div>}
    <DocSheet doc={view} onClose={() => setView(null)} />
  </>)
}

// ---------- Purchases ----------
export function Purchases() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const [flow, setFlow] = useState<TxnPreset | null>(null)
  const [cat, setCat] = useState('All')
  const [view, setView] = useState<PDoc | null>(null)
  const [payBal, setPayBal] = useState<Txn | null>(null)
  const m = month(nowIso())
  const outs = list(db, 'txns').filter((t) => t.dir === 'out').sort((a, b) => b.at.localeCompare(a.at))
  const shown = outs.filter((t) => cat === 'All' || t.category === cat)
  const thisMonth = outs.filter((t) => month(t.at) === m)
  const cats = Array.from(new Set(outs.map((t) => t.category)))
  const owed = outs.reduce((a, t) => a + (t.total - t.paid), 0)
  return (<>
    <PageHead title="Purchases & expenses" sub="Everything Posh buys gets a payment voucher" actions={<Btn icon={<Plus size={16} />} onClick={() => setFlow({})}>New purchase</Btn>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat label={`Spent in ${monthLabel(m, true)}`} value={ugxShort(thisMonth.reduce((a, t) => a + t.paid, 0))} sub={`${thisMonth.length} vouchers`} />
      <Stat label="Owed to suppliers" value={ugxShort(owed)} tone={owed ? 'warn' : undefined} sub={`${outs.filter((t) => t.paid < t.total).length} on credit`} />
      <Stat label="Biggest cost" value={(() => { const c: Record<string, number> = {}; thisMonth.forEach((t) => (c[t.category] = (c[t.category] ?? 0) + t.paid)); const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return top ? top[0] : '—' })()} />
      <Stat label="Suppliers" value={list(db, 'suppliers').length} />
    </div>
    <h3 className="font-bold mt-6 mb-2">Quick buy</h3>
    <div className="flex flex-wrap gap-2">{[['Cement', 'Building materials', 'SUP-1', 'Hima cement 50kg', 20, 34000], ['Fuel', 'Fuel', 'SUP-3', 'Diesel for site truck (litres)', 60, 5200], ['Yaka', 'Utilities', 'SUP-5', 'Yaka tokens, office', 1, 450000], ['Water bill', 'Utilities', 'SUP-6', 'NWSC water, office', 1, 186000], ['Office supplies', 'Office supplies', 'SUP-7', 'Printer paper and toner', 1, 420000], ['Site wages', 'Site wages', '', 'Daily wages', 12, 35000], ['Landlord payout', 'Landlord payout', '', 'Rent collected less 10% fee', 1, 0]].map(([label, c, sup, desc, qty, price]) => (
      <Btn key={label as string} variant="outline" size="sm" onClick={() => { const s = db.suppliers[sup as string]; setFlow({ category: c as string, business: c === 'Landlord payout' ? 'Management' : (['Utilities', 'Office supplies'].includes(c as string) ? 'Office' : 'Construction'), supplierId: (sup as string) || undefined, party: s?.name, phone: s?.phone, lines: [{ desc: desc as string, qty: qty as number, price: price as number }] }) }}>{label}</Btn>))}</div>
    <div className="flex items-center justify-between mt-6 mb-2"><h3 className="font-bold">Payment vouchers</h3><select className={inputCls + ' !w-56 !h-9'} value={cat} onChange={(e) => setCat(e.target.value)}><option>All</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></div>
    <Card><Table head={['Voucher', 'Date', 'Paid to', 'For', 'Charged to', 'Total', 'Paid', 'Receipt', '']}>
      {shown.map((t) => <tr key={t.id} className="hover:bg-card-2">
        <td className="font-mono text-xs">{t.no}</td><td className="text-xs text-muted whitespace-nowrap">{fmtDate(t.at)}</td>
        <td className="font-semibold">{t.party}<div className="text-xs text-muted font-normal">{t.lines[0]?.desc}{t.lines.length > 1 ? ` +${t.lines.length - 1}` : ''}</div></td>
        <td>{t.category}</td><td className="text-muted">{t.business}</td><td className="whitespace-nowrap">{num(t.total)}</td>
        <td>{t.paid < t.total ? <Badge tone="gold">Owes {ugxShort(t.total - t.paid)}</Badge> : <Badge tone="green">{t.method}</Badge>}</td>
        <td>{t.photo ? <img src={t.photo} alt="" className="w-9 h-9 rounded object-cover" /> : <span className="text-xs text-muted">—</span>}</td>
        <td className="whitespace-nowrap"><Btn size="sm" variant="ghost" icon={<Printer size={14} />} onClick={() => setView(docFromTxn(db, t))}>Voucher</Btn>{t.paid < t.total && <Btn size="sm" variant="soft" onClick={() => setPayBal(t)}>Pay</Btn>}</td>
      </tr>)}
    </Table></Card>
    <TxnFlow open={!!flow} dir="out" preset={flow ?? undefined} onClose={() => setFlow(null)} />
    {payBal && <Checkout open onClose={() => setPayBal(null)} title={`Pay balance · ${payBal.no}`} dir="out" amount={payBal.total - payBal.paid} party={payBal.party} phone={payBal.phone} onPaid={(r) => {
      const paid = payBal.paid + r.paid
      patch('txns', payBal.id, { paid, status: paid < payBal.total ? 'Part' : 'Paid', method: r.method, ref: r.ref, note: `${payBal.note ? payBal.note + ' · ' : ''}Paid ${ugx(r.paid)} on ${fmtDate(nowIso())}` })
      audit(`Paid ${ugx(r.paid)} on ${payBal.no} (${payBal.party})`, 'Purchases')
      return { ...docFromTxn(useStore.getState().db, useStore.getState().db.txns[payBal.id]), paid: r.paid, tendered: r.tendered, change: r.change }
    }} />}
    <DocSheet doc={view} onClose={() => setView(null)} />
  </>)
}

// ---------- Invoices ----------
export function Invoices() {
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const patch = useStore((s) => s.patch)
  const [add, setAdd] = useState(false)
  const [view, setView] = useState<PDoc | null>(null)
  const [pay, setPay] = useState<Invoice | null>(null)
  const [tab, setTab] = useState<'Open' | 'Paid' | 'All'>('Open')
  const invs = list(db, 'invoices').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((i) => tab === 'All' || (tab === 'Paid' ? i.status === 'Paid' : i.status !== 'Paid'))
  const open = list(db, 'invoices').filter((i) => i.status !== 'Paid')
  const today = todayKey()
  const overdue = open.filter((i) => i.due < today)
  const [f, setF] = useState({ party: '', phone: '', business: 'Construction', due: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), lines: [{ desc: '', qty: 1, price: 0 }] as Line[], propertyId: '' })
  return (<>
    <PageHead title="Invoices" sub="Bill clients, take payment, receipt goes out automatically" actions={<><Chips options={['Open', 'Paid', 'All'] as const} value={tab} onChange={setTab} /><Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>New invoice</Btn></>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
      <Stat label="Outstanding" value={ugxShort(open.reduce((a, i) => a + i.total - i.paid, 0))} sub={`${open.length} invoices`} />
      <Stat label="Overdue" value={ugxShort(overdue.reduce((a, i) => a + i.total - i.paid, 0))} tone="down" sub={`${overdue.length} past due date`} />
      <Stat label="Part paid" value={open.filter((i) => i.status === 'Part').length} />
      <Stat label="Paid this month" value={list(db, 'invoices').filter((i) => i.status === 'Paid').length} />
    </div>
    <Card><Table head={['Invoice', 'Client', 'Business', 'Total', 'Paid', 'Due', 'Status', '']}>
      {invs.map((i) => <tr key={i.id}>
        <td className="font-mono text-xs">{i.no}</td><td className="font-semibold">{i.party}<div className="text-xs text-muted font-normal">{i.lines[0]?.desc}</div></td><td>{i.business}</td>
        <td className="whitespace-nowrap">{num(i.total)}</td><td className="whitespace-nowrap">{num(i.paid)}</td>
        <td className={cx('whitespace-nowrap', i.status !== 'Paid' && i.due < today && 'text-posh-red font-semibold')}>{fmtDate(i.due, { day: 'numeric', month: 'short' })}</td>
        <td><Badge tone={i.status === 'Paid' ? 'green' : i.status === 'Part' ? 'gold' : i.due < today ? 'red' : 'blue'}>{i.status !== 'Paid' && i.due < today ? 'Overdue' : i.status}</Badge></td>
        <td className="whitespace-nowrap"><Btn size="sm" variant="ghost" icon={<FileText size={14} />} onClick={() => setView(docFromInvoice(i))}>View</Btn>{i.status !== 'Paid' && <Btn size="sm" onClick={() => setPay(i)}>Take payment</Btn>}</td>
      </tr>)}
    </Table>{!invs.length && <Empty>No invoices here</Empty>}</Card>
    <Sheet wide open={add} onClose={() => setAdd(false)} title="New invoice">
      <div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Client"><input list="posh-parties-inv" className={inputCls} value={f.party} onChange={(e) => setF({ ...f, party: e.target.value, phone: f.phone || phoneOf(db, e.target.value) || '' })} /></Field>
          <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Business"><select className={inputCls} value={f.business} onChange={(e) => setF({ ...f, business: e.target.value })}>{BUSINESSES.map((b) => <option key={b}>{b}</option>)}</select></Field>
        </div>
        <Parties id="posh-parties-inv" />
        <LinesEditor lines={f.lines} set={(lines) => setF({ ...f, lines })} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Due date"><input type="date" className={inputCls} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
          <Field label="Property passport (optional)"><select className={inputCls} value={f.propertyId} onChange={(e) => setF({ ...f, propertyId: e.target.value })}><option value="">None</option>{list(db, 'properties').map((p) => <option key={p.id} value={p.id}>{p.id} · {p.title}</option>)}</select></Field>
        </div>
        <Btn block size="lg" disabled={!f.party || lineTotal(f.lines) <= 0} onClick={() => {
          const no = nextNo(db, 'INV')
          const i: Invoice = { id: no, no, party: f.party, phone: f.phone, business: f.business, lines: f.lines.filter((l) => l.desc || l.price), total: lineTotal(f.lines), paid: 0, due: f.due, status: 'Unpaid', createdAt: nowIso(), by: meName(), propertyId: f.propertyId || undefined }
          put('invoices', i); audit(`Invoice ${no} · ${f.party} · ${ugx(i.total)}`, 'Invoices')
          setAdd(false); setView(docFromInvoice(i)); setF({ ...f, party: '', phone: '', lines: [{ desc: '', qty: 1, price: 0 }] })
          toast(`Invoice ${no} created`)
        }}>Create invoice · {ugx(lineTotal(f.lines))}</Btn>
      </div>
    </Sheet>
    {pay && <Checkout open onClose={() => setPay(null)} title={`Payment for ${pay.no}`} amount={pay.total - pay.paid} party={pay.party} phone={pay.phone} onPaid={(r) => {
      const no = nextNo(useStore.getState().db, 'SR')
      const t: Txn = { id: no, no, dir: 'in', category: `Invoice ${pay.no}`, business: pay.business, party: pay.party, phone: pay.phone, lines: [{ desc: `Payment on invoice ${pay.no}: ${pay.lines.map((l) => l.desc).join(', ')}`, qty: 1, price: r.paid }], total: r.paid, paid: r.paid, method: r.method, ref: r.ref, status: 'Paid', at: nowIso(), by: meName(), invoiceId: pay.id, propertyId: pay.propertyId, tendered: r.tendered, change: r.change }
      put('txns', t)
      const paid = pay.paid + r.paid
      patch('invoices', pay.id, { paid, status: paid >= pay.total ? 'Paid' : 'Part' })
      audit(`Receipt ${no} for invoice ${pay.no} · ${ugx(r.paid)}`, 'Invoices')
      return docFromTxn(useStore.getState().db, t)
    }} />}
    <DocSheet doc={view} onClose={() => setView(null)} />
  </>)
}

// ---------- Finance ----------
export function Finance() {
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return d.toISOString().slice(0, 7) })
  const [m, setM] = useState(months[months.length - 1])
  const rows = allRows(db)
  const sum = (rs: Row[]) => rs.reduce((a, r) => a + r.amount, 0)
  const ofM = (k: string) => rows.filter((r) => month(r.at) === k)
  const cur = ofM(m)
  const inn = cur.filter((r) => r.dir === 'in'), out = cur.filter((r) => r.dir === 'out')
  const income = sum(inn), spend = sum(out)
  const group = (rs: Row[], key: (r: Row) => string) => { const g: Record<string, number> = {}; rs.forEach((r) => (g[key(r)] = (g[key(r)] ?? 0) + r.amount)); return Object.entries(g).sort((a, b) => b[1] - a[1]) }
  const methods: string[] = ['Cash', 'MTN MoMo', 'Airtel Money', 'Visa', 'Mastercard', 'Bank transfer', 'Cheque', 'Posh Wallet']
  const series = months.map((k) => { const r = ofM(k); return { k, i: sum(r.filter((x) => x.dir === 'in')), o: sum(r.filter((x) => x.dir === 'out')) } })
  const max = Math.max(1, ...series.flatMap((s) => [s.i, s.o]))
  const owedToUs = list(db, 'invoices').reduce((a, i) => a + i.total - i.paid, 0)
  const weOwe = list(db, 'txns').filter((t) => t.dir === 'out').reduce((a, t) => a + t.total - t.paid, 0)
  return (<>
    <PageHead title="Finance" sub="Income, expenses and cash book across every Posh business" actions={<select className={inputCls + ' !w-48'} value={m} onChange={(e) => setM(e.target.value)}>{months.map((k) => <option key={k} value={k}>{monthLabel(k, true)}</option>)}</select>} />
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
      <Stat label="Money in" value={ugxShort(income)} tone="up" sub={`${inn.length} receipts`} icon={<TrendingUp size={16} />} />
      <Stat label="Money out" value={ugxShort(spend)} tone="down" sub={`${out.length} vouchers`} icon={<TrendingDown size={16} />} />
      <Stat label="Net" value={ugxShort(income - spend)} tone={income >= spend ? 'up' : 'down'} sub={income ? `${Math.round(((income - spend) / income) * 100)}% margin` : ''} />
      <Card className="p-4 cursor-pointer" onClick={() => nav('/office/invoices')}><div className="text-[0.8125rem] text-muted">Clients owe Posh</div><div className="mt-1 text-2xl font-extrabold">{ugxShort(owedToUs)}</div><div className="text-xs text-gold font-medium">Open invoices →</div></Card>
      <Card className="p-4 cursor-pointer" onClick={() => nav('/office/purchases')}><div className="text-[0.8125rem] text-muted">Posh owes suppliers</div><div className="mt-1 text-2xl font-extrabold">{ugxShort(weOwe)}</div><div className="text-xs text-gold font-medium">Purchases on credit →</div></Card>
    </div>
    <div className="grid xl:grid-cols-3 gap-4 mt-4">
      <Card className="p-5 xl:col-span-2">
        <div className="flex justify-between items-center"><h3 className="font-bold">Six months</h3><div className="flex gap-3 text-xs"><span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-brand" />In</span><span className="inline-flex items-center gap-1"><i className="w-3 h-3 rounded bg-posh-red/70" />Out</span></div></div>
        <div className="flex items-end gap-3 h-48 mt-4">{series.map((s) => <button key={s.k} onClick={() => setM(s.k)} className={cx('flex-1 h-full flex flex-col justify-end items-center gap-1 rounded-lg', s.k === m && 'bg-card-2')}><div className="flex items-end gap-1 w-full justify-center flex-1"><div className="w-1/3 bg-brand rounded-t" style={{ height: `${(s.i / max) * 100}%` }} title={ugx(s.i)} /><div className="w-1/3 bg-posh-red/70 rounded-t" style={{ height: `${(s.o / max) * 100}%` }} title={ugx(s.o)} /></div><div className="text-[0.6875rem] text-muted">{monthLabel(s.k)}</div></button>)}</div>
      </Card>
      <Card className="p-5"><h3 className="font-bold mb-2">Cash book · {monthLabel(m)}</h3>
        <Table head={['Method', 'In', 'Out', 'Net']}>{methods.map((me) => { const i = sum(inn.filter((r) => r.method === me)), o = sum(out.filter((r) => r.method === me)); return i || o ? <tr key={me} className="whitespace-nowrap"><td className="font-semibold">{me}</td><td className="text-brand">{ugxShort(i)}</td><td className="text-posh-red">{ugxShort(o)}</td><td className="font-bold">{ugxShort(i - o)}</td></tr> : null })}</Table>
      </Card>
    </div>
    <div className="grid md:grid-cols-2 gap-4 mt-4">
      <Breakdown title="Income by business" rows={group(inn, (r) => r.business)} total={income} tone="bg-brand" />
      <Breakdown title="Expenses by type" rows={group(out, (r) => r.category)} total={spend} tone="bg-posh-red/70" />
    </div>
  </>)
}
function Breakdown({ title, rows, total, tone }: { title: string; rows: [string, number][]; total: number; tone: string }) {
  return <Card className="p-5"><h3 className="font-bold mb-3">{title}</h3>{rows.length ? <div className="space-y-2.5">{rows.map(([k, v]) => <div key={k}><div className="flex justify-between text-sm"><span>{k}</span><b>{ugxShort(v)}</b></div><div className="h-2 rounded-full bg-card-2 mt-1 overflow-hidden"><div className={cx('h-full rounded-full', tone)} style={{ width: `${(v / Math.max(1, total)) * 100}%` }} /></div></div>)}</div> : <Empty>Nothing this month</Empty>}</Card>
}

// ---------- Suppliers ----------
export function Suppliers() {
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const [add, setAdd] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [view, setView] = useState<PDoc | null>(null)
  const [buy, setBuy] = useState<TxnPreset | null>(null)
  const [f, setF] = useState({ name: '', category: OUT_CATS[0], phone: '', contact: '', terms: '30 days' })
  const outs = list(db, 'txns').filter((t) => t.dir === 'out')
  const of = (id: string) => outs.filter((t) => t.supplierId === id || t.party === db.suppliers[id]?.name)
  const s = sel ? db.suppliers[sel] : undefined
  return (<>
    <PageHead title="Suppliers" sub={`${list(db, 'suppliers').length} suppliers`} actions={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>Add supplier</Btn>} />
    <Card><Table head={['Supplier', 'Supplies', 'Contact', 'Terms', 'Bought', 'Owed', '']}>
      {list(db, 'suppliers').map((x) => { const ts = of(x.id); const owed = ts.reduce((a, t) => a + t.total - t.paid, 0); return <tr key={x.id} className="hover:bg-card-2 cursor-pointer" onClick={() => setSel(x.id)}>
        <td className="font-semibold">{x.name}</td><td>{x.category}</td><td>{x.contact}<div className="text-xs text-muted">{x.phone}</div></td><td>{x.terms}</td><td>{ugxShort(ts.reduce((a, t) => a + t.total, 0))}</td><td>{owed ? <Badge tone="gold">{ugxShort(owed)}</Badge> : '—'}</td>
        <td><Btn size="sm" variant="soft" onClick={(e) => { e.stopPropagation(); setBuy({ supplierId: x.id, party: x.name, phone: x.phone, category: OUT_CATS.includes(x.category) ? x.category : 'Building materials' }) }}>Buy</Btn></td></tr> })}
    </Table></Card>
    <Sheet open={add} onClose={() => setAdd(false)} title="Add supplier">
      <div className="space-y-3">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Supplies"><select className={inputCls} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{OUT_CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Contact person"><input className={inputCls} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field><Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field></div>
        <Field label="Payment terms"><select className={inputCls} value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })}>{['Cash on delivery', '7 days', '30 days', 'Prepaid'].map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Btn block size="lg" disabled={!f.name} onClick={() => { const id = `SUP-${list(db, 'suppliers').length + 1}-${Date.now().toString(36).slice(-3).toUpperCase()}`; put('suppliers', { id, ...f }); audit(`Added supplier ${f.name}`, 'Suppliers'); toast('Supplier added'); setAdd(false); setF({ ...f, name: '', phone: '', contact: '' }) }}>Save</Btn>
      </div>
    </Sheet>
    <Sheet wide open={!!s} onClose={() => setSel(null)} title={s?.name}>{s && <>
      <div className="text-sm text-muted mb-3">{s.category} · {s.contact} · {s.phone} · {s.terms}</div>
      <Table head={['Voucher', 'Date', 'Items', 'Total', 'Paid', '']}>{of(s.id).map((t) => <tr key={t.id}><td className="font-mono text-xs">{t.no}</td><td className="text-xs">{fmtDate(t.at)}</td><td>{t.lines.map((l) => l.desc).join(', ')}</td><td>{num(t.total)}</td><td>{num(t.paid)}</td><td><Btn size="sm" variant="ghost" icon={<Printer size={14} />} onClick={() => setView(docFromTxn(db, t))}>View</Btn></td></tr>)}</Table>
      {!of(s.id).length && <Empty>No purchases yet</Empty>}
    </>}</Sheet>
    <TxnFlow open={!!buy} dir="out" preset={buy ?? undefined} onClose={() => setBuy(null)} />
    <DocSheet doc={view} onClose={() => setView(null)} />
  </>)
}

