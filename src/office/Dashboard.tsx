import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Handshake, HardHat, Wallet, Scale, ShieldCheck, Sparkles, Nfc, Activity, ArrowRight } from 'lucide-react'
import { useStore, list } from '../data/store'
import { usePrefs } from '../data/prefs'
import { monthTotals, riskList } from '../lib/logic'
import { ugxShort, ugx, fmtTime, ago, currentRentMonth, monthLabel } from '../lib/format'
import { Card, Stat, Badge, Progress, statusTone, Btn, cx, useNow } from '../components/ui'
import { PageHead, Table } from './Office'

export default function Dashboard() {
  const db = useStore((s) => s.db)
  const last = useStore((s) => s.lastChange)
  const me = db.staff[usePrefs.getState().officeStaffId!]
  const nav = useNavigate()
  useNow(20000)
  const month = currentRentMonth()
  const rent = monthTotals(db, month)
  const prev = monthTotals(db, '2026-11')
  const deals = list(db, 'deals')
  const closed = deals.filter((d) => d.stage === 'Closed')
  const sites = list(db, 'sites')
  const behind = sites.filter((s) => s.daysLate > 0)
  const vals = list(db, 'valuations').filter((v) => v.status !== 'Done')
  const props = list(db, 'properties')
  const risk = riskList(db, 55).slice(0, 4)
  const taps = list(db, 'taps').filter((t) => t.kind === 'Plaque').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5)
  const feed = useMemo(() => {
    const items = [
      ...list(db, 'payments').map((p) => ({ at: p.at, text: `${db.tenants[p.tenantId]?.name} paid ${ugx(p.amount)} by ${p.method}`, tone: 'green' as const, k: p.id })),
      ...list(db, 'repairs').map((r) => ({ at: r.createdAt, text: `Repair: ${r.title} · ${r.estate.replace('Posh ', '')}`, tone: 'gold' as const, k: r.id })),
      ...list(db, 'viewings').map((v) => ({ at: v.createdAt, text: `Viewing booked: ${db.listings[v.listingId]?.title} · ${v.date} ${v.time}`, tone: 'blue' as const, k: v.id })),
      ...list(db, 'taps').filter((t) => t.kind === 'Plaque' || t.kind === 'Pay').map((t) => ({ at: t.at, text: `${t.kind === 'Pay' ? 'Card tap to pay' : 'Plaque tap'} · ${t.place}`, tone: 'gray' as const, k: t.id })),
    ]
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  }, [db])
  const hour = Number(new Date().toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Africa/Kampala' }))
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const revenue = [
    { k: 'Management fees', v: rent.collected * 0.1 + prev.collected * 0.1, c: 'bg-brand' },
    { k: 'Construction', v: sites.reduce((a, s) => a + s.paid, 0) * 0.04, c: 'bg-gold' },
    { k: 'Sales fees', v: closed.reduce((a, d) => a + d.value, 0), c: 'bg-sky-500' },
    { k: 'Valuation', v: 23 * 1800000, c: 'bg-ink' },
    { k: 'Home Finance', v: 2 * 9500000, c: 'bg-posh-red' },
  ]
  const revMax = Math.max(...revenue.map((r) => r.v))
  const funnel = (['Enquiry', 'Viewing', 'Offer', 'Closed'] as const).map((s) => ({ s, n: deals.filter((d) => d.stage === s).length + (s === 'Enquiry' ? 44 : s === 'Viewing' ? 12 : 0) }))
  return (<>
    <PageHead title={`${greet}, ${me.name.split(' ')[0] === 'Hajji' ? 'Hajji' : me.name.split(' ')[0]}`} sub={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kampala' }) + ' · every Posh business, live'} actions={<><Btn variant="outline" onClick={() => nav('/office/purchases')}>Record a purchase</Btn><Btn variant="outline" onClick={() => nav('/office/finance')}>Finance</Btn><Btn onClick={() => nav('/office/cashier')}>Open cashier</Btn></>} />
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
      <Stat icon={<Handshake size={16} />} label="Sales this month" value={ugxShort(closed.reduce((a, d) => a + (d.value / 0.05), 0))} sub={`${closed.length} deals closed`} tone="up" />
      <Stat icon={<HardHat size={16} />} label="Active sites" value={sites.length} sub={behind.length ? `${behind.length} behind schedule` : 'all on schedule'} tone={behind.length ? 'down' : 'up'} />
      <Stat icon={<Wallet size={16} />} label={`Rent · ${monthLabel(month)}`} value={ugxShort(rent.collected)} sub={`${rent.pct}% of ${ugxShort(rent.due)} · ${rent.units} units`} tone="up" />
      <Stat icon={<Scale size={16} />} label="Valuations open" value={vals.length} sub={`${vals.filter((v) => v.bank).length} for banks`} />
      <Stat icon={<ShieldCheck size={16} />} label="Posh Passports" value={(1270 + props.length).toLocaleString()} sub={`${list(db, 'taps').filter((t) => t.kind === 'Plaque').length} plaque taps today`} />
    </div>

    <div className="grid xl:grid-cols-3 gap-4 mt-4">
      <Card className="p-5 xl:col-span-2">
        <div className="flex justify-between items-center"><h3 className="font-bold">Revenue by business · this month</h3><Badge tone="green">UGX</Badge></div>
        <div className="mt-4 space-y-3">{revenue.map((r) => <div key={r.k} className="grid grid-cols-[140px_1fr_90px] items-center gap-3 text-sm"><span className="text-muted">{r.k}</span><div className="h-3 rounded-full bg-card-2 overflow-hidden"><div className={cx('h-full rounded-full', r.c)} style={{ width: `${(r.v / revMax) * 100}%` }} /></div><span className="font-semibold text-right">{ugxShort(r.v)}</span></div>)}</div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-brand text-white grid place-items-center"><Sparkles size={16} /></span><h3 className="font-bold">Posh AI · likely to pay late</h3></div>
        <div className="mt-3 space-y-2">{risk.map((r) => { const t = db.tenants[r.tenantId]; const u = db.units[t.unitId]; return (
          <div key={r.tenantId} className="flex items-center gap-3 text-sm"><div className="flex-1 min-w-0"><div className="font-semibold truncate">{t.name}</div><div className="text-xs text-muted truncate">{u.estate.replace('Posh ', '')} {u.name} · {r.reasons[0]}</div></div><Badge tone={r.score > 75 ? 'red' : 'gold'}>{r.score}%</Badge></div>) })}</div>
        <Btn block variant="soft" className="mt-4" onClick={() => nav('/office/rentals#ai')}>Send friendly reminders <ArrowRight size={16} /></Btn>
      </Card>
    </div>

    <div className="grid xl:grid-cols-3 gap-4 mt-4">
      <Card className="xl:col-span-2">
        <div className="flex justify-between items-center p-5 pb-2"><h3 className="font-bold">Construction sites</h3><button onClick={() => nav('/office/construction')} className="text-sm font-semibold text-brand">All {sites.length}</button></div>
        <Table head={['Site', 'Client', 'Manager', 'Progress', 'Status']}>
          {sites.slice(0, 5).map((s) => <tr key={s.id} className="hover:bg-card-2 cursor-pointer" onClick={() => nav(`/office/construction?id=${s.id}`)}><td className="font-semibold">{s.name}</td><td>{s.client}</td><td className="text-muted">{s.manager}</td><td className="w-40"><div className="flex items-center gap-2"><Progress value={s.progress} tone={s.daysLate ? 'red' : 'green'} /><span className="text-xs w-8">{s.progress}%</span></div></td><td><Badge tone={s.daysLate ? 'red' : 'green'}>{s.daysLate ? `${s.daysLate} days late` : 'On schedule'}</Badge></td></tr>)}
        </Table>
      </Card>
      <Card className="p-5">
        <h3 className="font-bold">Sales pipeline</h3>
        <div className="mt-4 space-y-2">{funnel.map((f, i) => <div key={f.s} className="flex items-center gap-3"><div className="h-9 rounded-lg bg-brand text-white text-sm font-bold flex items-center px-3" style={{ width: `${100 - i * 18}%`, opacity: 1 - i * 0.15 }}>{f.n}</div><span className="text-sm text-muted">{f.s}</span></div>)}</div>
        <div className="text-xs text-muted mt-3">{funnel.reduce((a, b) => a + b.n, 0)} open · leads from WhatsApp, app, plaque taps</div>
      </Card>
    </div>

    <div className="grid xl:grid-cols-2 gap-4 mt-4">
      <Card>
        <div className="flex items-center gap-2 p-5 pb-2"><Nfc size={18} className="text-brand" /><h3 className="font-bold">Latest plaque taps</h3></div>
        <Table head={['Time', 'Property', 'Who', 'Result']}>
          {taps.map((t) => <tr key={t.id} className={cx(last?.id === t.id && 'flash')}><td className="text-muted whitespace-nowrap">{fmtTime(t.at)}</td><td className="font-semibold">{t.place}</td><td className="text-muted">{t.who}</td><td><Badge tone={statusTone(t.result)}>{t.result === 'OK' ? 'Genuine' : t.result}</Badge></td></tr>)}
        </Table>
      </Card>
      <Card>
        <div className="flex items-center gap-2 p-5 pb-2"><Activity size={18} className="text-brand" /><h3 className="font-bold">Live activity</h3></div>
        <div className="px-5 pb-4 space-y-1">{feed.map((f) => <div key={f.k} className={cx('flex items-center gap-3 text-sm py-1.5 rounded-lg', last?.id === f.k && 'flash')}><span className={cx('w-2 h-2 rounded-full shrink-0', f.tone === 'green' ? 'bg-brand' : f.tone === 'gold' ? 'bg-gold' : f.tone === 'blue' ? 'bg-sky-500' : 'bg-muted')} /><span className="flex-1 truncate">{f.text}</span><span className="text-xs text-muted whitespace-nowrap">{ago(f.at)}</span></div>)}</div>
      </Card>
    </div>
  </>)
}
