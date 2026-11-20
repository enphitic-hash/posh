import { useEffect, useState } from 'react'
import { Smartphone, CreditCard, Landmark, Banknote, FileText, Wallet, CheckCircle2, Loader2, Printer, Download, MessageCircle, Send, ArrowLeft, Receipt as ReceiptIcon } from 'lucide-react'
import type { Money } from '../data/types'
import { CONFIG } from '../config'
import { ugx, num, fmtDT } from '../lib/format'
import { type PDoc, printDoc, docText } from '../lib/docs'
import { docPdf } from '../lib/pdf'
import { sendMessage, waLink } from '../lib/logic'
import { Sheet, Btn, Field, inputCls, cx, toast, Badge, Seal } from './ui'

export interface PayResult { method: Money; paid: number; ref: string; tendered?: number; change?: number; payer?: string; payerPhone?: string }

const ICON: Record<Money, typeof Smartphone> = { 'MTN MoMo': Smartphone, 'Airtel Money': Smartphone, Visa: CreditCard, Mastercard: CreditCard, 'Bank transfer': Landmark, Cash: Banknote, Cheque: FileText, 'Posh Wallet': Wallet }
const TONE: Partial<Record<Money, string>> = { 'MTN MoMo': 'bg-[#FFCC00] text-black', 'Airtel Money': 'bg-[#E40000] text-white', Visa: 'bg-[#1A1F71] text-white', Mastercard: 'bg-[#EB001B] text-white' }
export const IN_METHODS: Money[] = ['MTN MoMo', 'Airtel Money', 'Visa', 'Mastercard', 'Bank transfer', 'Cash', 'Cheque']
export const OUT_METHODS: Money[] = ['MTN MoMo', 'Airtel Money', 'Bank transfer', 'Cash', 'Cheque']

