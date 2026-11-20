import { useRef, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Sun, Users, Wallet, Package, Truck, AlertCircle, Camera, CheckCircle2, Circle, Fuel, Droplets, Zap, Gauge, Plus, Send } from 'lucide-react'
import { useStore, list } from '../data/store'
import { usePrefs } from '../data/prefs'
import { fmtTime, nowIso, uid, ugx, num, fmtDT } from '../lib/format'
import { Card, Btn, Badge, Section, Progress, toast, cx, Field, inputCls, statusTone, Avatar, Sheet } from '../components/ui'
import { TopBar, Screen, NfcButton } from './MobileApp'
import { shrink } from './Tenant'
import { sendMessage } from '../lib/logic'

const SITE = 'SITE-77'

function SiteHome() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const s = db.sites[SITE]
  const ws = list(db, 'workers').filter((w) => w.siteId === SITE)
  const on = ws.filter((w) => w.in && !w.out)
  const wages = on.reduce((a, w) => a + w.wage, 0)
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  const post = () => {
    if (!text.trim()) return
    patch('sites', s.id, { updates: [{ at: nowIso(), text: text.trim(), photo }, ...s.updates], photos: s.photos + (photo ? 1 : 0) })
    sendMessage({ to: s.client, phone: s.clientPhone, channel: 'WhatsApp', kind: 'build', text: `Posh build update, ${s.name}: ${text.trim()}` })
    setText(''); setPhoto(undefined); toast('Update sent to the client')
  }
  return (<>
    <TopBar title={s.name} sub={`Site manager · ${s.manager}`} right={<NfcButton />} />
    <Screen>
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-4"><div className="text-xs text-muted flex items-center gap-1"><Users size={14} />Workers on site</div><div className="text-2xl font-extrabold">{on.length} <span className="text-base text-muted font-semibold">of {ws.length}</span></div></Card>
        <Card className="p-4"><div className="text-xs text-muted flex items-center gap-1"><Wallet size={14} />Wages today</div><div className="text-2xl font-extrabold">{num(wages / 1000)}k</div><div className="text-xs text-muted">paid by MoMo at 5pm</div></Card>
        <Card className="p-4"><div className="text-xs text-muted flex items-center gap-1"><Sun size={14} />Weather</div><div className="text-2xl font-extrabold">26°</div><div className="text-xs text-muted">Dry · good for the slab</div></Card>
        <Card className="p-4"><div className="text-xs text-muted">Progress</div><div className="text-2xl font-extrabold">{s.progress}%</div><Progress value={s.progress} /></Card>
      </div>
      <Section title="Post an update to the client">
        <Card className="p-3 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Roof slab poured on the east wing" className={cx(inputCls, 'h-20 py-2')} />
          <div className="flex items-center gap-2">
            {photo ? <img src={photo} className="w-12 h-12 rounded-lg object-cover" alt="" /> : <Btn size="sm" variant="outline" icon={<Camera size={14} />} onClick={() => fileRef.current?.click()}>Photo</Btn>}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => e.target.files?.[0] && setPhoto(await shrink(e.target.files[0]))} />
            <div className="flex-1" />
            <Btn size="sm" icon={<Send size={14} />} onClick={post}>Send</Btn>
          </div>
        </Card>
      </Section>
      <Section title="Today's tasks">
        <Card>{s.tasks.map((t, i) => <button key={t.id} onClick={() => patch('sites', s.id, { tasks: s.tasks.map((x) => x.id === t.id ? { ...x, done: !x.done } : x) })} className={cx('w-full flex items-center gap-3 p-3 text-left text-sm', i && 'border-t border-line')}>{t.done ? <CheckCircle2 className="text-brand" size={20} /> : <Circle className="text-line" size={20} />}<span className={cx(t.done && 'line-through text-muted')}>{t.text}</span></button>)}</Card>
      </Section>
    </Screen>
  </>)
}

