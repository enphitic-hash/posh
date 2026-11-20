import { useState } from 'react'
import { Wrench, Zap, Camera, Star } from 'lucide-react'
import { useStore, list } from '../data/store'
import type { Repair } from '../data/types'
import { sendMessage } from '../lib/logic'
import { ago, nowIso, fmtDT, ugx, num } from '../lib/format'
import { Card, Badge, Btn, Sheet, Field, inputCls, toast, cx } from '../components/ui'
import { PageHead } from './Office'

const COLS: Repair['status'][] = ['Reported', 'Assigned', 'Booked', 'In progress', 'Done']

export default function Repairs() {
  const db = useStore((s) => s.db)
  const last = useStore((s) => s.lastChange)
  const [sel, setSel] = useState<string | null>(null)
  const [estate, setEstate] = useState('All')
  const rs = list(db, 'repairs').filter((r) => estate === 'All' || r.estate === estate).sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.createdAt.localeCompare(a.createdAt))
  const estates = Array.from(new Set(list(db, 'repairs').map((r) => r.estate)))
  return (<>
    <PageHead title="Repairs" sub={`${rs.filter((r) => r.status !== 'Done').length} open · ${rs.filter((r) => r.urgent && r.status !== 'Done').length} urgent`} actions={<select value={estate} onChange={(e) => setEstate(e.target.value)} className="h-10 rounded-xl border border-line bg-card px-3 text-sm"><option>All</option>{estates.map((e) => <option key={e}>{e}</option>)}</select>} />
    <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 overflow-x-auto pb-3">
      {COLS.map((c) => { const items = rs.filter((r) => r.status === c); return (
        <div key={c} className="bg-card-2 rounded-2xl p-2 min-h-[300px]">
          <div className="flex justify-between items-center px-2 py-1.5"><span className="font-bold text-sm">{c}</span><Badge>{items.length}</Badge></div>
          <div className="space-y-2">{items.map((r) => { const t = r.tenantId ? db.tenants[r.tenantId] : undefined; const tech = r.technicianId ? db.technicians[r.technicianId] : undefined; return (
            <Card key={r.id} onClick={() => setSel(r.id)} className={cx('p-3', last?.id === r.id && 'flash')}>
              <div className="flex gap-2 items-start"><div className="flex-1 font-semibold text-sm">{r.title}</div>{r.urgent && <Badge tone="red"><Zap size={10} />Urgent</Badge>}</div>
              <div className="text-xs text-muted mt-1">{r.estate.replace('Posh ', '')} {r.unitId ? db.units[r.unitId]?.name : ''} · {t?.name}</div>
              <div className="flex items-center gap-2 mt-2 text-xs">{r.photos.length > 0 && <span className="flex items-center gap-1 text-muted"><Camera size={12} />{r.photos.length}</span>}<span className="text-muted">{ago(r.createdAt)}</span>{tech && <span className="ml-auto font-semibold">{tech.name.split(' ')[0]}{r.slot ? ` · ${r.slot.split(',')[0]}` : ''}</span>}</div>
            </Card>) })}</div>
        </div>) })}
    </div>
    <Sheet wide open={!!sel} onClose={() => setSel(null)} title={sel ? db.repairs[sel]?.title : ''}>{sel && db.repairs[sel] && <RepairPanel r={db.repairs[sel]} onDone={() => setSel(null)} />}</Sheet>
  </>)
}

