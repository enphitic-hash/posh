import { useEffect, useMemo, useRef, useState } from 'react'
import { Routes, Route, useNavigate, useParams, Navigate, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { printDoc, docFromPayment } from '../lib/docs'
import { Wallet, Wrench, FileText, Receipt, UserPlus, Nfc, CheckCircle2, Smartphone, CreditCard, Landmark, PiggyBank, Split, Camera, Download, MessageCircle, ShieldCheck, Droplets, Zap, Clock, Plus, X, Printer, QrCode } from 'lucide-react'
import { useStore, list } from '../data/store'
import { usePrefs } from '../data/prefs'
import type { PayMethod, Payment, Repair } from '../data/types'
import { tenantDue, recordPayment, sendMessage } from '../lib/logic'
import { ugx, monthLabel, fmtDate, fmtDT, nowIso, uid, num } from '../lib/format'
import { receiptPdf } from '../lib/pdf'
import { readOnce, webNfcSupported, parseTarget } from '../lib/nfc'
import { Card, Btn, Badge, statusTone, Section, Field, inputCls, toast, cx, Empty, Seal } from '../components/ui'
import { TopBar, Screen, NfcButton, BellButton, NfcSheet } from './MobileApp'

function useTenant() {
  const id = usePrefs((s) => s.app.tenantId)!
  const db = useStore((s) => s.db)
  const t = db.tenants[id]
  return { db, t, unit: t ? db.units[t.unitId] : undefined }
}

function Home() {
  const { db, t, unit } = useTenant()
  const nav = useNavigate()
  const due = tenantDue(db, t)
  const repairs = list(db, 'repairs').filter((r) => r.tenantId === t.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  const pays = list(db, 'payments').filter((p) => p.tenantId === t.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3)
  const first = t.name.split(' ')[0]
  const dueDate = new Date(due.month + '-01T09:00:00+03:00')
  return (<>
    <TopBar title={`Hi, ${first}`} sub={`${unit!.estate} · ${unit!.name} · ${unit!.beds} bed`} right={<div className="flex gap-2"><NfcButton /><BellButton /></div>} />
    <Screen>
      <div className={cx('rounded-3xl p-5 text-white shadow-lg', due.balance === 0 ? 'bg-[linear-gradient(135deg,#1A8043,#0B4A24)]' : 'bg-[linear-gradient(135deg,#136734,#062E17)]')}>
        {due.balance === 0 ? (<>
          <div className="text-sm text-white/80 flex items-center gap-1"><CheckCircle2 size={16} />{monthLabel(due.month, true)} fully paid</div>
          <div className="text-3xl font-extrabold mt-1">{ugx(due.paid)}</div>
          <div className="text-sm text-white/80 mt-1">Rent cleared · gate card active</div>
        </>) : (<>
          <div className="text-sm text-white/80">Rent due {fmtDate(dueDate.toISOString(), { weekday: 'short', day: 'numeric', month: 'short' })}{due.paid > 0 && ` · ${ugx(due.paid)} paid`}</div>
          <div className="text-3xl font-extrabold mt-1">{ugx(due.balance)}</div>
          <div className="text-sm text-white/80 mt-1">Lease to {fmtDate(t.leaseEnd, { day: 'numeric', month: 'short', year: 'numeric' })} · Posh-managed</div>
          <Btn onClick={() => nav('/app/pay/go')} className="mt-4 bg-white !text-brand hover:bg-white/90" block icon={<Nfc size={18} />}>Pay with Posh card</Btn>
        </>)}
      </div>

      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          { label: 'Pay rent', icon: Wallet, to: '/app/pay/go', c: 'bg-brand-soft text-brand' },
          { label: 'Repair', icon: Wrench, to: '/app/repairs/new', c: 'bg-gold-soft text-gold' },
          { label: 'Visitor', icon: UserPlus, to: '/app/visitor', c: 'bg-blue-soft text-sky-600' },
          { label: 'Receipts', icon: Receipt, to: '/app/pay', c: 'bg-card-2 text-muted' },
        ].map((a) => (
          <button key={a.label} onClick={() => nav(a.to)} className="bg-card border border-line rounded-2xl py-3 flex flex-col items-center gap-1.5 text-xs font-semibold">
            <span className={cx('w-10 h-10 rounded-xl grid place-items-center', a.c)}><a.icon size={20} /></span>{a.label}
          </button>
        ))}
      </div>

      <Section title="Repairs" action={<button onClick={() => nav('/app/repairs')} className="text-sm font-semibold text-brand">See all</button>}>
        <Card>{repairs.length === 0 ? <Empty>No repairs</Empty> : repairs.map((r, i) => <RepairRow key={r.id} r={r} border={i > 0} />)}</Card>
      </Section>
      <Section title="Payments" action={<button onClick={() => nav('/app/pay')} className="text-sm font-semibold text-brand">See all</button>}>
        <Card>{pays.map((p, i) => <PayRow key={p.id} p={p} border={i > 0} />)}</Card>
      </Section>
      <Section title="Your Posh card">
        <PoshCard name={t.name} number={t.cardId ?? ''} unit={`${unit!.estate.replace('Posh ', '')} ${unit!.name}`} />
        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          <Card className="p-3 flex items-center gap-2"><ShieldCheck size={18} className="text-brand" />Gate · Lift · Gym</Card>
          <Card className="p-3 flex items-center gap-2"><Droplets size={18} className="text-sky-500" />Water {num(48500)} est.</Card>
        </div>
      </Section>
    </Screen>
  </>)
}