const refFor = (m: Money) => {
  const t = Date.now().toString()
  return m === 'MTN MoMo' ? `MP${t.slice(-10)}` : m === 'Airtel Money' ? `AM${t.slice(-9)}X` : m === 'Visa' || m === 'Mastercard' ? `AUTH ${t.slice(-6)}` : m === 'Bank transfer' ? `STB-${t.slice(-6)}` : m === 'Cheque' ? `CHQ-${t.slice(-6)}` : m === 'Posh Wallet' ? `PW${t.slice(-8)}` : `CASH-${t.slice(-5)}`
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Full payment flow: choose method → method screen (MoMo prompt, POS card, bank, cash with change, cheque)
 * → processing → approved → printable receipt. The caller saves the record in onPaid and returns the document.
 */
export function Checkout({ open, onClose, title, amount, party, phone, dir = 'in', allowPart = true, methods, onPaid }: {
  open: boolean; onClose: () => void; title: string; amount: number; party: string; phone?: string; dir?: 'in' | 'out'; allowPart?: boolean; methods?: Money[]
  onPaid: (r: PayResult) => PDoc
}) {
  const ms = methods ?? (dir === 'in' ? IN_METHODS : OUT_METHODS)
  const [step, setStep] = useState<'method' | 'details' | 'busy' | 'done'>('method')
  const [method, setMethod] = useState<Money>(ms[0])
  const [pay, setPay] = useState(amount)
  const [doc, setDoc] = useState<PDoc | null>(null)
  // Reset only when the sheet opens: saving a payment changes the amount due, and the receipt must stay on screen.
  useEffect(() => { if (open) { setStep('method'); setPay(amount); setDoc(null) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const finish = (r: Omit<PayResult, 'method' | 'paid'>) => { const d = onPaid({ method, paid: pay, ...r }); setDoc(d); setStep('done') }
  return (
    <Sheet open={open} onClose={step === 'busy' ? () => {} : onClose} title={step === 'done' ? (dir === 'in' ? 'Payment received' : 'Payment made') : title} wide={step === 'done' || step === 'details'}>
      {step !== 'done' && (
        <div className="rounded-2xl bg-card-2 p-3 mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="text-xs text-muted">{dir === 'in' ? 'From' : 'To'}</div><div className="font-bold truncate">{party}</div>{phone && <div className="text-xs text-muted">{phone}</div>}</div>
          <div className="text-right"><div className="text-xs text-muted">{pay < amount ? `Part of ${ugx(amount)}` : 'Amount'}</div><div className="text-xl font-extrabold">{ugx(pay)}</div></div>
        </div>
      )}
      {step === 'method' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ms.map((m) => { const I = ICON[m]; return (
              <button key={m} onClick={() => setMethod(m)} className={cx('flex items-center gap-2 p-3 rounded-xl border text-left text-sm font-semibold transition', method === m ? 'border-brand ring-2 ring-brand/20 bg-brand-soft' : 'border-line bg-card')}>
                <span className={cx('w-8 h-8 rounded-lg grid place-items-center shrink-0', TONE[m] ?? 'bg-card-2 text-ink')}><I size={16} /></span>{m}
              </button>) })}
          </div>
          {allowPart && (
            <Field label="Amount paying now (UGX)" hint={pay < amount ? `Balance after this: ${ugx(amount - pay)}` : 'Change it for a part payment'}>
              <input className={inputCls} inputMode="numeric" value={pay ? num(pay) : ''} onChange={(e) => setPay(Math.min(amount, +e.target.value.replace(/\D/g, '')))} />
            </Field>
          )}
          <Btn block size="lg" disabled={pay <= 0} onClick={() => setStep('details')}>Continue with {method}</Btn>
        </div>
      )}
      {step === 'details' && <Details method={method} dir={dir} amount={pay} party={party} phone={phone} onBack={() => setStep('method')} onBusy={() => setStep('busy')} onDone={finish} />}
      {step === 'busy' && <div className="py-10 flex flex-col items-center gap-3 text-muted"><Loader2 className="animate-spin text-brand" size={36} />Processing…</div>}
      {step === 'done' && doc && <DocView doc={doc} fresh onDone={onClose} />}
    </Sheet>
  )
}

function Details({ method, dir, amount, party, phone, onBack, onDone }: { method: Money; dir: 'in' | 'out'; amount: number; party: string; phone?: string; onBack: () => void; onBusy: () => void; onDone: (r: Omit<PayResult, 'method' | 'paid'>) => void }) {
  const back = <button onClick={onBack} className="text-sm text-muted inline-flex items-center gap-1 mb-3"><ArrowLeft size={14} />Change method</button>
  if (method === 'MTN MoMo' || method === 'Airtel Money') return <>{back}<MobileMoney method={method} dir={dir} amount={amount} phone={phone} onDone={onDone} /></>
  if (method === 'Visa' || method === 'Mastercard') return <>{back}<CardPos method={method} amount={amount} onDone={onDone} /></>
  if (method === 'Cash') return <>{back}<Cash dir={dir} amount={amount} party={party} onDone={onDone} /></>
  if (method === 'Bank transfer') return <>{back}<Bank dir={dir} amount={amount} onDone={onDone} /></>
  return <>{back}<Cheque amount={amount} onDone={onDone} /></>
}

type Stage = { text: string; state: 'wait' | 'busy' | 'ok' }
function Steps({ list }: { list: Stage[] }) {
  return <div className="space-y-2 my-3">{list.map((s, i) => <div key={i} className={cx('flex items-center gap-2 text-sm', s.state === 'wait' && 'text-muted')}>{s.state === 'ok' ? <CheckCircle2 size={18} className="text-brand" /> : s.state === 'busy' ? <Loader2 size={18} className="animate-spin text-gold" /> : <span className="w-[18px] h-[18px] rounded-full border-2 border-line" />}{s.text}</div>)}</div>
}

function MobileMoney({ method, dir, amount, phone, onDone }: { method: 'MTN MoMo' | 'Airtel Money'; dir: 'in' | 'out'; amount: number; phone?: string; onDone: (r: Omit<PayResult, 'method' | 'paid'>) => void }) {
  const mtn = method === 'MTN MoMo'
  const [num_, setNum] = useState(phone && /^\+?256/.test(phone.replace(/\s/g, '')) ? phone : '+256 7')
  const [phase, setPhase] = useState<'enter' | 'prompt' | 'ok'>('enter')
  const [pin, setPin] = useState('')
  const [stages, setStages] = useState<Stage[]>([])
  const [secs, setSecs] = useState(60)
  const [ref] = useState(() => refFor(method))
  useEffect(() => { if (phase !== 'prompt') return; const i = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000); return () => clearInterval(i) }, [phase])
  const start = async () => {
    if (num_.replace(/\D/g, '').length < 12) return toast('Enter the full phone number', 'warn')
    const s1: Stage[] = dir === 'in'
      ? [{ text: `Request sent to ${method}`, state: 'busy' }, { text: `Payment prompt on ${num_}`, state: 'wait' }, { text: 'Waiting for the customer to enter their PIN', state: 'wait' }, { text: 'Money received in the Posh merchant account', state: 'wait' }]
      : [{ text: `Posh merchant account · send ${ugx(amount)}`, state: 'busy' }, { text: 'Approver enters the Posh merchant PIN', state: 'wait' }, { text: `Money sent to ${num_}`, state: 'wait' }]
    setStages(s1); await sleep(900)
    setStages((s) => s.map((x, i) => (i === 0 ? { ...x, state: 'ok' } : i === 1 ? { ...x, state: dir === 'in' ? 'ok' : 'busy' } : i === 2 && dir === 'in' ? { ...x, state: 'busy' } : x)))
    setPhase('prompt'); setSecs(60)
  }
  const approve = async () => {
    if (pin.length < 4) return toast('Enter a 4-digit PIN', 'warn')
    setStages((s) => s.map((x) => (x.state === 'busy' ? { ...x, state: 'ok' } : x)))
    setStages((s) => { const i = s.findIndex((x) => x.state === 'wait'); return s.map((x, j) => (j === i ? { ...x, state: 'busy' } : x)) })
    await sleep(1100)
    setStages((s) => s.map((x) => ({ ...x, state: 'ok' })))
    setPhase('ok'); await sleep(700)
    onDone({ ref, payerPhone: num_ })
  }
  return (
    <div className="grid sm:grid-cols-[1fr_200px] gap-4 items-start">
      <div>
        <div className={cx('rounded-xl p-3 flex items-center gap-2 font-bold', mtn ? 'bg-[#FFCC00] text-black' : 'bg-[#E40000] text-white')}><Smartphone size={18} />{method} {dir === 'in' ? 'collection' : 'payout'}</div>
        {phase === 'enter' ? (
          <div className="space-y-3 mt-3">
            <Field label={dir === 'in' ? "Customer's phone number" : "Receiver's phone number"}><input className={inputCls} value={num_} onChange={(e) => setNum(e.target.value)} inputMode="tel" autoFocus /></Field>
            <Btn block size="lg" icon={<Send size={16} />} onClick={start}>{dir === 'in' ? 'Send payment prompt' : 'Send money'}</Btn>
            <div className="text-xs text-muted">Demo: no real money moves. {dir === 'in' ? 'The customer sees the prompt on the phone beside this screen.' : 'The approver PIN is any 4 digits.'}</div>
          </div>
        ) : <Steps list={stages} />}
        {phase === 'prompt' && <div className="text-xs text-muted">Prompt expires in {secs}s · ref {ref}</div>}
      </div>
      <div className="mx-auto w-[200px] rounded-[2rem] border-[6px] border-ink bg-[#101418] p-3 h-[340px] flex flex-col">
        <div className="text-[10px] text-white/50 text-center">{num_}</div>
        {phase === 'enter' && <div className="flex-1 grid place-items-center text-white/40 text-xs text-center">Phone waiting…</div>}
        {phase !== 'enter' && (
          <div className="mt-6 rounded-xl bg-white text-black p-3 text-[11px] leading-snug anim-rise">
            <div className="font-bold">{mtn ? 'MTN MoMo' : 'Airtel Money'}</div>
            {phase === 'ok' ? <div className="mt-1 text-[#136734] font-bold">Approved. Ref {ref}</div> : <>
              <div className="mt-1">{dir === 'in' ? <>POSH PROPERTIES LTD is requesting <b>{ugx(amount)}</b>. Enter PIN to approve.</> : <>Send <b>{ugx(amount)}</b> to {num_}. Enter merchant PIN.</>}</div>
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 5))} type="password" inputMode="numeric" className="mt-2 w-full border border-black/30 rounded px-2 h-8 text-center tracking-[.4em]" placeholder="PIN" autoFocus />
              <div className="flex gap-1 mt-2"><button className="flex-1 h-7 rounded bg-black/10">Cancel</button><button onClick={approve} className={cx('flex-1 h-7 rounded font-bold', mtn ? 'bg-[#FFCC00]' : 'bg-[#E40000] text-white')}>Send</button></div>
            </>}
          </div>
        )}
        <div className="mt-auto text-[9px] text-white/40 text-center">{phase === 'prompt' ? 'Type any 4 digits as the customer' : ''}</div>
      </div>
    </div>
  )
}

