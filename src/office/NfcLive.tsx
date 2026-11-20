import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Nfc, ShieldCheck, ShieldAlert, Ban, Smartphone, Wifi, X, Loader2, CheckCircle2, Apple, QrCode } from 'lucide-react'
import { QrScanner } from '../components/QrScanner'
import { useStore, list } from '../data/store'
import type { Tap } from '../data/types'
import { readOnce, webNfcSupported, parseTarget, normSerial } from '../lib/nfc'
import { cardUrl, tenantDue } from '../lib/logic'
import { fmtTime, fmtDT, ago, nowIso, uid, ugx } from '../lib/format'
import { Card, Badge, Btn, Stat, statusTone, cx, toast, Avatar, Sheet } from '../components/ui'
import { PageHead } from './Office'

const deviceOf = (t: Tap) => (t.place.includes('iPhone') || t.who?.includes('iPhone') ? 'iPhone' : t.place.includes('Android') || t.who?.includes('Android') ? 'Android' : t.place.split(' · ').pop())

/** Explain a tap: whose card, which chip, is it genuine, what it unlocked. */
function useTapInfo(t?: Tap) {
  const db = useStore((s) => s.db)
  if (!t) return null
  const c = t.cardId ? db.cards[t.cardId] : undefined
  const tenant = c?.holderId ? db.tenants[c.holderId] : undefined
  const unit = tenant ? db.units[tenant.unitId] : undefined
  const due = tenant ? tenantDue(db, tenant) : undefined
  const chip = t.uid && c?.uid ? (normSerial(t.uid) === c.uid ? 'match' : 'mismatch') : t.uid ? 'unregistered' : 'none'
  return { c, tenant, unit, due, chip }
}

/** Pops up in Posh Office the moment any Posh card or plaque is tapped on any phone. */
export function TapAlert() {
  const last = useStore((s) => s.lastChange)
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const [tap, setTap] = useState<Tap | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const seen = useRef(new Set<string>())
  useEffect(() => {
    if (!last || last.kind !== 'taps' || seen.current.has(last.id)) return
    const t = db.taps[last.id]
    if (!t || Date.now() - new Date(t.at).getTime() > 60000) return
    seen.current.add(last.id)
    setTap(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setTap(null), 9000)
  }, [last, db.taps])
  const info = useTapInfo(tap ?? undefined)
  if (!tap || !info) return null
  const ok = tap.result === 'OK' && info.chip !== 'mismatch'
  return (
    <div className="fixed z-[55] right-4 bottom-4 w-[360px] max-w-[calc(100vw-2rem)] anim-rise">
      <Card className={cx('p-4 border-2 shadow-2xl', ok ? 'border-brand' : 'border-posh-red')}>
        <div className="flex items-start gap-3">
          <span className={cx('relative w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0', ok ? 'bg-brand' : 'bg-posh-red')}>{tap.place.includes('QR') ? <QrCode size={24} /> : <Nfc size={24} />}<span className={cx('absolute inset-0 rounded-2xl animate-ping opacity-40', ok ? 'bg-brand' : 'bg-posh-red')} /></span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold tracking-wider text-brand">{tap.place.includes('QR') ? 'LIVE QR SCAN' : 'LIVE NFC TAP'} · {fmtTime(tap.at)}</div>
            <div className="font-extrabold truncate">{tap.place.includes('QR') ? (tap.kind === 'Plaque' ? 'Plaque QR scanned' : 'Card QR scanned') : tap.kind === 'Plaque' ? 'Plaque tapped' : 'Posh card tapped'}{tap.who ? ` · ${tap.who}` : ''}</div>
            <div className="text-sm text-muted truncate">{tap.place}{tap.cardId ? ` · ${tap.cardId}` : ''}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge tone={ok ? 'green' : 'red'}>{ok ? 'Genuine' : tap.result === 'Refused' ? 'Refused' : info.chip === 'mismatch' ? 'Chip mismatch' : tap.result}</Badge>
              {info.chip === 'match' && <Badge tone="green">Chip {tap.uid} ✓</Badge>}
              {info.due && <Badge tone={info.due.balance ? 'gold' : 'green'}>{info.due.balance ? `Owes ${ugx(info.due.balance)}` : 'Rent paid'}</Badge>}
            </div>
          </div>
          <button onClick={() => setTap(null)} className="text-muted" aria-label="Close"><X size={16} /></button>
        </div>
        <Btn size="sm" variant="soft" block className="mt-3" onClick={() => { setTap(null); nav('/office/nfc') }}>Open NFC live monitor</Btn>
      </Card>
    </div>
  )
}

