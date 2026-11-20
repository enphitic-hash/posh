import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { HardHat, CheckCircle2, Clock, CreditCard, Camera, MessageCircle, ShieldCheck } from 'lucide-react'
import { useStore } from '../data/store'
import { ugx, fmtDate, fmtDT, nowIso } from '../lib/format'
import { Card, Btn, Badge, Progress, Section, PhotoTile, toast, Sheet, Field, inputCls, statusTone } from '../components/ui'
import { TopBar, Screen, NfcButton } from './MobileApp'
import { poshWa, sendMessage } from '../lib/logic'

const SITE = 'SITE-77'

function Build() {
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const s = db.sites[SITE]
  const workers = Object.values(db.workers).filter((w) => w.siteId === SITE)
  const on = workers.filter((w) => w.in && !w.out).length
  return (<>
    <TopBar title="My build" sub={`${s.client} · ${s.name}`} right={<NfcButton />} />
    <Screen>
      <div className="rounded-3xl p-5 text-white bg-[linear-gradient(135deg,#B8901A,#6b4f06)] shadow-lg">
        <div className="text-sm text-white/80">5-bed home · Plot 77 Kira-Mulawa</div>
        <div className="flex items-end gap-2 mt-1"><div className="text-5xl font-extrabold">{s.progress}%</div><div className="pb-2 text-white/90">built</div></div>
        <div className="h-2 rounded-full bg-white/25 mt-3"><div className="h-full rounded-full bg-white" style={{ width: `${s.progress}%` }} /></div>
        <div className="flex justify-between text-xs mt-2 text-white/80"><span>Started {fmtDate(s.started)}</span><span>Handover {fmtDate(s.handover, { month: 'short', year: 'numeric' })}</span></div>
        <Badge className="mt-3 !bg-white/20 !text-white">{s.daysLate ? `${s.daysLate} days behind` : 'On schedule'}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <Card className="p-3 text-center"><div className="text-xl font-extrabold">{on}</div><div className="text-xs text-muted">on site today</div></Card>
        <Card className="p-3 text-center"><div className="text-xl font-extrabold">{s.photos}</div><div className="text-xs text-muted">verified photos</div></Card>
        <Card className="p-3 text-center"><div className="text-xl font-extrabold">{Math.round((s.paid / s.budget) * 100)}%</div><div className="text-xs text-muted">paid</div></Card>
      </div>
      <Section title="Latest from site">
        <Card>{s.updates.map((u, i) => <div key={i} className={`p-3 flex gap-3 ${i ? 'border-t border-line' : ''}`}><PhotoTile hue={35 + i * 20} className="w-14 h-14 rounded-xl shrink-0" /><div><div className="text-sm">{u.text}</div><div className="text-xs text-muted">{fmtDT(u.at)} · Eng. Paul Okello</div></div></div>)}</Card>
      </Section>
      <Section title="Stages">
        <Card>{s.stages.map((st, i) => <div key={st.name} className={`p-3 flex items-center gap-3 ${i ? 'border-t border-line' : ''}`}>{st.status === 'Paid' ? <CheckCircle2 className="text-brand" /> : <Clock className={st.status === 'Due' ? 'text-gold' : 'text-muted'} />}<div className="flex-1"><div className="font-semibold text-sm">{st.name}</div><div className="text-xs text-muted">{st.paidOn ? `Paid ${fmtDate(st.paidOn)} · ${st.method}` : ugx(st.amount)}</div></div><Badge tone={statusTone(st.status)}>{st.status}</Badge></div>)}</Card>
      </Section>
      <Card onClick={() => nav(`/p/${s.propertyId}`)} className="p-4 mt-4 flex items-center gap-3"><ShieldCheck className="text-brand" /><div className="flex-1 text-sm"><b>Posh Passport {s.propertyId}</b><div className="text-muted">Every stage, photo and payment is recorded</div></div></Card>
      <Btn block variant="outline" className="mt-3" icon={<MessageCircle size={16} />} onClick={() => window.open(poshWa(`Hello Posh, this is ${s.client} about my build at ${s.name}.`), '_blank')}>Message my site manager</Btn>
    </Screen>
  </>)
}

