import { useState } from 'react'
import { useNavigate, useParams, Navigate, Link } from 'react-router-dom'
import { Plus, ExternalLink, Nfc, Building2, HardHat, Handshake, Scale, Landmark, Ruler, Search } from 'lucide-react'
import { useStore, list } from '../data/store'
import type { Biz, Property } from '../data/types'
import { ugxShort, fmtDate, ago, nowIso } from '../lib/format'
import { verifyUrl } from '../lib/logic'
import { Card, Stat, Badge, Btn, Chips, statusTone, Field, inputCls, toast, cx, PhotoTile, Sheet } from '../components/ui'
import { PageHead, Table } from './Office'

const ICON: Record<Biz, typeof Building2> = { Sales: Handshake, Construction: HardHat, Management: Building2, Valuation: Scale, Finance: Landmark, Survey: Ruler }

export function Passports() {
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const [tab, setTab] = useState<'All' | 'For sale' | 'Building' | 'Managed' | 'Finance'>('All')
  const [q, setQ] = useState('')
  const [add, setAdd] = useState(false)
  const props = list(db, 'properties')
  const map: Record<string, Biz[]> = { 'For sale': ['Sales'], Building: ['Construction'], Managed: ['Management'], Finance: ['Finance', 'Valuation'] }
  const shown = props.filter((p) => (tab === 'All' || map[tab].includes(p.stage)) && (!q || `${p.id} ${p.title} ${p.area} ${p.owner} ${p.titleNo}`.toLowerCase().includes(q.toLowerCase())))
  const taps = list(db, 'taps').filter((t) => t.kind === 'Plaque')
  return (<>
    <PageHead title="Posh Passports" sub="One record per property, across every Posh business" actions={<Btn icon={<Plus size={16} />} onClick={() => setAdd(true)}>New passport</Btn>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat label="Passports" value={(1270 + props.length).toLocaleString()} sub={`${props.length} shown in this demo`} />
      <Stat label="Value under Posh" value={ugxShort(props.reduce((a, p) => a + p.value, 0) + 590e9)} sub="latest valuations" tone="up" />
      <Stat label="Title searches" value={58} sub={`${props.filter((p) => p.titleStatus === 'Caveat').length} caveat flagged`} tone="down" />
      <Stat label="Plaque taps" value={taps.length + 8900} sub="last 30 days" />
    </div>
    <Card className="mt-4">
      <div className="flex flex-wrap items-center gap-2 p-4">
        <Chips options={['All', 'For sale', 'Building', 'Managed', 'Finance'] as const} value={tab} onChange={setTab} />
        <div className="ml-auto flex items-center gap-2 h-9 rounded-lg border border-line px-2"><Search size={14} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Plot, block, owner or PP number" className="bg-transparent outline-none text-sm w-56" /></div>
      </div>
      <Table head={['Passport', 'Property', 'Owner', 'Stage', 'Title', 'Value', 'Plaque', 'Last tap']}>
        {shown.map((p) => { const lt = taps.filter((t) => t.place.startsWith(p.title)).sort((a, b) => b.at.localeCompare(a.at))[0]; return (
          <tr key={p.id} className="hover:bg-card-2 cursor-pointer" onClick={() => nav(`/office/passports/${p.id}`)}>
            <td className="font-mono text-xs font-bold">{p.id}</td><td><div className="font-semibold">{p.title}</div><div className="text-xs text-muted">{p.area}</div></td><td>{p.owner}</td><td><Badge tone="blue">{p.stage}</Badge></td><td><Badge tone={statusTone(p.titleStatus)}>{p.titleStatus}</Badge></td><td className="font-semibold">{ugxShort(p.value)}</td><td>{p.plaqueUid ? <Badge tone="green"><Nfc size={10} />Chip</Badge> : <span className="text-muted text-xs">No chip</span>}</td><td className="text-muted text-xs">{lt ? ago(lt.at) : '—'}</td>
          </tr>) })}
      </Table>
    </Card>
    <NewPassport open={add} onClose={() => setAdd(false)} />
  </>)
}

function NewPassport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const put = useStore((s) => s.put)
  const nav = useNavigate()
  const [f, setF] = useState({ title: '', area: '', kind: 'House', owner: '', titleNo: '', value: '', stage: 'Sales' as Biz })
  const save = () => {
    if (!f.title || !f.area) return toast('Add a title and area', 'warn')
    const id = `PP-KLA-${Math.floor(1000 + Math.random() * 8999)}`
    const p: Property = { id, title: f.title, kind: f.kind, estate: f.area, area: f.area, size: '—', value: +f.value.replace(/\D/g, '') || 0, valueChange: 0, stage: f.stage, titleStatus: 'Pending', titleNo: f.titleNo || 'Pending', owner: f.owner || 'Posh Properties Ltd', agent: 'Diana Atuhaire', photos: 0, hue: Math.floor(Math.random() * 200), issued: nowIso().slice(0, 10), timeline: [{ date: nowIso().slice(0, 10), biz: f.stage, title: 'Posh Passport issued', detail: 'Record opened at the Bukoto office.' }] }
    put('properties', p); onClose(); toast(`Passport ${id} created`); nav(`/office/passports/${id}`)
  }
  return (
    <Sheet open={open} onClose={onClose} title="New Posh Passport">
      <div className="space-y-3">
        <Field label="Property"><input className={inputCls} placeholder="e.g. 3-bed house" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Area"><input className={inputCls} placeholder="Kira" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field><Field label="Type"><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{['House', 'Apartment', 'Plot', 'Commercial', 'Villa'].map((k) => <option key={k}>{k}</option>)}</select></Field></div>
        <Field label="Owner"><input className={inputCls} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Title no."><input className={inputCls} placeholder="Block / Plot" value={f.titleNo} onChange={(e) => setF({ ...f, titleNo: e.target.value })} /></Field><Field label="Value (UGX)"><input className={inputCls} inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field></div>
        <Field label="Business"><select className={inputCls} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value as Biz })}>{['Sales', 'Construction', 'Management', 'Valuation', 'Finance', 'Survey'].map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Btn block size="lg" onClick={save}>Create passport</Btn>
      </div>
    </Sheet>
  )
}