export function PoshCard({ name, number, unit, small }: { name: string; number: string; unit: string; small?: boolean }) {
  return (
    <div className={cx('relative rounded-2xl text-white overflow-hidden shadow-lg aspect-[1.586] flex flex-col justify-between bg-[linear-gradient(135deg,#0B4A24,#062E17_60%,#1A8043)]', small ? 'p-3.5' : 'p-5')}>
      <div className="absolute top-0 left-0 right-0 h-1 flex"><span className="flex-1 bg-[#ED1F24]" /><span className="flex-1 bg-[#2FA35A]" /></div>
      <svg viewBox="0 0 100 90" className="absolute -right-6 -bottom-8 w-48 opacity-15 pointer-events-none"><g fill="none" stroke="#fff" strokeWidth="3"><path d="M14 78V62l8-5v21M28 78V46l9-6v38M43 78V26l7-12v64M50 14l7 12v52M63 78V36l8 5v37M77 78V52l8 5v21M6 78h88" /></g></svg>
      <div className="relative flex justify-between items-start">
        <div className="leading-none"><div className={cx('font-serif tracking-wide', small ? 'text-xl' : 'text-2xl')}>POSH</div><div className="text-[9px] tracking-[.3em] text-[#E3B93A] font-bold mt-1">RESIDENT CARD</div></div>
        <Nfc className="opacity-80" size={small ? 18 : 24} />
      </div>
      <div className="relative">
        <div className={cx('rounded-md bg-[linear-gradient(135deg,#E3B93A,#B8901A)]', small ? 'w-8 h-6 mb-2' : 'w-10 h-7 mb-3')} />
        <div className={cx('font-mono tracking-widest', small ? 'text-xs' : 'text-sm')}>{number}</div>
        <div className="flex justify-between gap-2 text-[11px] mt-1 text-white/80"><span className="uppercase truncate">{name}</span><span className="truncate">{unit}</span></div>
      </div>
    </div>
  )
}

function RepairRow({ r, border }: { r: Repair; border?: boolean }) {
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const tech = r.technicianId ? db.technicians[r.technicianId] : undefined
  return (
    <button onClick={() => nav(`/app/repairs/${r.id}`)} className={cx('w-full text-left flex items-center gap-3 p-3', border && 'border-t border-line')}>
      <span className={cx('w-10 h-10 rounded-xl grid place-items-center', r.status === 'Done' ? 'bg-brand-soft text-brand' : 'bg-gold-soft text-gold')}>{r.status === 'Done' ? <CheckCircle2 size={20} /> : <Wrench size={20} />}</span>
      <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{r.title}</span><span className="block text-xs text-muted truncate">{r.status === 'Done' ? `Fixed ${r.doneAt ? fmtDate(r.doneAt, { day: 'numeric', month: 'short' }) : ''}` : tech ? `${tech.trade} ${tech.name.split(' ')[0]}${r.slot ? ' · ' + r.slot : ''}` : 'Waiting for the office'}</span></span>
      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
    </button>
  )
}

function PayRow({ p, border }: { p: Payment; border?: boolean }) {
  const nav = useNavigate()
  return (
    <button onClick={() => nav(`/app/receipt/${p.id}`)} className={cx('w-full text-left flex items-center gap-3 p-3', border && 'border-t border-line')}>
      <span className="w-10 h-10 rounded-xl grid place-items-center bg-brand-soft text-brand"><Wallet size={20} /></span>
      <span className="flex-1 min-w-0"><span className="block font-semibold truncate">{monthLabel(p.month, true).split(' ')[0]} rent · {p.method}</span><span className="block text-xs text-muted">{fmtDT(p.at)} · {p.receipt}</span></span>
      <span className="text-right"><span className="block font-bold text-brand text-sm">{num(p.amount)}</span>{p.status === 'Part' && <Badge tone="gold">Part</Badge>}</span>
    </button>
  )
}

