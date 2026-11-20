import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, Nfc, QrCode, Wallet, Ban, Home, CheckCircle2 } from 'lucide-react'
import { useStore } from '../data/store'
import { usePrefs } from '../data/prefs'
import { nowIso, uid, ugx, fmtDT } from '../lib/format'
import { tenantDue } from '../lib/logic'
import { normSerial } from '../lib/nfc'
import { Card, Btn, Badge, ThemedLogo, statusTone, Field, inputCls, toast } from '../components/ui'
import { PoshCard } from '../app/Tenant'

export default function CardPage() {
  const { cardId } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const patch = useStore((s) => s.patch)
  const { app, set } = usePrefs()
  const c = db.cards[cardId ?? '']
  const serial = sp.get('uid') ? normSerial(sp.get('uid')!) : undefined
  const [pin, setPin] = useState('')
  const via = sp.get('via') === 'qr' ? 'qr' : 'nfc'
  const device = /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android' : 'computer'
  const logged = useRef(false)
  useEffect(() => {
    if (logged.current || !c) return
    logged.current = true
    put('taps', { id: uid('TP'), cardId: c.id, uid: serial, kind: c.type === 'Plaque' ? 'Plaque' : 'Gate', place: `${via === 'qr' ? 'QR scan' : 'NFC tap'} · ${device}`, at: nowIso(), result: c.status === 'Blocked' ? 'Refused' : 'OK', who: c.holder })
    patch('cards', c.id, { lastTap: nowIso() })
  }, [c?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return (
    <div className="min-h-dvh grid place-items-center p-6 text-center"><div><ShieldAlert size={64} className="mx-auto text-posh-red" /><h1 className="text-2xl font-extrabold mt-3">Unknown card</h1><p className="text-muted">This card is not registered with Posh Properties.</p><Btn className="mt-4" onClick={() => nav('/')}>Home</Btn></div></div>
  )
  if (c.type === 'Plaque' && c.propertyId) { nav(`/p/${c.propertyId}${serial ? `?uid=${serial}` : ''}`, { replace: true }); return null }
  const t = c.holderId ? db.tenants[c.holderId] : undefined
  const u = t ? db.units[t.unitId] : undefined
  const due = t ? tenantDue(db, t) : undefined
  const chipOk = !serial || !c.uid || serial === c.uid
  const signedIn = app.role === 'tenant' && app.tenantId === t?.id
  return (
    <div className="min-h-dvh max-w-md mx-auto px-4 pb-10">
      <div className="pt-safe flex items-center justify-between h-16"><ThemedLogo className="w-32" /><button onClick={() => nav('/')} className="w-10 h-10 grid place-items-center rounded-full hover:bg-card-2" aria-label="Home"><Home size={18} /></button></div>
      <div className={`anim-rise rounded-3xl p-4 mb-4 text-white flex items-center gap-4 ${c.status === 'Blocked' || !chipOk ? 'bg-posh-red' : 'bg-[linear-gradient(160deg,#1A8043,#062E17)]'}`}>
        <span className="relative w-14 h-14 rounded-2xl bg-white/15 grid place-items-center shrink-0">{via === 'qr' ? <QrCode size={28} /> : <Nfc size={28} />}<span className="absolute inset-0 rounded-2xl bg-white/20 animate-ping" style={{ animationIterationCount: 3 }} /></span>
        <div className="min-w-0">
          <div className="text-xs font-bold tracking-wider text-[#E3B93A]">{via === 'qr' ? 'QR CODE SCANNED' : 'NFC CARD READ'} · {device.toUpperCase()}</div>
          <div className="font-extrabold text-lg leading-tight">{c.status === 'Blocked' ? 'Card blocked' : chipOk ? (serial && c.uid ? 'Chip verified · genuine Posh card' : 'Genuine Posh card') : 'Chip does not match'}</div>
          <div className="text-xs text-white/75">Posh Office was told live · {fmtDT(nowIso())}</div>
        </div>
      </div>
      <PoshCard name={c.holder} number={c.id} unit={u ? `${u.estate.replace('Posh ', '')} ${u.name}` : c.type} />
      <Card className="p-4 mt-4">
        <div className="flex items-center gap-2 font-bold">{c.status === 'Blocked' ? <Ban className="text-posh-red" /> : chipOk ? <ShieldCheck className="text-brand" /> : <ShieldAlert className="text-posh-red" />}{c.status === 'Blocked' ? 'Card blocked' : chipOk ? 'Genuine Posh card' : 'Chip does not match this card'}</div>
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted">Type</span><span className="font-semibold">{c.type}</span></div>
          <div className="flex justify-between"><span className="text-muted">Status</span><Badge tone={statusTone(c.status)}>{c.status}</Badge></div>
          <div className="flex justify-between"><span className="text-muted">Access</span><span className="font-semibold text-right">{c.access.join(' · ')}</span></div>
          {serial && <div className="flex justify-between"><span className="text-muted">Chip</span><span className="font-mono text-xs">{serial}</span></div>}
          {c.lastTap && <div className="flex justify-between"><span className="text-muted">Last tap</span><span>{fmtDT(c.lastTap)}</span></div>}
        </div>
      </Card>
      {t && due && c.status !== 'Blocked' && (
        <Card className="p-4 mt-3">
          {due.balance === 0 ? <div className="flex items-center gap-2 text-brand font-semibold"><CheckCircle2 />Rent for this month is fully paid</div> : (<>
            <div className="text-sm text-muted">Rent due</div>
            <div className="text-2xl font-extrabold">{ugx(due.balance)}</div>
            {signedIn ? (
              <Btn block size="lg" className="mt-3" icon={<Wallet size={18} />} onClick={() => nav(`/app/pay/go?card=${c.id}`)}>Pay with this card</Btn>
            ) : (
              <form className="mt-3 space-y-2" onSubmit={(e) => { e.preventDefault(); if (pin.length < 4) return toast('Enter any 4-digit PIN', 'warn'); set({ app: { role: 'tenant', tenantId: t.id } }); nav(`/app/pay/go?card=${c.id}`) }}>
                <Field label={`PIN for ${t.name.split(' ')[0]}`} hint="Demo: any 4-digit PIN"><input className={inputCls} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} /></Field>
                <Btn block size="lg" type="submit" icon={<Nfc size={18} />}>Pay rent with this card</Btn>
              </form>
            )}
          </>)}
        </Card>
      )}
    </div>
  )
}