function RepairPanel({ r, onDone }: { r: Repair; onDone: () => void }) {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const t = r.tenantId ? db.tenants[r.tenantId] : undefined
  const techs = list(db, 'technicians').sort((a, b) => Number(b.trade.startsWith(r.category.slice(0, 4))) - Number(a.trade.startsWith(r.category.slice(0, 4))) || b.rating - a.rating)
  const [tech, setTech] = useState(r.technicianId ?? techs[0].id)
  const [slot, setSlot] = useState(r.slot ?? 'Tomorrow, 10:00')
  const [cost, setCost] = useState(r.cost ?? 0)
  const log = (text: string) => [...r.log, { at: nowIso(), text }]
  const assign = () => {
    const x = db.technicians[tech]
    patch('repairs', r.id, { technicianId: tech, slot, status: 'Booked', log: log(`Assigned to ${x.name} (${x.trade.toLowerCase()}) · booked ${slot}`) })
    if (t) sendMessage({ to: t.name, phone: t.phone, channel: 'WhatsApp', kind: 'repair', text: `Posh: Your ${x.trade.toLowerCase()} ${x.name.split(' ')[0]} is booked for ${slot} for "${r.title}". Call ${x.phone} if needed.` })
    sendMessage({ to: x.name, phone: x.phone, channel: 'SMS', kind: 'job', text: `Posh job ${r.id}: ${r.title} at ${r.estate} ${r.unitId ? db.units[r.unitId]?.name : ''}, ${slot}. Tenant ${t?.name} ${t?.phone}.` })
    toast(`${x.name} booked · tenant told on WhatsApp`); onDone()
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2"><Badge>{r.category}</Badge>{r.urgent && <Badge tone="red">Urgent</Badge>}<Badge tone="blue">{r.status}</Badge><span className="text-xs text-muted">{r.id} · {fmtDT(r.createdAt)}</span></div>
      <div className="text-sm"><b>{t?.name}</b> · {r.estate} {r.unitId ? db.units[r.unitId]?.name : ''} · {t?.phone}</div>
      {r.description && <p className="text-sm text-muted">{r.description}</p>}
      {r.photos.length > 0 && <div className="flex gap-2">{r.photos.map((p, i) => <a key={i} href={p} target="_blank" rel="noreferrer"><img src={p} alt="" className="w-28 h-28 rounded-xl object-cover" /></a>)}</div>}
      {r.status !== 'Done' && (
        <Card className="p-4 space-y-3">
          <div className="font-bold">Assign</div>
          <div className="grid sm:grid-cols-2 gap-2">{techs.slice(0, 4).map((x) => <button key={x.id} onClick={() => setTech(x.id)} className={cx('text-left p-3 rounded-xl border', tech === x.id ? 'border-brand bg-brand-soft/50' : 'border-line')}><div className="font-semibold text-sm">{x.name}</div><div className="text-xs text-muted flex items-center gap-1">{x.trade} · <Star size={11} className="fill-gold text-gold" />{x.rating} · {x.jobs} jobs</div></button>)}</div>
          <Field label="When"><select className={inputCls} value={slot} onChange={(e) => setSlot(e.target.value)}>{['Today, 16:00', 'Tomorrow, 09:00', 'Tomorrow, 10:00', 'Tomorrow, 14:00', 'Thu 26 Nov, 10:00', 'Fri 27 Nov, 11:00'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <div className="flex flex-wrap gap-2">
            <Btn icon={<Wrench size={16} />} onClick={assign}>{r.technicianId ? 'Rebook' : 'Assign and notify'}</Btn>
            {r.status === 'Booked' && <Btn variant="outline" onClick={() => { patch('repairs', r.id, { status: 'In progress', log: log('Work started') }); onDone() }}>Mark in progress</Btn>}
          </div>
        </Card>
      )}
      {r.status !== 'Done' && r.technicianId && (
        <Card className="p-4 flex flex-wrap items-end gap-2">
          <Field label="Cost (UGX)"><input className={inputCls} inputMode="numeric" value={cost ? num(cost) : ''} onChange={(e) => setCost(+e.target.value.replace(/\D/g, ''))} /></Field>
          <Btn variant="soft" onClick={() => { patch('repairs', r.id, { status: 'Done', doneAt: nowIso(), cost, log: log(`Fixed${cost ? ` · cost ${ugx(cost)} charged to landlord` : ''}`) }); if (t) sendMessage({ to: t.name, phone: t.phone, channel: 'WhatsApp', kind: 'repair', text: `Posh: "${r.title}" is marked fixed. Reply if anything is still wrong.` }); toast('Marked done'); onDone() }}>Mark done</Btn>
        </Card>
      )}
      <div><div className="font-bold text-sm mb-1">History</div>{r.log.slice().reverse().map((l, i) => <div key={i} className="text-sm py-1 border-b border-line last:border-0"><span className="text-muted text-xs mr-2">{fmtDT(l.at)}</span>{l.text}</div>)}</div>
    </div>
  )
}