function PayTab() {
  const { db, t } = useTenant()
  const nav = useNavigate()
  const due = tenantDue(db, t)
  const pays = list(db, 'payments').filter((p) => p.tenantId === t.id).sort((a, b) => b.at.localeCompare(a.at))
  return (<>
    <TopBar title="Pay" sub="Rent, service charge and water" right={<NfcButton />} />
    <Screen>
      <Card className="p-4">
        <div className="text-sm text-muted">{monthLabel(due.month, true)}</div>
        {due.lines.map((l) => <div key={l.label} className="flex justify-between text-sm py-1"><span>{l.label}</span><span>{num(l.amount)}</span></div>)}
        {due.paid > 0 && <div className="flex justify-between text-sm py-1 text-brand"><span>Paid so far</span><span>− {num(due.paid)}</span></div>}
        <div className="flex justify-between font-extrabold text-lg border-t border-line pt-2 mt-1"><span>To pay</span><span>{ugx(due.balance)}</span></div>
        <Btn block size="lg" className="mt-3" disabled={due.balance === 0} onClick={() => nav('/app/pay/go')} icon={<Nfc size={18} />}>{due.balance === 0 ? 'All paid, thank you' : 'Pay now'}</Btn>
        <div className="text-xs text-muted mt-2 text-center">Posh Wallet balance: {ugx(t.wallet)}</div>
      </Card>
      <Section title="Receipts"><Card>{pays.map((p, i) => <PayRow key={p.id} p={p} border={i > 0} />)}</Card></Section>
    </Screen>
  </>)
}

const METHODS: { id: PayMethod; label: string; sub: string; icon: typeof Wallet; color: string }[] = [
  { id: 'MTN MoMo', label: 'MTN Mobile Money', sub: 'Approve with your MoMo PIN', icon: Smartphone, color: 'bg-[#FFCB05] text-black' },
  { id: 'Airtel Money', label: 'Airtel Money', sub: 'Approve with your Airtel PIN', icon: Smartphone, color: 'bg-[#E40000] text-white' },
  { id: 'Visa', label: 'Visa or Mastercard', sub: 'Also for tenants abroad', icon: CreditCard, color: 'bg-[#1A1F71] text-white' },
  { id: 'Bank transfer', label: 'Bank transfer', sub: 'Stanbic, Centenary, dfcu, Absa · auto-matched', icon: Landmark, color: 'bg-card-2 text-ink' },
  { id: 'Posh Wallet', label: 'Posh Wallet', sub: 'Use your saved balance', icon: PiggyBank, color: 'bg-brand text-white' },
]

