import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Download, AlertTriangle, CheckCircle2, Scale } from 'lucide-react'
import { useStore, list } from '../data/store'
import { DEMO_LANDLORD } from '../data/seed'
import { ugx, monthLabel, num, currentRentMonth } from '../lib/format'
import { statementPdf } from '../lib/pdf'
import { Card, Btn, Badge, Bars, Section, Chips, toast, cx } from '../components/ui'
import { TopBar, Screen, NfcButton } from './MobileApp'

const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']

function Statement() {
  const db = useStore((s) => s.db)
  const l = db.landlords[DEMO_LANDLORD]
  const units = list(db, 'units').filter((u) => u.landlordId === l.id)
  const cur = currentRentMonth()
  const months = MONTHS.filter((m) => m <= cur)
  const [month, setMonth] = useState(months.includes('2026-11') ? '2026-11' : months[months.length - 1])
  const pays = list(db, 'payments').filter((p) => units.some((u) => u.id === p.unitId))
  const inMonth = pays.filter((p) => p.month === month)
  const gross = inMonth.reduce((a, p) => a + p.amount, 0)
  const fee = Math.round(gross * 0.1)
  const series = months.map((m) => ({ label: monthLabel(m).split(' ')[0], value: pays.filter((p) => p.month === m).reduce((a, p) => a + p.amount, 0) / 1e6 }))
  const yearGross = units.reduce((a, u) => a + u.rent * 12, 0)
  const threshold = 2820000
  const tax = Math.round((yearGross - threshold) * 0.12)
  const leaseOk = units.filter((u) => u.tenantId).length
  return (<>
    <TopBar title="Landlord statement" sub={`${l.name} · ${units.length} units · Ntinda`} right={<NfcButton />} />
    <Screen>
      <Chips options={months.map((m) => monthLabel(m))} value={monthLabel(month)} onChange={(v) => setMonth(months.find((m) => monthLabel(m) === v)!)} />
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Card className="p-4"><div className="text-xs text-muted">Rent collected</div><div className="text-xl font-extrabold">{ugx(gross)}</div><div className="text-xs text-brand font-semibold">{new Set(inMonth.map((p) => p.unitId)).size} of {units.filter((u) => u.tenantId).length} paid · {inMonth.filter((p) => p.method.includes('Money') || p.method.includes('MoMo')).length} by MoMo</div></Card>
        <Card className="p-4"><div className="text-xs text-muted">Paid to you</div><div className="text-xl font-extrabold">{ugx(gross - fee)}</div><div className="text-xs text-muted">on the {l.payoutDay}th · fee {ugx(fee)}</div></Card>
      </div>
      <Card className="p-4 mt-3"><div className="flex justify-between text-sm mb-2"><span className="font-bold">Rent by month (UGX m)</span></div><Bars data={series} /></Card>
      <Section title="Units">
        <Card>{units.map((u, i) => { const p = inMonth.find((x) => x.unitId === u.id); const t = u.tenantId ? db.tenants[u.tenantId] : undefined; return (
          <div key={u.id} className={cx('p-3 flex items-center gap-3 text-sm', i && 'border-t border-line')}>
            <div className="flex-1"><div className="font-semibold">{u.estate.replace('Posh ', '')} {u.name}</div><div className="text-xs text-muted">{t?.name ?? 'Vacant'} · {num(u.rent)}</div></div>
            {p ? <Badge tone="green">Paid · {p.method}</Badge> : t ? <Badge tone="red">Unpaid</Badge> : <Badge>Vacant</Badge>}
          </div>) })}</Card>
      </Section>
      <Section title="URA rental tax 2026/27">
        <Card className="p-4 text-sm space-y-1.5">
          <div className="flex justify-between"><span className="text-muted">Gross rent (year)</span><span>{ugx(yearGross)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Less threshold</span><span>− {ugx(threshold)}</span></div>
          <div className="flex justify-between font-bold"><span>Tax at 12%</span><span>{ugx(tax)}</span></div>
          <div className="text-xs text-muted pt-1">Receipts and leases are attached to your URA return.</div>
        </Card>
      </Section>
      <Section title="Tenant law checks">
        <Card className="p-4 text-sm space-y-2">
          <div className="flex gap-2"><CheckCircle2 size={18} className="text-brand shrink-0" />Written lease for rent of UGX 500,000+ a month: {leaseOk}/{leaseOk} compliant</div>
          <div className="flex gap-2"><AlertTriangle size={18} className="text-gold shrink-0" />Your planned 12% rise in January is above the 10% yearly limit unless the tenant agrees.</div>
          <div className="flex gap-2"><Scale size={18} className="text-muted shrink-0" />Landlord and Tenant Act 2022</div>
        </Card>
      </Section>
      <Btn block size="lg" className="mt-4" icon={<Download size={18} />} onClick={() => statementPdf(db, l.id, month).then(() => toast('Statement downloaded')).catch(() => toast('Could not make the PDF', 'warn'))}>Download {monthLabel(month)} statement (PDF)</Btn>
    </Screen>
  </>)
}

function Units() {
  const db = useStore((s) => s.db)
  const units = list(db, 'units').filter((u) => u.landlordId === DEMO_LANDLORD)
  return (<>
    <TopBar title="My units" sub="Managed by Posh" />
    <Screen className="space-y-2">
      {units.map((u) => { const t = u.tenantId ? db.tenants[u.tenantId] : undefined; return (
        <Card key={u.id} className="p-4">
          <div className="flex justify-between"><div className="font-bold">{u.estate} · {u.name}</div><Badge tone={t ? 'green' : 'gold'}>{t ? 'Let' : 'Vacant'}</Badge></div>
          <div className="text-sm text-muted mt-1">{u.beds} bed · {ugx(u.rent)}/mo</div>
          {t && <div className="text-sm mt-2">{t.name} · lease to {new Date(t.leaseEnd).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>}
        </Card>) })}
    </Screen>
  </>)
}

export default function Landlord() {
  return (
    <Routes>
      <Route path="statement" element={<Statement />} />
      <Route path="units" element={<Units />} />
      <Route path="*" element={<Navigate to="/app/statement" replace />} />
    </Routes>
  )
}