function CardPos({ method, amount, onDone }: { method: 'Visa' | 'Mastercard'; amount: number; onDone: (r: Omit<PayResult, 'method' | 'paid'>) => void }) {
  const [phase, setPhase] = useState<'present' | 'read' | 'pin' | 'auth' | 'ok'>('present')
  const [pin, setPin] = useState('')
  const [ref] = useState(() => refFor(method))
  const [last4] = useState(() => String(1000 + Math.floor(Math.random() * 8999)))
  const go = async () => { setPhase('read'); await sleep(900); setPhase('pin') }
  const ok = async () => { if (pin.length < 4) return toast('Enter a 4-digit PIN', 'warn'); setPhase('auth'); await sleep(1500); setPhase('ok'); await sleep(800); onDone({ ref: `${ref} · ${method} ••${last4}` }) }
  const screen = { present: <>{ugx(amount)}<div className="text-[11px] mt-2 opacity-80">Tap, insert or swipe card</div></>, read: <>Reading card…</>, pin: <>Enter PIN<div className="tracking-[.5em] mt-2">{'•'.repeat(pin.length) || '_ _ _ _'}</div></>, auth: <>Authorising with {method}…</>, ok: <>APPROVED<div className="text-[11px] mt-1">{ref}</div></> }[phase]
  return (
    <div className="grid sm:grid-cols-[1fr_210px] gap-4 items-start">
      <div className="space-y-3">
        <div className={cx('rounded-xl p-3 flex items-center gap-2 font-bold', TONE[method])}><CreditCard size={18} />{method} on the Posh POS</div>
        <Steps list={[
          { text: 'Card presented', state: phase === 'present' ? 'busy' : 'ok' },
          { text: 'Chip read · 3D Secure ready', state: phase === 'present' ? 'wait' : phase === 'read' ? 'busy' : 'ok' },
          { text: 'Customer PIN', state: ['present', 'read'].includes(phase) ? 'wait' : phase === 'pin' ? 'busy' : 'ok' },
          { text: 'Bank approval', state: phase === 'auth' ? 'busy' : phase === 'ok' ? 'ok' : 'wait' },
        ]} />
        {phase === 'present' && <Btn block size="lg" icon={<CreditCard size={16} />} onClick={go}>Customer taps card</Btn>}
        {phase === 'pin' && <><input className={inputCls + ' text-center tracking-[.5em]'} type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="Customer PIN (any 4)" autoFocus /><Btn block size="lg" onClick={ok}>OK</Btn></>}
        <div className="text-xs text-muted">Demo POS. Abroad? Use Bank transfer, or send the client a pay link from the invoice.</div>
      </div>
      <div className="mx-auto w-[200px] rounded-3xl bg-[#1d2327] p-3 shadow-lg">
        <div className="rounded-xl bg-[#c9e4c5] text-[#0b2a12] h-28 grid place-items-center text-center font-mono font-bold p-2">{screen}</div>
        <div className="grid grid-cols-3 gap-1.5 mt-3">{['1', '2', '3', '4', '5', '6', '7', '8', '9', '✕', '0', '✓'].map((k) => (
          <button key={k} onClick={() => { if (phase !== 'pin') return; if (k === '✕') setPin(''); else if (k === '✓') ok(); else setPin((p) => (p + k).slice(0, 6)) }} className={cx('h-8 rounded-lg text-sm font-bold', k === '✕' ? 'bg-[#E40000] text-white' : k === '✓' ? 'bg-[#1A8043] text-white' : 'bg-[#3a4247] text-white')}>{k}</button>))}</div>
        <div className="text-[9px] text-white/40 text-center mt-2">POSH POS · Stanbic merchant</div>
      </div>
    </div>
  )
}