function Crew() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const ws = list(db, 'workers').filter((w) => w.siteId === SITE)
  const [pay, setPay] = useState(false)
  const toggle = (id: string) => {
    const w = db.workers[id]
    if (!w.in || w.out) { patch('workers', id, { in: nowIso(), out: undefined }); toast(`${w.name.split(' ')[0]} clocked in`) }
    else { patch('workers', id, { out: nowIso() }); toast(`${w.name.split(' ')[0]} clocked out`) }
  }
  const on = ws.filter((w) => w.in)
  return (<>
    <TopBar title="Crew" sub="Tap a worker card or a name to clock in/out" right={<NfcButton />} />
    <Screen className="space-y-2">
      {ws.map((w) => (
        <Card key={w.id} className="p-3 flex items-center gap-3">
          <Avatar name={w.name} size={40} tone={w.late ? 'red' : 'green'} />
          <div className="flex-1 min-w-0"><div className="font-semibold truncate">{w.name}</div><div className="text-xs text-muted">{w.trade} · {num(w.wage)}/day{w.in ? ` · in ${fmtTime(w.in)}` : ''}{w.out ? ` · out ${fmtTime(w.out)}` : ''}</div></div>
          {w.late && <Badge tone="red">Late</Badge>}
          <Btn size="sm" variant={w.in && !w.out ? 'outline' : 'primary'} onClick={() => toggle(w.id)}>{w.in && !w.out ? 'Clock out' : 'Clock in'}</Btn>
        </Card>
      ))}
      <Btn block size="lg" className="mt-3" icon={<Wallet size={18} />} onClick={() => setPay(true)}>Pay today's wages by MoMo</Btn>
      <Sheet open={pay} onClose={() => setPay(false)} title="Pay wages">
        <div className="text-sm text-muted">{on.length} workers · bulk MTN MoMo from the Posh site wallet</div>
        <div className="text-3xl font-extrabold my-2">{ugx(on.reduce((a, w) => a + w.wage, 0))}</div>
        <Btn block size="lg" onClick={() => { on.forEach((w) => sendMessage({ to: w.name, phone: w.phone, channel: 'SMS', kind: 'wage', text: `Posh: wage ${ugx(w.wage)} sent to your MoMo for today at ${db.sites[SITE].name}.` })); setPay(false); toast(`Wages sent to ${on.length} workers`) }}>Approve and send</Btn>
      </Sheet>
    </Screen>
  </>)
}

function Materials() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const s = db.sites[SITE]
  const [item, setItem] = useState('')
  const [qty, setQty] = useState('')
  return (<>
    <TopBar title="Materials" sub={s.name} />
    <Screen className="space-y-2">
      {s.materials.map((m, i) => (
        <Card key={i} className="p-3 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-card-2 grid place-items-center">{m.status === 'En route' ? <Truck size={18} /> : <Package size={18} />}</span>
          <div className="flex-1"><div className="font-semibold text-sm">{m.item}</div><div className="text-xs text-muted">{m.qty}</div></div>
          <Badge tone={statusTone(m.status)}>{m.status}</Badge>
          {m.status !== 'Delivered' && <Btn size="sm" variant="soft" onClick={() => { patch('sites', s.id, { materials: s.materials.map((x, j) => j === i ? { ...x, status: 'Delivered' } : x) }); toast(`${m.item} received`) }}>Received</Btn>}
        </Card>
      ))}
      <Section title="Order materials">
        <Card className="p-3 space-y-2">
          <div className="grid grid-cols-[2fr_1fr] gap-2"><input className={inputCls} placeholder="Item" value={item} onChange={(e) => setItem(e.target.value)} /><input className={inputCls} placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          <Btn block icon={<Plus size={16} />} onClick={() => { if (!item) return; patch('sites', s.id, { materials: [...s.materials, { item, qty: qty || '1', status: 'Ordered' }] }); setItem(''); setQty(''); toast('Order sent to the Posh store') }}>Order</Btn>
        </Card>
      </Section>
    </Screen>
  </>)
}

function Issues() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const s = db.sites[SITE]
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)
  return (<>
    <TopBar title="Issues" sub="Reach the Posh office instantly" />
    <Screen className="space-y-2">
      <Card className="p-3 space-y-2">
        <Field label="Report an issue"><textarea className={cx(inputCls, 'h-20 py-2')} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Steel delivery late" /></Field>
        <div className="flex items-center gap-2">
          {photo ? <img src={photo} alt="" className="w-12 h-12 rounded-lg object-cover" /> : <Btn size="sm" variant="outline" icon={<Camera size={14} />} onClick={() => fileRef.current?.click()}>Photo</Btn>}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => e.target.files?.[0] && setPhoto(await shrink(e.target.files[0]))} />
          <div className="flex-1" />
          <Btn size="sm" onClick={() => { if (!text.trim()) return; patch('sites', s.id, { issues: [{ id: uid('i'), text: text.trim(), at: nowIso(), open: true, photo }, ...s.issues] }); setText(''); setPhoto(undefined); toast('Issue sent to the office') }}>Send</Btn>
        </div>
      </Card>
      {s.issues.map((i) => (
        <Card key={i.id} className="p-3 flex gap-3">
          {i.photo ? <img src={i.photo} alt="" className="w-14 h-14 rounded-lg object-cover" /> : <AlertCircle className={i.open ? 'text-posh-red' : 'text-muted'} />}
          <div className="flex-1"><div className="text-sm font-semibold">{i.text}</div><div className="text-xs text-muted">{fmtDT(i.at)}</div></div>
          {i.open ? <Btn size="sm" variant="outline" onClick={() => patch('sites', s.id, { issues: s.issues.map((x) => x.id === i.id ? { ...x, open: false } : x) })}>Resolve</Btn> : <Badge tone="green">Resolved</Badge>}
        </Card>
      ))}
    </Screen>
  </>)
}