export function PassportDetail() {
  const { id } = useParams()
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const p = db.properties[id!]
  const [rec, setRec] = useState({ biz: 'Management' as Biz, title: '', detail: '' })
  if (!p) return <Navigate to="/office/passports" replace />
  const taps = list(db, 'taps').filter((t) => t.kind === 'Plaque' && t.place.startsWith(p.title)).sort((a, b) => b.at.localeCompare(a.at))
  const site = list(db, 'sites').find((s) => s.propertyId === p.id)
  const listing = list(db, 'listings').find((l) => l.propertyId === p.id)
  const vals = list(db, 'valuations').filter((v) => v.propertyId === p.id)
  const add = () => {
    if (!rec.title) return
    patch('properties', p.id, { timeline: [...p.timeline, { date: nowIso().slice(0, 10), biz: rec.biz, title: rec.title, detail: rec.detail }], stage: rec.biz === 'Survey' ? p.stage : rec.biz })
    setRec({ ...rec, title: '', detail: '' }); toast('Added to the passport story')
  }
  return (<>
    <PageHead title={`${p.id} · ${p.title}`} sub={`${p.area} · ${p.kind} · owner ${p.owner}`} actions={<>
      <Link to={`/p/${p.id}`} target="_blank"><Btn variant="outline" icon={<ExternalLink size={16} />}>Public page</Btn></Link>
      <Link to="/office/cards"><Btn variant="soft" icon={<Nfc size={16} />}>Plaque</Btn></Link>
    </>} />
    <div className="grid xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Card className="p-5">
          <div className="grid sm:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-muted">Value</div><b>{ugxShort(p.value)}</b></div>
            <div><div className="text-xs text-muted">Title</div><Badge tone={statusTone(p.titleStatus)}>{p.titleStatus}</Badge><div className="text-[11px] text-muted mt-0.5">{p.titleNo}</div></div>
            <div><div className="text-xs text-muted">Stage</div><b>{p.stage}</b></div>
            <div><div className="text-xs text-muted">Plaque chip</div><span className="font-mono text-xs">{p.plaqueUid ?? 'not registered'}</span></div>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold mb-4">Passport story</h3>
          <div className="relative pl-7">
            <div className="absolute left-[13px] top-1 bottom-1 w-0.5 bg-line" />
            {p.timeline.slice().reverse().map((t, i) => { const I = ICON[t.biz]; return (
              <div key={i} className="relative mb-4"><span className="absolute -left-7 w-7 h-7 rounded-full bg-brand-soft text-brand grid place-items-center"><I size={14} /></span><div className="ml-2"><div className="text-xs text-muted">{fmtDate(t.date)} · {t.biz}</div><div className="font-semibold">{t.title}</div><div className="text-sm text-muted">{t.detail}</div></div></div>) })}
          </div>
          <div className="border-t border-line pt-4 mt-2 grid sm:grid-cols-[140px_1fr] gap-2">
            <select className={inputCls} value={rec.biz} onChange={(e) => setRec({ ...rec, biz: e.target.value as Biz })}>{Object.keys(ICON).map((k) => <option key={k}>{k}</option>)}</select>
            <input className={inputCls} placeholder="What happened? e.g. Title searched, clean" value={rec.title} onChange={(e) => setRec({ ...rec, title: e.target.value })} />
            <input className={cx(inputCls, 'sm:col-span-2')} placeholder="Details (optional)" value={rec.detail} onChange={(e) => setRec({ ...rec, detail: e.target.value })} />
            <Btn className="sm:col-span-2 justify-self-start" icon={<Plus size={16} />} onClick={add}>Add to story</Btn>
          </div>
        </Card>
      </div>
      <div className="space-y-4">
        <PhotoTile hue={p.hue} className="h-44 rounded-2xl"><div className="absolute bottom-3 left-3 text-white text-sm font-semibold">{p.photos} verified photos</div></PhotoTile>
        <Card className="p-4 text-sm space-y-2">
          <div className="font-bold">Linked work</div>
          {site && <Link to={`/office/construction?id=${site.id}`} className="flex justify-between"><span>Site: {site.name}</span><b>{site.progress}%</b></Link>}
          {listing && <div className="flex justify-between"><span>Listing {listing.id}</span><b>{listing.kind}</b></div>}
          {vals.map((v) => <div key={v.id} className="flex justify-between"><span>Valuation {v.id} · {v.bank ?? v.purpose}</span><Badge tone={statusTone(v.status)}>{v.status}</Badge></div>)}
          {!site && !listing && !vals.length && <div className="text-muted">Nothing linked yet.</div>}
        </Card>
        <Card className="p-4 text-sm">
          <div className="font-bold mb-2">Plaque taps</div>
          {taps.slice(0, 6).map((t) => <div key={t.id} className="flex justify-between py-1"><span className="text-muted">{t.who}</span><span>{ago(t.at)}</span></div>)}
          {!taps.length && <div className="text-muted">No taps yet.</div>}
          <div className="text-xs text-muted mt-2 break-all">Plaque link: {verifyUrl(p.id)}</div>
        </Card>
      </div>
    </div>
  </>)
}