function PayFlow() {
  const { db, t, unit } = useTenant()
  const nav = useNavigate()
  const due = tenantDue(db, t)
  const [sp] = useSearchParams()
  const cardFromTap = sp.get('card') && db.cards[sp.get('card')!]?.holderId === t.id ? sp.get('card') : null
  const [step, setStep] = useState<1 | 2 | 3>(cardFromTap ? 2 : 1)
  const [tapped, setTapped] = useState<string | null>(cardFromTap)
  const [nfcOpen, setNfcOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [via, setVia] = useState<'nfc' | 'qr'>('nfc')
  const [method, setMethod] = useState<PayMethod>('MTN MoMo')
  const [split, setSplit] = useState(false)
  const [phone, setPhone] = useState(t.phone)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [card, setCard] = useState({ no: '4111 1111 1111 1111', exp: '12/28', cvv: '123' })
  const firstPart = Math.min(due.balance, Math.round(due.balance / 2 / 50000) * 50000)
  const amount = split ? firstPart : due.balance
  const walletShort = method === 'Posh Wallet' && t.wallet < amount
  const autoScan = useRef(false)

  useEffect(() => {
    // On Android Chrome, start listening for the card straight away.
    if (step === 1 && webNfcSupported() && !autoScan.current) {
      autoScan.current = true
      const ctrl = new AbortController()
      readOnce(ctrl.signal).then((r) => onTap(r.serial, parseTarget(r.url))).catch(() => {})
      return () => ctrl.abort()
    }
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  function onTap(serial?: string, target?: ReturnType<typeof parseTarget>, how: 'nfc' | 'qr' = 'nfc') {
    const c = (target?.type === 'card' && db.cards[target.id]) || list(db, 'cards').find((x) => serial && x.uid === serial)
    if (!c) return toast('That card is not registered with Posh', 'warn')
    if (c.holderId !== t.id) return toast(`That card belongs to ${c.holder}`, 'warn')
    if (c.status === 'Blocked') return toast('This card is blocked. Call the Posh office.', 'warn')
    setTapped(c.id)
    navigator.vibrate?.(60)
    toast(`${how === 'qr' ? 'QR scanned' : 'Posh card read by NFC'} · ${c.id}`)
    useStore.getState().put('taps', { id: uid('TP'), cardId: c.id, uid: serial, kind: 'Pay', place: `${how === 'qr' ? 'QR scan' : 'NFC tap'} · Posh app rent`, at: nowIso(), result: 'OK', who: c.holder })
    setTimeout(() => setStep(2), 600)
  }

  async function finish() {
    setBusy(true)
    await new Promise((r) => setTimeout(r, method === 'Bank transfer' ? 900 : 1800))
    const lines = split ? [{ label: 'Part 1 of 2 (rent)', amount }] : due.lines.map((l) => ({ ...l }))
    if (!split && due.paid > 0) lines.push({ label: 'Less paid earlier', amount: -due.paid })
    const p = recordPayment({ tenantId: t.id, amount, method: method === 'Visa' && card.no.trim().startsWith('5') ? 'Mastercard' : method, via: tapped ? 'Card tap' : 'App', lines, month: due.month, part: split ? `Part 1 of 2 · balance ${ugx(due.balance - amount)} by 1st` : undefined })
    setBusy(false)
    nav(`/app/receipt/${p.id}?new=1`, { replace: true })
  }

  if (due.balance === 0) return <Navigate to="/app/pay" replace />
  return (<>
    <TopBar back title={step === 1 ? 'Pay with Posh card' : step === 2 ? 'Choose how to pay' : method.includes('MoMo') || method.includes('Airtel') ? 'Approve on your phone' : 'Confirm payment'} sub={`Step ${step} of 3`} />
    <Screen>
      {step === 1 && (<>
        <button onClick={() => (webNfcSupported() ? null : setNfcOpen(true))} className="w-full flex flex-col items-center gap-3 py-6">
          <div className="relative w-56">
            <span className="absolute -inset-2 rounded-3xl border-4 border-brand pulse-card" />
            <PoshCard small name={t.name} number={t.cardId ?? ''} unit={`${unit!.estate.replace('Posh ', '')} ${unit!.name}`} />
          </div>
          <div className="font-bold mt-2">{tapped ? (via === 'qr' ? 'QR scanned ✓' : 'Card read by NFC ✓') : 'Hold your Posh card to the back of the phone'}</div>
          <div className="text-sm text-muted">{webNfcSupported() ? 'Listening for your card…' : 'Tap here to read your card'}</div>
        </button>
        <Card className="p-4">
          <div className="text-sm text-muted mb-1">{monthLabel(due.month, true)} · {unit!.estate} {unit!.name}</div>
          {due.lines.map((l) => <div key={l.label} className="flex justify-between text-sm py-1"><span>{l.label}</span><span>{num(l.amount)}</span></div>)}
          {due.paid > 0 && <div className="flex justify-between text-sm py-1 text-brand"><span>Paid earlier</span><span>− {num(due.paid)}</span></div>}
          <div className="flex justify-between font-extrabold text-lg border-t border-line pt-2 mt-1"><span>Total</span><span>{ugx(due.balance)}</span></div>
        </Card>
        <Btn block size="lg" variant="outline" className="mt-4" icon={<QrCode size={18} />} onClick={() => setQrOpen(true)}>No NFC? Scan the QR on your card</Btn>
        <Btn block variant="ghost" className="mt-2" onClick={() => setStep(2)}>Continue without card</Btn>
        <NfcSheet open={nfcOpen || qrOpen} startQr={qrOpen} onClose={() => { setNfcOpen(false); setQrOpen(false) }} title="Your Posh card" onRead={({ serial, target, via }) => { setVia(via); onTap(serial, target, via) }} />
      </>)}

      {step === 2 && (<>
        <div className="space-y-2">
          {METHODS.map((m) => (
            <button key={m.id} onClick={() => setMethod(m.id)} className={cx('w-full flex items-center gap-3 p-3 rounded-2xl border bg-card text-left transition', method === m.id ? 'border-brand ring-2 ring-brand/20' : 'border-line')}>
              <span className={cx('w-11 h-11 rounded-xl grid place-items-center font-bold', m.color)}><m.icon size={20} /></span>
              <span className="flex-1"><span className="block font-semibold">{m.label}</span><span className="block text-xs text-muted">{m.id === 'Posh Wallet' ? `Balance ${ugx(t.wallet)}` : m.sub}</span></span>
              <span className={cx('w-5 h-5 rounded-full border-2', method === m.id ? 'border-brand bg-brand shadow-[inset_0_0_0_3px_var(--card)]' : 'border-line')} />
            </button>
          ))}
        </div>
        <Card className="p-3 mt-3 flex items-center gap-3">
          <Split size={20} className="text-gold" />
          <div className="flex-1"><div className="font-semibold text-sm">Split into 2 payments</div><div className="text-xs text-muted">{ugx(firstPart)} today, balance by the 1st</div></div>
          <button role="switch" aria-checked={split} onClick={() => setSplit(!split)} className={cx('w-12 h-7 rounded-full p-1 transition', split ? 'bg-brand' : 'bg-line')}><span className={cx('block w-5 h-5 rounded-full bg-white shadow transition', split && 'translate-x-5')} /></button>
        </Card>
        {(method === 'MTN MoMo' || method === 'Airtel Money') && <Field label={`${method} number`}><input className={cx(inputCls, 'mt-1')} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></Field>}
        {walletShort && <div className="text-sm text-posh-red mt-2">Wallet balance is not enough for {ugx(amount)}.</div>}
        <Btn block size="lg" className="mt-4" disabled={walletShort} onClick={() => setStep(3)}>Pay {ugx(amount)}</Btn>
      </>)}

      {step === 3 && (method === 'MTN MoMo' || method === 'Airtel Money') && (
        <div className="flex flex-col items-center text-center">
          <div className={cx('mt-2 w-full rounded-3xl p-5', method === 'MTN MoMo' ? 'bg-[#FFCB05] text-black' : 'bg-[#E40000] text-white')}>
            <div className="text-xs font-bold tracking-widest opacity-70">{method === 'MTN MoMo' ? 'MTN MOBILE MONEY' : 'AIRTEL MONEY'}</div>
            <div className="mt-2 text-sm">Pay <b>{ugx(amount)}</b> to <b>POSH PROPERTIES LTD</b></div>
            <div className="text-xs opacity-80 mt-1">Ref {unit!.name}-{monthLabel(due.month).toUpperCase().replace(' ', '')}-RENT · Fee UGX 0</div>
            <div className="mt-4 flex justify-center gap-3">{[0, 1, 2, 3].map((i) => <span key={i} className={cx('w-4 h-4 rounded-full border-2', method === 'MTN MoMo' ? 'border-black' : 'border-white', pin.length > i && (method === 'MTN MoMo' ? 'bg-black' : 'bg-white'))} />)}</div>
            <div className="text-xs mt-2 opacity-80">Enter your PIN to approve · demo PIN 1234</div>
          </div>
          <div className="grid grid-cols-3 gap-2 w-full mt-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k) => (
              <button key={k} disabled={!k || busy} onClick={() => setPin((p) => (k === '⌫' ? p.slice(0, -1) : p.length < 4 ? p + k : p))} className={cx('h-14 rounded-2xl text-xl font-bold', k ? 'bg-card border border-line active:bg-card-2' : '')}>{k}</button>
            ))}
          </div>
          <Btn block size="lg" className="mt-4" disabled={pin.length < 4 || busy} onClick={() => (pin === '1234' ? finish() : (toast('Wrong PIN, try again', 'warn'), setPin('')))}>{busy ? 'Waiting for ' + (method === 'MTN MoMo' ? 'MTN' : 'Airtel') + '…' : 'Send'}</Btn>
          <Btn block variant="ghost" className="mt-1" onClick={() => setStep(2)}>Cancel</Btn>
        </div>
      )}

      {step === 3 && (method === 'Visa') && (
        <Card className="p-4 space-y-3">
          <div className="text-sm text-muted">Card payment · secured by 3-D Secure</div>
          <Field label="Card number"><input className={inputCls} value={card.no} onChange={(e) => setCard({ ...card, no: e.target.value })} inputMode="numeric" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry"><input className={inputCls} value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></Field>
            <Field label="CVV"><input className={inputCls} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} type="password" maxLength={4} /></Field>
          </div>
          <Btn block size="lg" disabled={busy || card.no.replace(/\D/g, '').length < 15} onClick={finish}>{busy ? 'Checking with your bank…' : `Pay ${ugx(amount)}`}</Btn>
          <div className="text-xs text-muted text-center">Test card: 4111 1111 1111 1111</div>
        </Card>
      )}

      {step === 3 && method === 'Bank transfer' && (
        <Card className="p-4 space-y-2 text-sm">
          <div className="font-bold">Send {ugx(amount)} to:</div>
          {[['Bank', 'Stanbic Bank, Kampala Rd'], ['Account name', 'Posh Properties Ltd'], ['Account no.', '9030 0123 45678'], ['Reference', `${unit!.name}-${due.month}`]].map(([a, b]) => <div key={a} className="flex justify-between border-b border-line py-1.5"><span className="text-muted">{a}</span><span className="font-semibold">{b}</span></div>)}
          <div className="text-xs text-muted">Posh matches the transfer to your home automatically using the reference.</div>
          <Btn block size="lg" disabled={busy} onClick={finish}>{busy ? 'Matching…' : "I've sent it"}</Btn>
        </Card>
      )}

      {step === 3 && method === 'Posh Wallet' && (
        <Card className="p-4 text-center">
          <PiggyBank size={40} className="mx-auto text-brand" />
          <div className="mt-2">Pay <b>{ugx(amount)}</b> from your Posh Wallet ({ugx(t.wallet)})</div>
          <Btn block size="lg" className="mt-4" disabled={busy} onClick={finish}>{busy ? 'Paying…' : 'Confirm'}</Btn>
        </Card>
      )}
    </Screen>
  </>)
}