function Cash({ dir, amount, party, onDone }: { dir: 'in' | 'out'; amount: number; party: string; onDone: (r: Omit<PayResult, 'method' | 'paid'>) => void }) {
  const [given, setGiven] = useState(amount)
  const [who, setWho] = useState(party)
  const change = Math.max(0, given - amount)
  const quick = [amount, Math.ceil(amount / 50000) * 50000, Math.ceil(amount / 100000) * 100000, Math.ceil(amount / 500000) * 500000].filter((v, i, a) => a.indexOf(v) === i)
  return (
    <div className="space-y-3">
      {dir === 'in' ? <>
        <Field label="Cash given by the customer (UGX)"><input className={inputCls + ' text-lg font-bold'} inputMode="numeric" value={given ? num(given) : ''} onChange={(e) => setGiven(+e.target.value.replace(/\D/g, ''))} autoFocus /></Field>
        <div className="flex flex-wrap gap-2">{quick.map((q) => <button key={q} onClick={() => setGiven(q)} className="h-8 px-3 rounded-full border border-line text-sm">{num(q)}</button>)}</div>
        <div className="rounded-2xl bg-brand-soft p-4 flex justify-between items-center"><span className="font-semibold">Change to give back</span><span className="text-2xl font-extrabold text-brand">{ugx(change)}</span></div>
        <Btn block size="lg" disabled={given < amount} icon={<Banknote size={16} />} onClick={() => onDone({ ref: refFor('Cash'), tendered: given, change })}>{given < amount ? `Short by ${ugx(amount - given)}` : 'Cash received · print receipt'}</Btn>
      </> : <>
        <Field label="Cash handed to (name)"><input className={inputCls} value={who} onChange={(e) => setWho(e.target.value)} /></Field>
        <div className="text-sm text-muted">Paid from petty cash. The voucher prints with a line for the receiver to sign.</div>
        <Btn block size="lg" icon={<Banknote size={16} />} onClick={() => onDone({ ref: refFor('Cash'), payer: who })}>Cash paid out · print voucher</Btn>
      </>}
    </div>
  )
}