function Round() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const put = useStore((s) => s.put)
  const staffId = usePrefs((s) => s.app.staffId)
  const cps = list(db, 'checkpoints').sort((a, b) => a.id.localeCompare(b.id))
  const done = cps.filter((c) => c.done).length
  const [meter, setMeter] = useState<null | 'fuel' | 'water' | 'power'>(null)
  const [val, setVal] = useState('')
  const check = (id: string) => {
    const c = db.checkpoints[id]
    patch('checkpoints', id, { done: true, at: nowIso() })
    put('taps', { id: uid('TP'), kind: 'Checkpoint', place: `${c.estate} · ${c.name}`, at: nowIso(), result: 'OK', who: db.staff[staffId ?? 'S-4']?.name })
    toast(`${c.name} checked`)
  }
  const fuel = db.checkpoints['CP-2']?.reading ?? 'Fuel 31%'
  const water = db.checkpoints['CP-3']?.reading ?? 'Tank 82%'
  return (<>
    <TopBar title="Caretaker round" sub="Posh Naguru Heights · Moses Kizza" right={<NfcButton />} />
    <Screen>
      <Card className="p-4"><div className="flex justify-between text-sm"><span className="font-bold">{done} of {cps.length} checkpoints</span><span className="text-muted">tap each NFC tag</span></div><div className="mt-2"><Progress value={(done / cps.length) * 100} /></div></Card>
      <Card className="mt-3">{cps.map((c, i) => (
        <div key={c.id} className={cx('flex items-center gap-3 p-3', i && 'border-t border-line')}>
          {c.done ? <CheckCircle2 className="text-brand" size={22} /> : <Circle className="text-line" size={22} />}
          <div className="flex-1"><div className="font-semibold text-sm">{c.name}</div><div className="text-xs text-muted">{c.done && c.at ? `Checked ${fmtTime(c.at)} · time and place stamped` : 'Not yet'}{c.reading ? ` · ${c.reading}` : ''}</div></div>
          {!c.done && <Btn size="sm" variant="soft" onClick={() => check(c.id)}>Tap</Btn>}
        </div>))}</Card>
      <Section title="Meters">
        <div className="grid grid-cols-2 gap-2">
          <Card onClick={() => { setMeter('fuel'); setVal('') }} className="p-3"><Fuel className={parseInt(fuel.replace(/\D/g, '')) < 35 ? 'text-posh-red' : 'text-brand'} /><div className="font-bold mt-1">{fuel}</div><div className="text-xs text-muted">Generator{parseInt(fuel.replace(/\D/g, '')) < 35 ? ' · refill flagged' : ''}</div></Card>
          <Card onClick={() => { setMeter('water'); setVal('') }} className="p-3"><Droplets className="text-sky-500" /><div className="font-bold mt-1">{water}</div><div className="text-xs text-muted">Water tank</div></Card>
          <Card onClick={() => { setMeter('power'); setVal('') }} className="p-3"><Zap className="text-gold" /><div className="font-bold mt-1">214 kWh</div><div className="text-xs text-muted">Common power · ~9 days</div></Card>
          <Card onClick={() => { setMeter('water'); setVal('') }} className="p-3"><Gauge className="text-muted" /><div className="font-bold mt-1">NWSC</div><div className="text-xs text-muted">Photo reading</div></Card>
        </div>
      </Section>
      <Sheet open={!!meter} onClose={() => setMeter(null)} title={meter === 'fuel' ? 'Generator fuel' : meter === 'water' ? 'Water reading' : 'Power top-up'}>
        {meter === 'power' ? (<>
          <div className="text-sm text-muted">Buy Yaka units for the common area meter by MoMo.</div>
          <div className="grid grid-cols-3 gap-2 my-3">{[100000, 200000, 300000].map((a) => <Btn key={a} variant="outline" onClick={() => { setMeter(null); toast(`Yaka token bought: ${ugx(a)}`) }}>{num(a / 1000)}k</Btn>)}</div>
        </>) : (<>
          <Field label={meter === 'fuel' ? 'Fuel level %' : 'Tank level %'}><input className={inputCls} inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value)} /></Field>
          <Btn block className="mt-3" onClick={() => { const id = meter === 'fuel' ? 'CP-2' : 'CP-3'; patch('checkpoints', id, { reading: `${meter === 'fuel' ? 'Fuel' : 'Tank'} ${val || 0}%` }); setMeter(null); toast('Reading saved') }}>Save reading</Btn>
        </>)}
      </Sheet>
    </Screen>
  </>)
}

export default function Staff() {
  const role = usePrefs((s) => s.app.role)
  if (role === 'caretaker') return <Routes><Route path="round" element={<Round />} /><Route path="*" element={<Navigate to="/app/round" replace />} /></Routes>
  return (
    <Routes>
      <Route path="site" element={<SiteHome />} />
      <Route path="crew" element={<Crew />} />
      <Route path="materials" element={<Materials />} />
      <Route path="issues" element={<Issues />} />
      <Route path="*" element={<Navigate to="/app/site" replace />} />
    </Routes>
  )
}
