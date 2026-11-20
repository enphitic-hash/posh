import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Plus, Sparkles, Send, Phone, Search, FileText } from 'lucide-react'
import { useStore, list } from '../data/store'
import type { PayMethod, Tenant } from '../data/types'
import { monthTotals, riskList, lateRisk, sendMessage, tenantDue } from '../lib/logic'
import { ugx, ugxShort, num, fmtDT, monthLabel, currentRentMonth, fmtDate } from '../lib/format'
import { statementPdf, receiptPdf } from '../lib/pdf'
import { ESTATE_LIST } from '../data/seed'
import { Card, Stat, Badge, Btn, Sheet, toast, cx, Chips, statusTone, Avatar, Progress } from '../components/ui'
import { RentFlow } from './Money'
import { PageHead, Table } from './Office'

const METHODS: PayMethod[] = ['MTN MoMo', 'Airtel Money', 'Bank transfer', 'Visa', 'Mastercard', 'Posh Wallet', 'Cash']

function csv(rows: (string | number)[][], name: string) {
  const s = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/csv' })); a.download = name; a.click()
}

export function Rentals() {
  const db = useStore((s) => s.db)
  const last = useStore((s) => s.lastChange)
  const [sp] = useSearchParams()
  const cur = currentRentMonth()
  const months = Array.from(new Set(['2026-11', cur])).sort()
  const [month, setMonth] = useState(cur)
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [estate, setEstate] = useState('All')
  const [open, setOpen] = useState(false)
  const tot = monthTotals(db, month)
  const s = q.toLowerCase()
  const pays = tot.pays.filter((p) => (estate === 'All' || db.units[p.unitId]?.estate === estate) && (!s || db.tenants[p.tenantId]?.name.toLowerCase().includes(s) || p.receipt.toLowerCase().includes(s) || p.ref.toLowerCase().includes(s) || db.units[p.unitId]?.name.toLowerCase() === s)).sort((a, b) => b.at.localeCompare(a.at))
  const byMethod = METHODS.map((m) => ({ m, n: tot.pays.filter((p) => p.method === m).length })).filter((x) => x.n)
  const tapPct = tot.pays.length ? Math.round((tot.pays.filter((p) => p.via === 'Card tap').length / tot.pays.length) * 100) : 0
  const estates = ESTATE_LIST.map((e) => { const units = list(db, 'units').filter((u) => u.estate === e && u.tenantId); const paid = new Set(tot.pays.map((p) => p.unitId)); return { e, pct: units.length ? Math.round((units.filter((u) => paid.has(u.id)).length / units.length) * 100) : 0, n: units.length } })
  useEffect(() => { if (location.hash.endsWith('#ai')) document.getElementById('ai')?.scrollIntoView({ behavior: 'smooth' }) }, [])
  return (<>
    <PageHead title="Rent & payments" sub={`${tot.units} units · ${new Set(list(db, 'units').map((u) => u.estate)).size} estates · live`} actions={<>
      <Chips options={months.map((m) => monthLabel(m))} value={monthLabel(month)} onChange={(v) => setMonth(months.find((m) => monthLabel(m) === v)!)} />
      <Btn variant="outline" icon={<Download size={16} />} onClick={() => csv([['Receipt', 'Date', 'Tenant', 'Estate', 'Unit', 'Amount', 'Method', 'Ref', 'Via', 'Status'], ...pays.map((p) => [p.receipt, fmtDT(p.at), db.tenants[p.tenantId]?.name, db.units[p.unitId]?.estate, db.units[p.unitId]?.name, p.amount, p.method, p.ref, p.via, p.status])], `posh-payments-${month}.csv`)}>Export</Btn>
      <Btn icon={<Plus size={16} />} onClick={() => setOpen(true)}>Take rent payment</Btn>
    </>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat label="Rent due" value={ugxShort(tot.due)} sub={`${tot.let} let · ${tot.vacant} vacant`} />
      <Stat label="Collected" value={ugxShort(tot.collected)} sub={`${tot.pct}% collected`} tone="up" />
      <Stat label="Not yet paid" value={ugxShort(tot.overdue)} sub={`${tot.overdueCount} tenants`} tone="down" />
      <Stat label="Paid by Posh card tap" value={`${tapPct}%`} sub={`${tot.pays.length} payments`} />
    </div>
    <div className="grid xl:grid-cols-3 gap-4 mt-4">
      <Card className="xl:col-span-2">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <h3 className="font-bold mr-auto">Live payments</h3>
          <div className="flex items-center gap-2 h-9 rounded-lg border border-line px-2"><Search size={14} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tenant, unit or receipt" className="bg-transparent outline-none text-sm w-40" /></div>
          <select value={estate} onChange={(e) => setEstate(e.target.value)} className="h-9 rounded-lg border border-line bg-card text-sm px-2"><option>All</option>{ESTATE_LIST.map((e) => <option key={e}>{e}</option>)}</select>
        </div>
        <div className="max-h-[520px] overflow-y-auto">
          <Table head={['Time', 'Tenant', 'Amount', 'Method', 'Via', 'Status', '']}>
            {pays.slice(0, 120).map((p) => <tr key={p.id} className={cx(last?.id === p.id && 'flash')}>
              <td className="text-muted whitespace-nowrap">{fmtDT(p.at)}</td>
              <td className="whitespace-nowrap"><div className="font-semibold">{db.tenants[p.tenantId]?.name}</div><div className="text-xs text-muted">{db.units[p.unitId]?.estate.replace('Posh ', '')} {db.units[p.unitId]?.name}</div></td>
              <td className="font-semibold">{num(p.amount)}</td>
              <td className="whitespace-nowrap">{p.method}</td>
              <td>{p.via === 'Card tap' ? <Badge tone="green">Card tap</Badge> : <span className="text-muted">{p.via}</span>}</td>
              <td><Badge tone={statusTone(p.status)}>{p.status === 'Part' ? 'Part 1 of 2' : p.status}</Badge></td>
              <td><button className="text-brand" title="Receipt PDF" onClick={() => receiptPdf(db, p)}><FileText size={16} /></button></td>
            </tr>)}
          </Table>
          {pays.length === 0 && <div className="text-center text-muted text-sm py-8">No payments yet for {monthLabel(month, true)}.</div>}
        </div>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-bold mb-3">Collection by estate</h3>
          <div className="space-y-3">{estates.map((e) => <div key={e.e}><div className="flex justify-between text-sm"><span>{e.e.replace('Posh ', '')}</span><span className="font-semibold">{e.pct}%</span></div><Progress value={e.pct} tone={e.pct < 60 ? 'gold' : 'green'} /></div>)}</div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold mb-3">How tenants pay</h3>
          <div className="flex h-4 rounded-full overflow-hidden">{byMethod.map((m, i) => <div key={m.m} title={m.m} style={{ width: `${(m.n / tot.pays.length) * 100}%`, background: ['#FFCB05', '#E40000', '#136734', '#1A1F71', '#F79E1B', '#2FA35A', '#8A8A8A'][METHODS.indexOf(m.m)] ?? '#999' }} className={cx(i && 'border-l border-white/40')} />)}</div>
          <div className="grid grid-cols-2 gap-1 mt-3 text-xs">{byMethod.map((m) => <div key={m.m} className="flex justify-between"><span className="text-muted">{m.m}</span><b>{Math.round((m.n / tot.pays.length) * 100)}%</b></div>)}</div>
        </Card>
      </div>
    </div>
    <AiPanel month={month} />
    <RentFlow open={open} onClose={() => setOpen(false)} />
  </>)
}

function AiPanel({ month }: { month: string }) {
  const db = useStore((s) => s.db)
  const risks = riskList(db, 50)
  const [sel, setSel] = useState<string[]>([])
  const [calls, setCalls] = useState(false)
  useEffect(() => setSel(risks.map((r) => r.tenantId)), [risks.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const send = () => {
    sel.forEach((id) => { const t = db.tenants[id]; const d = tenantDue(db, t, month); sendMessage({ to: t.name, phone: t.phone, channel: 'WhatsApp', kind: 'reminder', text: `Hello ${t.name.split(' ')[1] ?? t.name}, a friendly reminder from Posh: ${monthLabel(month, true)} rent of ${ugx(d.balance)} is due on the 1st. Tap your Posh card on your phone or pay by MoMo in the Posh app. You can split it into 2 payments. Thank you!` }) })
    toast(`Friendly reminders sent to ${sel.length} tenants on WhatsApp`)
  }
  return (
    <Card className="mt-4 p-5" >
      <div id="ai" className="flex flex-wrap items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-brand text-white grid place-items-center"><Sparkles size={18} /></span>
        <div className="mr-auto"><h3 className="font-bold">Posh AI · {risks.length} tenants likely to pay late for {monthLabel(month, true)}</h3><div className="text-sm text-muted">Based on 6 months of payment history. Reminders go out 3 days before the 1st.</div></div>
        <Btn variant="outline" icon={<Phone size={16} />} onClick={() => setCalls(true)}>Call list</Btn>
        <Btn icon={<Send size={16} />} disabled={!sel.length} onClick={send}>Send friendly reminders ({sel.length})</Btn>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2 mt-4">{risks.map((r) => { const t = db.tenants[r.tenantId]; const u = db.units[t.unitId]; const on = sel.includes(t.id); return (
        <label key={t.id} className={cx('flex gap-3 p-3 rounded-xl border cursor-pointer', on ? 'border-brand bg-brand-soft/40' : 'border-line')}>
          <input type="checkbox" checked={on} onChange={() => setSel(on ? sel.filter((x) => x !== t.id) : [...sel, t.id])} className="mt-1 accent-[var(--brand)]" />
          <div className="flex-1 min-w-0"><div className="flex justify-between gap-2"><span className="font-semibold truncate">{t.name}</span><Badge tone={r.score > 75 ? 'red' : 'gold'}>{r.score}% risk</Badge></div><div className="text-xs text-muted">{u.estate.replace('Posh ', '')} {u.name} · {ugx(u.rent + u.service)}</div><ul className="text-xs text-muted mt-1 list-disc pl-4">{r.reasons.slice(0, 2).map((x) => <li key={x}>{x}</li>)}</ul></div>
        </label>) })}</div>
      <Sheet open={calls} onClose={() => setCalls(false)} title="Call list">
        <div className="space-y-2">{risks.map((r) => { const t = db.tenants[r.tenantId]; return <a key={t.id} href={`tel:${t.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 p-2 rounded-xl hover:bg-card-2"><Avatar name={t.name} size={36} tone={r.score > 75 ? 'red' : 'gold'} /><div className="flex-1"><div className="font-semibold text-sm">{t.name}</div><div className="text-xs text-muted">{t.phone}</div></div><Phone size={16} className="text-brand" /></a> })}</div>
      </Sheet>
    </Card>
  )
}

export function Tenants() {
  const db = useStore((s) => s.db)
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState('')
  const sel = sp.get('id')
  const ts = useMemo(() => list(db, 'tenants').filter((t) => !q || t.name.toLowerCase().includes(q.toLowerCase()) || db.units[t.unitId]?.name.toLowerCase() === q.toLowerCase()).sort((a, b) => a.name.localeCompare(b.name)), [db, q])
  const t = sel ? db.tenants[sel] : undefined
  return (<>
    <PageHead title="Tenants" sub={`${ts.length} tenants`} actions={<div className="flex items-center gap-2 h-10 rounded-xl border border-line px-3 bg-card"><Search size={16} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or unit" className="bg-transparent outline-none text-sm" /></div>} />
    <Card>
      <Table head={['Tenant', 'Phone', 'Home', 'Rent', 'Lease to', 'This month', 'Risk']}>
        {ts.map((x) => { const u = db.units[x.unitId]; const d = tenantDue(db, x); const r = lateRisk(db, x); return (
          <tr key={x.id} className="hover:bg-card-2 cursor-pointer" onClick={() => setSp({ id: x.id })}>
            <td className="font-semibold whitespace-nowrap">{x.name}</td><td className="text-muted whitespace-nowrap">{x.phone}</td><td className="whitespace-nowrap">{u.estate.replace('Posh ', '')} {u.name}</td><td>{num(u.rent)}</td><td className="text-muted">{fmtDate(x.leaseEnd, { month: 'short', year: 'numeric' })}</td>
            <td>{d.balance === 0 ? <Badge tone="green">Paid</Badge> : d.paid ? <Badge tone="gold">Part</Badge> : <Badge>Due</Badge>}</td><td><Badge tone={r.score >= 75 ? 'red' : r.score >= 50 ? 'gold' : 'green'}>{r.score}%</Badge></td>
          </tr>) })}
      </Table>
    </Card>
    <Sheet wide open={!!t} onClose={() => setSp({})} title={t?.name}>{t && <TenantDetail t={t} />}</Sheet>
  </>)
}

function TenantDetail({ t }: { t: Tenant }) {
  const db = useStore((s) => s.db)
  const u = db.units[t.unitId]
  const r = lateRisk(db, t)
  const pays = list(db, 'payments').filter((p) => p.tenantId === t.id).sort((a, b) => b.at.localeCompare(a.at))
  const card = t.cardId ? db.cards[t.cardId] : undefined
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-2 text-sm">
        <Card className="p-3"><div className="text-xs text-muted">Home</div><div className="font-semibold">{u.estate} {u.name}</div><div className="text-xs text-muted">{ugx(u.rent)}/mo</div></Card>
        <Card className="p-3"><div className="text-xs text-muted">Card</div><div className="font-semibold font-mono text-xs">{card?.id ?? '—'}</div>{card && <Badge tone={statusTone(card.status)}>{card.status}</Badge>}</Card>
        <Card className="p-3"><div className="text-xs text-muted">Late-payment risk</div><div className="font-semibold">{r.score}%</div><div className="text-xs text-muted">{r.reasons[0]}</div></Card>
      </div>
      <div className="flex gap-1 items-end h-16">{t.history.map((d, i) => <div key={i} className="flex-1 flex flex-col items-center gap-1"><div className={cx('w-full rounded', d > 5 ? 'bg-posh-red' : d > 0 ? 'bg-gold' : 'bg-brand')} style={{ height: 6 + d * 2.5 }} /><span className="text-[10px] text-muted">{['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'][i]}</span></div>)}</div>
      <div className="text-xs text-muted -mt-2">Days late each month</div>
      <Table head={['Receipt', 'Month', 'Amount', 'Method', 'Date']}>{pays.map((p) => <tr key={p.id}><td className="font-mono text-xs">{p.receipt}</td><td>{monthLabel(p.month)}</td><td>{num(p.amount)}</td><td>{p.method}</td><td className="text-muted">{fmtDT(p.at)}</td></tr>)}</Table>
    </div>
  )
}

export function Landlords() {
  const db = useStore((s) => s.db)
  const [month, setMonth] = useState('2026-11')
  return (<>
    <PageHead title="Landlords" sub="Statements and payouts" actions={<Chips options={['2026-10', '2026-11', currentRentMonth()].filter((v, i, a) => a.indexOf(v) === i).map((m) => monthLabel(m))} value={monthLabel(month)} onChange={(v) => setMonth(['2026-10', '2026-11', currentRentMonth()].find((m) => monthLabel(m) === v)!)} />} />
    <div className="grid md:grid-cols-2 gap-3">{list(db, 'landlords').map((l) => {
      const units = list(db, 'units').filter((u) => u.landlordId === l.id)
      const gross = list(db, 'payments').filter((p) => p.month === month && units.some((u) => u.id === p.unitId)).reduce((a, p) => a + p.amount, 0)
      return (
        <Card key={l.id} className="p-5">
          <div className="flex items-center gap-3"><Avatar name={l.name} /><div className="flex-1"><div className="font-bold">{l.name}</div><div className="text-sm text-muted">{units.length} units · {l.phone}</div></div></div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-sm"><div><div className="text-xs text-muted">Collected</div><b>{ugxShort(gross)}</b></div><div><div className="text-xs text-muted">Posh fee 10%</div><b>{ugxShort(gross * 0.1)}</b></div><div><div className="text-xs text-muted">Payout ({l.payoutDay}th)</div><b className="text-brand">{ugxShort(gross * 0.9)}</b></div></div>
          <div className="flex gap-2 mt-4"><Btn size="sm" variant="outline" icon={<Download size={14} />} onClick={() => statementPdf(db, l.id, month)}>Statement PDF</Btn><Btn size="sm" variant="soft" icon={<Send size={14} />} onClick={() => { sendMessage({ to: l.name, phone: l.phone, channel: 'WhatsApp', kind: 'statement', text: `Posh: your ${monthLabel(month, true)} statement is ready. Collected ${ugx(gross)}, payout ${ugx(gross * 0.9)} on the ${l.payoutDay}th.` }); toast(`Statement sent to ${l.name}`) }}>Send on WhatsApp</Btn></div>
        </Card>) })}</div>
  </>)
}