export default function NfcLive() {
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const patch = useStore((s) => s.patch)
  const lastChange = useStore((s) => s.lastChange)
  const status = useStore((s) => s.status)
  const nav = useNavigate()
  const [reading, setReading] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const taps = list(db, 'taps').sort((a, b) => b.at.localeCompare(a.at))
  const latest = taps[0]
  const info = useTapInfo(latest)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' })
  const tToday = taps.filter((t) => new Date(t.at).toLocaleDateString('en-CA', { timeZone: 'Africa/Kampala' }) === today)
  const demoCard = db.cards['PC-0412-B4-7781']
  const cards = list(db, 'cards')
  const chips = cards.filter((c) => c.uid).length

  const [scan, setScan] = useState(false)
  const logRead = (c: ReturnType<typeof cards.find>, serial: string | undefined, place: string) => {
    put('taps', { id: uid('TP'), cardId: c?.id, uid: serial, kind: c?.type === 'Plaque' ? 'Plaque' : 'Checkpoint', place, at: nowIso(), result: c ? (c.status === 'Blocked' ? 'Refused' : 'OK') : 'Unknown card', who: c?.holder ?? 'Unknown card' })
    if (c) patch('cards', c.id, { lastTap: nowIso() })
    toast(c ? `${c.holder} · ${c.id}` : 'That card is not registered yet', c ? 'ok' : 'warn')
  }
  const readHere = async () => {
    abort.current?.abort(); abort.current = new AbortController()
    setReading(true)
    try {
      const r = await readOnce(abort.current.signal)
      const target = parseTarget(r.url)
      const serial = normSerial(r.serial)
      const byChip = cards.find((c) => c.uid && c.uid === serial)
      const c = target?.type === 'card' ? db.cards[target.id] : byChip
      logRead(c, serial, 'NFC tap · Posh Office reader')
    } catch (e) { if ((e as Error).message !== 'cancelled') toast((e as Error).message, 'warn') }
    setReading(false)
  }

  return (<>
    <PageHead title="NFC live monitor" sub="Every Posh card and plaque tap, the moment it happens" actions={<>
      <span className={cx('inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-9 rounded-full', status === 'live' ? 'bg-brand-soft text-brand' : 'bg-gold-soft text-gold')}><Wifi size={14} />{status === 'live' ? 'Live: taps from every phone' : 'This device only'}</span>
      <Btn variant="outline" icon={<QrCode size={16} />} onClick={() => setScan(true)}>Scan QR with camera</Btn>
      {webNfcSupported() ? <Btn icon={reading ? <Loader2 size={16} className="animate-spin" /> : <Nfc size={16} />} onClick={readHere}>{reading ? 'Hold a card to this phone…' : 'Read a card here'}</Btn> : null}
    </>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat label="Taps today" value={tToday.length} sub={`${tToday.filter((t) => t.result === 'OK').length} genuine`} tone="up" icon={<Nfc size={16} />} />
      <Stat label="Cards in use" value={cards.filter((c) => c.type !== 'Plaque').length} sub={`${chips} chips registered`} />
      <Stat label="Property plaques" value={cards.filter((c) => c.type === 'Plaque').length} sub="NFC on the gate" />
      <Stat label="Refused today" value={tToday.filter((t) => t.result !== 'OK').length} tone="down" sub="blocked or unknown cards" />
    </div>

    <div className="grid xl:grid-cols-[1.3fr_1fr] gap-4 mt-4">
      <Card className={cx('p-6 relative overflow-hidden', lastChange?.kind === 'taps' && 'flash')}>
        <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-brand"><span className="w-2 h-2 rounded-full bg-brand animate-pulse" />LATEST TAP</div>
        {latest && info ? (
          <div className="mt-4 flex flex-col sm:flex-row gap-6">
            <div className="relative w-40 h-40 shrink-0 mx-auto sm:mx-0">
              <div className="absolute inset-0 rounded-full bg-brand/10 animate-ping" style={{ animationDuration: '2.4s' }} />
              <div className={cx('relative w-40 h-40 rounded-full grid place-items-center text-white', latest.result === 'OK' && info.chip !== 'mismatch' ? 'bg-[linear-gradient(160deg,#1A8043,#062E17)]' : 'bg-posh-red')}>
                {latest.result === 'Refused' ? <Ban size={64} /> : latest.result === 'OK' && info.chip !== 'mismatch' ? <ShieldCheck size={64} /> : <ShieldAlert size={64} />}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-3xl font-extrabold leading-tight">{latest.result === 'OK' && info.chip !== 'mismatch' ? 'Genuine Posh card' : latest.result === 'Refused' ? 'Card refused' : info.chip === 'mismatch' ? 'Chip does not match' : 'Unknown card'}</div>
              <div className="text-muted mt-1">{fmtDT(latest.at)} · {ago(latest.at)}</div>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><div className="text-xs text-muted">Holder</div><div className="font-semibold flex items-center gap-2">{latest.who && <Avatar name={latest.who} size={22} />}{latest.who ?? '—'}</div></div>
                <div><div className="text-xs text-muted">Card</div><div className="font-mono text-xs font-semibold">{latest.cardId ?? '—'}</div></div>
                <div><div className="text-xs text-muted">Read by</div><div className="font-semibold">{latest.place.includes('QR') ? 'QR scan' : 'NFC tap'} · {deviceOf(latest)}</div></div>
                <div><div className="text-xs text-muted">Chip serial (NTAG213)</div><div className="font-mono text-xs font-semibold">{latest.uid ?? info.c?.uid ?? '—'}{info.chip === 'match' && <span className="text-brand"> ✓ registered</span>}</div></div>
                {info.unit && <div><div className="text-xs text-muted">Home</div><div className="font-semibold">{info.unit.estate} {info.unit.name}</div></div>}
                {info.due && <div><div className="text-xs text-muted">Rent</div><div className={cx('font-semibold', info.due.balance ? 'text-gold' : 'text-brand')}>{info.due.balance ? `${ugx(info.due.balance)} due` : 'Fully paid'}</div></div>}
                {info.c && <div><div className="text-xs text-muted">Access</div><div className="font-semibold">{info.c.access.join(' · ')}</div></div>}
                {info.c && <div><div className="text-xs text-muted">Status</div><Badge tone={statusTone(info.c.status)}>{info.c.status}</Badge></div>}
              </div>
              {info.tenant && <Btn size="sm" variant="outline" className="mt-4" onClick={() => nav(`/office/tenants?id=${info.tenant!.id}`)}>Open {info.tenant.name.split(' ')[0]}'s account</Btn>}
            </div>
          </div>
        ) : <div className="text-muted py-10 text-center">No taps yet. Tap a Posh card on a phone.</div>}
      </Card>

      <Card className="p-5">
        <h3 className="font-bold">Try it now with a real card</h3>
        <div className="text-sm text-muted mt-1">Card <b className="font-mono text-ink">{demoCard?.id}</b> ({demoCard?.holder}) holds this link{demoCard?.uid ? <> and its chip <b className="font-mono text-ink">{demoCard.uid}</b> is registered</> : ''}:</div>
        <div className="font-mono text-xs bg-card-2 rounded-lg px-3 py-2 mt-2 break-all">{demoCard && cardUrl(demoCard.id)}</div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex gap-3"><span className="w-9 h-9 rounded-xl bg-card-2 grid place-items-center shrink-0"><Apple size={18} /></span><div><b>iPhone</b>: unlock, hold the top of the phone to the card, tap the Posh notification. Safari opens the card, and this screen shows the tap.</div></div>
          <div className="flex gap-3"><span className="w-9 h-9 rounded-xl bg-card-2 grid place-items-center shrink-0"><Smartphone size={18} /></span><div><b>Android</b>: with NFC on, hold the card to the back of the phone. The Posh app opens straight on the card (or Chrome opens the page). The chip serial is checked.</div></div>
          <div className="flex gap-3"><span className="w-9 h-9 rounded-xl bg-brand-soft text-brand grid place-items-center shrink-0"><CheckCircle2 size={18} /></span><div><b>No NFC on the phone?</b> Scan the QR on the back of the card or on the plaque with the phone camera, or with this screen's camera. Same result.</div></div>
          <div className="flex gap-3"><span className="w-9 h-9 rounded-xl bg-brand-soft text-brand grid place-items-center shrink-0"><Wifi size={18} /></span><div><b>Here in Posh Office</b>: every tap and scan appears above and pops up on every Office screen, live.</div></div>
        </div>
      </Card>
    </div>

    <Sheet open={scan} onClose={() => setScan(false)} title="Scan a Posh card or plaque QR">{scan && <QrScanner hint="Hold the back of the Posh card (or the plaque QR) up to this camera." onResult={(text) => {
      setScan(false)
      const t = parseTarget(text)
      if (!t) return toast('That QR code is not a Posh card or plaque', 'warn')
      const c = t.type === 'card' ? db.cards[t.id] : cards.find((x) => x.type === 'Plaque' && x.propertyId === t.id)
      logRead(c, undefined, 'QR scan · Posh Office camera')
    }} />}</Sheet>
    <Card className="mt-4">
      <div className="p-5 pb-2 font-bold flex items-center gap-2"><Nfc size={18} className="text-brand" />All taps and scans</div>
      <div className="px-5 pb-4 divide-y divide-line">{taps.slice(0, 40).map((t) => (
        <div key={t.id} className={cx('flex items-center gap-3 py-2 text-sm', lastChange?.id === t.id && 'flash')}>
          <span className="text-xs text-muted w-12 shrink-0">{fmtTime(t.at)}</span>
          <Badge tone={t.kind === 'Pay' ? 'gold' : t.kind === 'Plaque' ? 'blue' : 'gray'}>{t.kind === 'Pay' ? 'Pay' : t.kind}</Badge>{t.place.includes('QR') ? <QrCode size={14} className="text-muted shrink-0" /> : <Nfc size={14} className="text-brand shrink-0" />}
          <span className="flex-1 min-w-0 truncate"><b>{t.who ?? 'Unknown'}</b> · <span className="text-muted">{t.place}</span>{t.cardId && <span className="font-mono text-xs text-muted"> · {t.cardId}</span>}</span>
          <Badge tone={statusTone(t.result)}>{t.result === 'OK' ? 'Genuine' : t.result}</Badge>
        </div>))}</div>
    </Card>
  </>)
}