function Bank({ dir, amount, onDone }: { dir: 'in' | 'out'; amount: number; onDone: (r: Omit<PayResult, 'method' | 'paid'>) => void }) {
  const b = CONFIG.company.bank
  const [ref, setRef] = useState('')
  const [checking, setChecking] = useState(false)
  return (
    <div className="space-y-3">
      {dir === 'in' && <div className="rounded-2xl border border-line p-4 text-sm space-y-1">{[['Bank', b.name], ['Branch', b.branch], ['Account name', b.holder], ['Account no.', b.account], ['SWIFT (from abroad)', b.swift], ['Amount', ugx(amount)]].map(([k, v]) => <div key={k} className="flex justify-between gap-3"><span className="text-muted">{k}</span><b className="text-right">{v}</b></div>)}</div>}
      <Field label={dir === 'in' ? 'Bank reference or deposit slip number' : 'Transfer reference (from Stanbic Business Online)'}><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. STB-778120" autoFocus /></Field>
      <Btn block size="lg" disabled={checking} icon={checking ? <Loader2 size={16} className="animate-spin" /> : <Landmark size={16} />} onClick={async () => { setChecking(true); await sleep(1400); onDone({ ref: ref.trim() || refFor('Bank transfer') }) }}>{checking ? (dir === 'in' ? 'Checking the Posh account…' : 'Sending transfer…') : dir === 'in' ? 'Funds seen in account · confirm' : 'Transfer sent · print voucher'}</Btn>
    </div>
  )
}