function BuildPay() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const s = db.sites[SITE]
  const due = s.stages.find((x) => x.status === 'Due')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const gbp = due ? Math.round(due.amount / 4870) : 0
  const pay = async () => {
    setBusy(true); await new Promise((r) => setTimeout(r, 1800))
    const stages = s.stages.map((x, i, arr) => x === due ? { ...x, status: 'Paid' as const, paidOn: nowIso().slice(0, 10), method: `UK card · GBP ${gbp.toLocaleString()}` } : i > 0 && arr[i - 1] === due ? { ...x, status: 'Due' as const } : x)
    patch('sites', s.id, { stages, paid: s.paid + (due?.amount ?? 0), updates: [{ at: nowIso(), text: `Client paid ${due?.name} stage (GBP ${gbp.toLocaleString()}). Materials ordered.` }, ...s.updates] })
    sendMessage({ to: s.client, phone: s.clientPhone, channel: 'Email', kind: 'build', text: `Posh Construction: received GBP ${gbp.toLocaleString()} for the ${due?.name} stage at ${s.name}. Thank you.` })
    setBusy(false); setOpen(false); toast('Stage paid. Your site manager has been told.')
  }
  return (<>
    <TopBar title="Stage payments" sub={`Budget ${ugx(s.budget)}`} />
    <Screen className="space-y-3">
      <Card className="p-4"><div className="text-sm text-muted">Paid so far</div><div className="text-2xl font-extrabold">{ugx(s.paid)}</div><Progress value={(s.paid / s.budget) * 100} /></Card>
      {due && <Card className="p-4 border-gold"><div className="text-sm text-gold font-semibold">Next stage due</div><div className="font-bold text-lg">{due.name}</div><div className="text-muted text-sm">{ugx(due.amount)} ≈ GBP {gbp.toLocaleString()}</div><Btn block className="mt-3" icon={<CreditCard size={16} />} onClick={() => setOpen(true)}>Pay from abroad by card</Btn></Card>}
      {s.stages.map((st) => <Card key={st.name} className="p-3 flex justify-between items-center text-sm"><div><div className="font-semibold">{st.name}</div><div className="text-xs text-muted">{st.paidOn ? `${fmtDate(st.paidOn)} · ${st.method}` : ugx(st.amount)}</div></div><Badge tone={statusTone(st.status)}>{st.status}</Badge></Card>)}
    </Screen>
    <Sheet open={open} onClose={() => setOpen(false)} title={`Pay ${due?.name}`}>
      <div className="space-y-3">
        <div className="text-2xl font-extrabold">GBP {gbp.toLocaleString()}</div>
        <Field label="Card number"><input className={inputCls} defaultValue="4111 1111 1111 1111" /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Expiry"><input className={inputCls} defaultValue="09/29" /></Field><Field label="CVV"><input className={inputCls} defaultValue="123" type="password" /></Field></div>
        <Btn block size="lg" disabled={busy} onClick={pay}>{busy ? 'Confirming with your bank…' : 'Pay now'}</Btn>
      </div>
    </Sheet>
  </>)
}

function Photos() {
  const db = useStore((s) => s.db)
  const s = db.sites[SITE]
  return (<>
    <TopBar title="Site photos" sub={`${s.photos} verified · time and GPS stamped`} />
    <Screen>
      <div className="grid grid-cols-3 gap-1.5">
        {s.issues.filter((i) => i.photo).map((i) => <img key={i.id} src={i.photo} className="aspect-square object-cover rounded-lg" alt="" />)}
        {Array.from({ length: 24 }).map((_, i) => <PhotoTile key={i} hue={20 + ((i * 17) % 60)} className="aspect-square rounded-lg"><span className="absolute bottom-1 left-1 text-[9px] text-white/90 font-semibold">{fmtDate(new Date(Date.now() - i * 3 * 864e5).toISOString(), { day: 'numeric', month: 'short' })}</span></PhotoTile>)}
      </div>
      <div className="text-xs text-muted mt-3 flex items-center gap-1"><Camera size={14} />Only photos taken in the Posh site app on site appear here.</div>
    </Screen>
  </>)
}

export default function Client() {
  return (
    <Routes>
      <Route path="build" element={<Build />} />
      <Route path="build-pay" element={<BuildPay />} />
      <Route path="build-photos" element={<Photos />} />
      <Route path="*" element={<Navigate to="/app/build" replace />} />
    </Routes>
  )
}
export { HardHat }