function ReceiptView() {
  const { id } = useParams()
  const db = useStore((s) => s.db)
  const nav = useNavigate()
  const p = db.payments[id!]
  const isNew = location.hash.includes('new=1')
  if (!p) return <Navigate to="/app/pay" replace />
  const t = db.tenants[p.tenantId]; const u = db.units[p.unitId]; const l = db.landlords[u.landlordId]
  const due = tenantDue(db, t, p.month)
  const wa = `Posh Properties receipt ${p.receipt}\n${t.name} · ${u.estate} ${u.name}\n${monthLabel(p.month, true)}: ${ugx(p.amount)} by ${p.method} (ref ${p.ref})\n${fmtDT(p.at)}`
  return (<>
    <TopBar back title={isNew ? 'Payment received' : 'Receipt'} sub={p.receipt} />
    <Screen>
      {isNew && (
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-20 h-20 rounded-full bg-brand text-white grid place-items-center shadow-lg anim-rise"><CheckCircle2 size={44} /></div>
          <div className="text-2xl font-extrabold mt-3">{ugx(p.amount)}</div>
          <div className="text-muted text-sm">{fmtDT(p.at)}</div>
          <Badge tone={due.balance === 0 ? 'green' : 'gold'} className="mt-2">{due.balance === 0 ? `${monthLabel(p.month, true)} fully paid · gate card active` : `Balance ${ugx(due.balance)} by the 1st`}</Badge>
        </div>
      )}
      <Card className="p-4 relative overflow-hidden">
        <Seal className="absolute -right-8 -top-8 w-32 opacity-10" />
        <div className="text-xs text-muted">Receipt from</div>
        <div className="font-bold">Posh Properties Ltd</div>
        <div className="mt-3 space-y-1.5 text-sm">
          {[['Receipt', p.receipt], ['Paid by', t.name], ['Home', `${u.estate} ${u.name}`], ['Method', p.method], ['Transaction ref', p.ref], ['Started by', p.via === 'Card tap' ? 'Posh card tap' : p.via]].map(([a, b]) => <div key={a} className="flex justify-between gap-3"><span className="text-muted">{a}</span><span className="font-semibold text-right">{b}</span></div>)}
        </div>
        <div className="border-t border-dashed border-line my-3" />
        {p.lines.map((x) => <div key={x.label} className="flex justify-between text-sm py-0.5"><span>{x.label}</span><span>{num(x.amount)}</span></div>)}
        <div className="flex justify-between font-extrabold text-lg mt-2"><span>Total</span><span>{ugx(p.amount)}</span></div>
      </Card>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Btn variant="outline" icon={<MessageCircle size={16} />} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(wa)}`, '_blank')}>WhatsApp</Btn>
        <Btn variant="outline" icon={<Download size={16} />} onClick={() => receiptPdf(db, p).catch(() => toast('Could not make the PDF', 'warn'))}>PDF</Btn>
        <Btn variant="outline" icon={<Printer size={16} />} onClick={() => printDoc(docFromPayment(db, p), 'thermal')}>Print</Btn>
      </div>
      <Section title="Who was told">
        <Card className="p-3 space-y-2 text-sm">
          <div className="flex gap-2"><CheckCircle2 size={18} className="text-brand shrink-0" />You · WhatsApp receipt sent</div>
          <div className="flex gap-2"><CheckCircle2 size={18} className="text-brand shrink-0" />Posh rent desk · auto-matched to {u.name}</div>
          {l && l.id !== 'L-03' && <div className="flex gap-2"><CheckCircle2 size={18} className="text-brand shrink-0" />Landlord {l.name} · paid out on the {l.payoutDay}th</div>}
          <div className="flex gap-2"><CheckCircle2 size={18} className="text-brand shrink-0" />URA rental record saved</div>
        </Card>
      </Section>
      {isNew && <Btn block size="lg" className="mt-4" onClick={() => nav('/app/home', { replace: true })}>Done</Btn>}
    </Screen>
  </>)
}

function RepairsTab() {
  const { db, t } = useTenant()
  const nav = useNavigate()
  const rs = list(db, 'repairs').filter((r) => r.tenantId === t.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (<>
    <TopBar title="Repairs" sub="Report with a photo · we send the right person" right={<Btn size="sm" icon={<Plus size={16} />} onClick={() => nav('/app/repairs/new')}>Report</Btn>} />
    <Screen><Card>{rs.length === 0 ? <Empty>No repairs yet</Empty> : rs.map((r, i) => <RepairRow key={r.id} r={r} border={i > 0} />)}</Card></Screen>
  </>)
}

const CATS = ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Gate & access', 'Other']
function NewRepair() {
  const { t, unit } = useTenant()
  const put = useStore((s) => s.put)
  const nav = useNavigate()
  const [cat, setCat] = useState('Plumbing')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const onFiles = async (files: FileList | null) => {
    if (!files) return
    setPhotos((p) => [...p, ''].slice(0, 3))
    const out: string[] = []
    for (const f of Array.from(files).slice(0, 3)) out.push(await shrink(f))
    setPhotos(out)
  }
  const submit = () => {
    if (!title.trim()) return toast('Say what is wrong', 'warn')
    const r: Repair = { id: uid('R'), tenantId: t.id, unitId: unit!.id, estate: unit!.estate, title: title.trim(), category: cat, description: desc.trim(), photos: photos.filter(Boolean), status: 'Reported', urgent, createdAt: nowIso(), log: [{ at: nowIso(), text: `Reported in the app${photos.length ? ` with ${photos.length} photo${photos.length > 1 ? 's' : ''}` : ''}` }] }
    put('repairs', r)
    sendMessage({ to: t.name, phone: t.phone, channel: 'WhatsApp', kind: 'repair', text: `Posh: We got your repair "${r.title}". The office will assign someone shortly.` })
    toast('Repair sent to the Posh office')
    nav(`/app/repairs/${r.id}`, { replace: true })
  }
  return (<>
    <TopBar back title="Report a repair" sub={`${unit!.estate} · ${unit!.name}`} />
    <Screen className="space-y-4">
      <div className="flex flex-wrap gap-2">{CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={cx('h-9 px-3 rounded-full border text-sm font-semibold', cat === c ? 'bg-ink text-bg border-ink' : 'border-line bg-card')}>{c}</button>)}</div>
      <Field label="What is wrong?"><input className={inputCls} placeholder="e.g. Kitchen sink leaking" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="More detail (optional)"><textarea className={cx(inputCls, 'h-24 py-2')} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
      <div>
        <div className="text-[0.8125rem] font-semibold text-muted mb-1">Photos</div>
        <div className="flex gap-2">
          {photos.map((p, i) => p ? <div key={i} className="relative"><img src={p} className="w-20 h-20 rounded-xl object-cover" alt="" /><button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-ink text-bg grid place-items-center"><X size={14} /></button></div> : <div key={i} className="w-20 h-20 rounded-xl bg-card-2 animate-pulse" />)}
          {photos.length < 3 && <button onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-line grid place-items-center text-muted"><Camera /></button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      </div>
      <Card className="p-3 flex items-center gap-3">
        <Zap size={20} className="text-posh-red" />
        <div className="flex-1"><div className="font-semibold text-sm">Urgent</div><div className="text-xs text-muted">Water or power danger, security</div></div>
        <button role="switch" aria-checked={urgent} onClick={() => setUrgent(!urgent)} className={cx('w-12 h-7 rounded-full p-1 transition', urgent ? 'bg-posh-red' : 'bg-line')}><span className={cx('block w-5 h-5 rounded-full bg-white shadow transition', urgent && 'translate-x-5')} /></button>
      </Card>
      <Btn block size="lg" onClick={submit}>Send to Posh</Btn>
    </Screen>
  </>)
}

export async function shrink(f: File, max = 900): Promise<string> {
  const url = URL.createObjectURL(f)
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
  const s = Math.min(1, max / Math.max(img.width, img.height))
  const c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
  URL.revokeObjectURL(url)
  return c.toDataURL('image/jpeg', 0.7)
}

function RepairDetail() {
  const { id } = useParams()
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const r = db.repairs[id!]
  if (!r) return <Navigate to="/app/repairs" replace />
  const tech = r.technicianId ? db.technicians[r.technicianId] : undefined
  const steps: Repair['status'][] = ['Reported', 'Assigned', 'Booked', 'In progress', 'Done']
  const at = steps.indexOf(r.status)
  return (<>
    <TopBar back title={r.title} sub={`${r.category} · ${r.id}`} />
    <Screen className="space-y-3">
      <Card className="p-4">
        <div className="flex justify-between">{steps.map((s, i) => <div key={s} className="flex-1 flex flex-col items-center gap-1 text-[10px] text-center"><span className={cx('w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold', i <= at ? 'bg-brand text-white' : 'bg-card-2 text-muted')}>{i + 1}</span>{s}</div>)}</div>
      </Card>
      {tech && <Card className="p-4 flex items-center gap-3"><div className="w-11 h-11 rounded-full bg-gold-soft text-gold grid place-items-center"><Wrench size={20} /></div><div className="flex-1"><div className="font-bold">{tech.name}</div><div className="text-sm text-muted">{tech.trade} · ★ {tech.rating}{r.slot ? ` · ${r.slot}` : ''}</div></div><a href={`tel:${tech.phone.replace(/\s/g, '')}`} className="text-brand font-semibold text-sm">Call</a></Card>}
      {r.photos.length > 0 && <div className="flex gap-2">{r.photos.map((p, i) => <img key={i} src={p} alt="" className="w-24 h-24 rounded-xl object-cover" />)}</div>}
      {r.description && <Card className="p-4 text-sm">{r.description}</Card>}
      <Card className="p-4">
        <div className="font-bold mb-2">History</div>
        {r.log.slice().reverse().map((l, i) => <div key={i} className="flex gap-3 text-sm py-1.5"><Clock size={14} className="mt-0.5 text-muted shrink-0" /><div><div>{l.text}</div><div className="text-xs text-muted">{fmtDT(l.at)}</div></div></div>)}
      </Card>
      {r.status !== 'Done' && r.technicianId && <Btn block variant="soft" onClick={() => { patch('repairs', r.id, { status: 'Done', doneAt: nowIso(), log: [...r.log, { at: nowIso(), text: 'Tenant confirmed it is fixed' }] }); toast('Thanks! Marked as fixed') }}>It's fixed</Btn>}
    </Screen>
  </>)
}

function Lease() {
  const { t, unit, db } = useTenant()
  const l = db.landlords[unit!.landlordId]
  const [signed, setSigned] = useState(true)
  return (<>
    <TopBar title="Lease" sub="Signed in the app" />
    <Screen className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center gap-3"><FileText className="text-brand" /><div className="flex-1"><div className="font-bold">Tenancy agreement</div><div className="text-sm text-muted">{unit!.estate} · {unit!.name}</div></div><Badge tone="green">Active</Badge></div>
        <div className="mt-3 space-y-1.5 text-sm">
          {[['Tenant', t.name], ['Landlord', l?.name ?? ''], ['Managed by', 'Posh Properties Ltd'], ['Start', fmtDate(t.leaseStart)], ['End', fmtDate(t.leaseEnd)], ['Monthly rent', ugx(unit!.rent)], ['Service charge', ugx(unit!.service)], ['Deposit held', ugx(unit!.rent * 2)], ['Notice period', '2 months']].map(([a, b]) => <div key={a} className="flex justify-between"><span className="text-muted">{a}</span><span className="font-semibold">{b}</span></div>)}
        </div>
      </Card>
      <Card className="p-4 text-sm">
        <div className="font-bold mb-1">Your rights, in short</div>
        <ul className="list-disc pl-5 text-muted space-y-1"><li>Written lease is required for rent of UGX 500,000+ a month (Landlord and Tenant Act 2022).</li><li>Rent can rise at most 10% a year unless you agree.</li><li>Receipts for every payment, in the app.</li></ul>
      </Card>
      <Card className="p-4 flex items-center gap-3"><div className="flex-1"><div className="font-bold text-sm">Signature</div><div className="text-xs text-muted">{signed ? `Signed in the app on ${fmtDate(t.leaseStart)}` : 'Not signed'}</div></div><Btn size="sm" variant="outline" onClick={() => { setSigned(true); toast('Lease copy sent to WhatsApp') }}>Send me a copy</Btn></Card>
    </Screen>
  </>)
}

function Visitor() {
  const { t, unit } = useTenant()
  const [name, setName] = useState('')
  const [qr, setQr] = useState('')
  const code = useMemo(() => Math.floor(100000 + Math.random() * 899999).toString(), [qr === ''])  // eslint-disable-line react-hooks/exhaustive-deps
  const make = async () => {
    if (!name.trim()) return toast('Enter the visitor name', 'warn')
    setQr(await QRCode.toDataURL(`POSH-GATE|${unit!.estate}|${unit!.name}|${name}|${code}`, { margin: 1, width: 260, color: { dark: '#136734' } }))
    sendMessage({ to: t.name, channel: 'WhatsApp', kind: 'visitor', text: `Posh gate pass for ${name}: code ${code}, valid today at ${unit!.estate}.` })
  }
  return (<>
    <TopBar back title="Visitor gate pass" sub="One-time, valid today" />
    <Screen className="space-y-3">
      {!qr ? (<>
        <Field label="Visitor name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brian Kato" /></Field>
        <Btn block size="lg" onClick={make}>Create pass</Btn>
      </>) : (
        <Card className="p-5 text-center">
          <img src={qr} alt="Gate pass QR" className="mx-auto w-56 h-56" />
          <div className="text-3xl font-extrabold tracking-[.3em] mt-2">{code}</div>
          <div className="text-sm text-muted mt-1">{name} · {unit!.estate} {unit!.name} · today</div>
          <Btn className="mt-4" variant="outline" icon={<MessageCircle size={16} />} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Your Posh gate pass for ${unit!.estate}: code ${code} (valid today). Show it at the gate.`)}`)}>Share on WhatsApp</Btn>
        </Card>
      )}
    </Screen>
  </>)
}

export default function Tenant() {
  return (
    <Routes>
      <Route path="home" element={<Home />} />
      <Route path="pay" element={<PayTab />} />
      <Route path="pay/go" element={<PayFlow />} />
      <Route path="receipt/:id" element={<ReceiptView />} />
      <Route path="repairs" element={<RepairsTab />} />
      <Route path="repairs/new" element={<NewRepair />} />
      <Route path="repairs/:id" element={<RepairDetail />} />
      <Route path="lease" element={<Lease />} />
      <Route path="visitor" element={<Visitor />} />
      <Route path="*" element={<Navigate to="/app/home" replace />} />
    </Routes>
  )
}