function Cheque({ amount, onDone }: { amount: number; onDone: (r: Omit<PayResult, 'method' | 'paid'>) => void }) {
  const [no, setNo] = useState('')
  const [bank, setBank] = useState('Stanbic')
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3"><Field label="Cheque number"><input className={inputCls} value={no} onChange={(e) => setNo(e.target.value)} autoFocus /></Field><Field label="Bank"><select className={inputCls} value={bank} onChange={(e) => setBank(e.target.value)}>{['Stanbic', 'Absa', 'dfcu', 'Centenary', 'Equity', 'Housing Finance', 'Standard Chartered'].map((x) => <option key={x}>{x}</option>)}</select></Field></div>
      <div className="text-sm text-muted">{ugx(amount)} · cheques clear in about 3 working days.</div>
      <Btn block size="lg" disabled={!no} onClick={() => onDone({ ref: `${bank} CHQ ${no}` })}>Record cheque</Btn>
    </div>
  )
}

/** On-screen receipt with print (80mm and A4), PDF, WhatsApp and SMS. */
export function DocView({ doc, fresh, onDone }: { doc: PDoc; fresh?: boolean; onDone?: () => void }) {
  const [busy, setBusy] = useState(false)
  const label = doc.type === 'INVOICE' ? 'invoice' : doc.type === 'RECEIPT' ? 'receipt' : 'voucher'
  return (
    <div>
      {fresh && <div className="flex items-center gap-3 mb-4 anim-rise"><div className="w-12 h-12 rounded-full bg-brand text-white grid place-items-center"><CheckCircle2 size={28} /></div><div><div className="font-extrabold text-lg">{ugx(doc.paid)} {doc.type === 'PAYMENT VOUCHER' ? 'paid out' : 'received'}</div><div className="text-sm text-muted">{doc.method} · {doc.ref}</div></div></div>}
      <div className="grid md:grid-cols-[1fr_210px] gap-4">
        <div className="relative rounded-xl bg-white text-[#111] p-5 shadow-card border border-line font-[Inter] text-[13px] overflow-hidden">
          <Seal className="absolute -right-10 -top-10 w-40 opacity-[.07]" />
          <div className="flex justify-between items-start gap-3"><img src="brand/logo-company.png" alt="Posh Properties" className="w-36" /><div className="text-right text-[11px] text-[#5F6B63]">{CONFIG.company.phone}<br />TIN {CONFIG.company.tin}</div></div>
          <div className="flex h-1 mt-3"><i className="flex-1 bg-[#ED1F24]" /><i className="flex-1 bg-[#136734]" /></div>
          <div className="mt-3 flex justify-between items-baseline"><div className="font-extrabold tracking-wider">{doc.type === 'INVOICE' ? 'TAX INVOICE' : doc.type}</div><div className="font-mono text-[#136734] font-bold">{doc.no}</div></div>
          <div className="text-[12px] mt-2 space-y-0.5">
            {([['Date', fmtDT(doc.at)], [doc.partyLabel ?? (doc.type === 'PAYMENT VOUCHER' ? 'Paid to' : 'Received from'), doc.party], ['Business', doc.business + (doc.category ? ` · ${doc.category}` : '')], ...(doc.extra ?? []), ...(doc.type !== 'INVOICE' ? [['Method', doc.method ?? ''], ['Ref', doc.ref ?? '']] : []), ...(doc.tendered ? [['Cash given', ugx(doc.tendered)], ['Change', ugx(doc.change ?? 0)]] : [])] as [string, string][]).map(([k, v]) => <div key={k} className="flex justify-between gap-3"><span className="text-[#5F6B63]">{k}</span><span className="font-semibold text-right">{v}</span></div>)}
          </div>
          <div className="border-t border-dashed border-[#999] my-3" />
          {doc.lines.map((l, i) => <div key={i} className="flex justify-between gap-3 py-0.5"><span>{l.desc}{l.qty !== 1 && <span className="text-[#5F6B63]"> · {num(l.qty)} × {num(l.price)}</span>}</span><span className="font-semibold whitespace-nowrap">{num(l.qty * l.price)}</span></div>)}
          <div className="border-t border-dashed border-[#999] my-3" />
          <div className="flex justify-between font-extrabold text-base"><span>Total</span><span>{ugx(doc.total)}</span></div>
          {(doc.type === 'INVOICE' || doc.balance > 0 || doc.paid !== doc.total) && <><div className="flex justify-between text-[12px]"><span>{doc.type === 'INVOICE' ? 'Paid so far' : 'Paid now'}</span><span>{ugx(doc.paid)}</span></div><div className="flex justify-between text-[12px] font-bold"><span>Balance</span><span>{ugx(doc.balance)}</span></div></>}
          {doc.note && <div className="text-[11px] text-[#5F6B63] mt-2">{doc.note}</div>}
          <div className="mt-3 flex items-center justify-between"><span className="inline-block border-2 border-[#136734] text-[#136734] rounded-md px-3 py-0.5 font-extrabold tracking-[.25em] -rotate-3">{doc.type === 'INVOICE' ? (doc.balance === 0 ? 'PAID' : doc.paid ? 'PART PAID' : 'UNPAID') : doc.balance > 0 ? 'PART' : 'PAID'}</span><span className="text-[11px] text-[#5F6B63]">Served by {doc.by}</span></div>
          {doc.photo && <img src={doc.photo} alt="Supplier receipt" className="mt-3 w-28 rounded border border-[#ddd]" />}
        </div>
        <div className="flex flex-col gap-2">
          <Btn icon={<Printer size={16} />} onClick={() => printDoc(doc, 'thermal')}>Print {label} (80mm)</Btn>
          <Btn variant="outline" icon={<Printer size={16} />} onClick={() => printDoc(doc, 'a4')}>Print A4</Btn>
          <Btn variant="outline" disabled={busy} icon={<Download size={16} />} onClick={async () => { setBusy(true); try { await docPdf(doc) } catch { toast('Could not make the PDF', 'warn') } setBusy(false) }}>Download PDF</Btn>
          <Btn variant="outline" icon={<MessageCircle size={16} />} onClick={() => { window.open(doc.phone ? waLink(doc.phone, docText(doc)) : `https://wa.me/?text=${encodeURIComponent(docText(doc))}`, '_blank'); sendMessage({ to: doc.party, phone: doc.phone, channel: 'WhatsApp', kind: label, text: docText(doc).split('\n').slice(0, 4).join(' · ') }) }}>WhatsApp {label}</Btn>
          {doc.phone && <Btn variant="outline" icon={<Send size={16} />} onClick={() => { sendMessage({ to: doc.party, phone: doc.phone, channel: 'SMS', kind: label, text: `Posh: ${label} ${doc.no}, ${ugx(doc.paid || doc.total)}. ${doc.balance ? `Balance ${ugx(doc.balance)}.` : 'Thank you!'}` }); toast(`SMS sent to ${doc.phone}`) }}>SMS {label}</Btn>}
          <div className="text-[11px] text-muted mt-1 flex items-center gap-1"><ReceiptIcon size={12} />QR on the printout checks it is genuine</div>
          {onDone && <Btn variant="soft" className="mt-auto" onClick={onDone}>Done</Btn>}
          {fresh && <Badge tone="green" className="self-start">Saved to the receipts register</Badge>}
        </div>
      </div>
    </div>
  )
}

export function DocSheet({ doc, onClose }: { doc: PDoc | null; onClose: () => void }) {
  return <Sheet wide open={!!doc} onClose={onClose} title={doc ? `${doc.type === 'INVOICE' ? 'Invoice' : doc.type === 'RECEIPT' ? 'Receipt' : 'Payment voucher'} ${doc.no}` : ''}>{doc && <DocView doc={doc} />}</Sheet>
}
