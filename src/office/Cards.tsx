import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Plus, Nfc, QrCode, Printer, Ban, CheckCircle2, Copy, Search, Smartphone, ShieldCheck } from 'lucide-react'
import { useStore, list } from '../data/store'
import type { Card as PCard } from '../data/types'
import { cardUrl, verifyUrl } from '../lib/logic'
import { fmtDT, fmtTime, nowIso } from '../lib/format'
import { printCards, qrLinkFor, qrDataUrl } from '../lib/printCard'
import { readOnce, writeUrl, webNfcSupported, normSerial } from '../lib/nfc'
import { Card, Stat, Badge, Btn, Sheet, Field, inputCls, toast, cx, Chips, statusTone } from '../components/ui'
import { PageHead, Table } from './Office'
import { PoshCard } from '../app/Tenant'

export default function Cards() {
  const db = useStore((s) => s.db)
  const patch = useStore((s) => s.patch)
  const last = useStore((s) => s.lastChange)
  const [sp] = useSearchParams()
  const [tab, setTab] = useState<'All' | 'Tenant' | 'Staff' | 'Plaque'>('All')
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [issue, setIssue] = useState(false)
  const [write, setWrite] = useState<PCard | null>(null)
  const [qr, setQr] = useState<PCard | null>(null)
  const cards = list(db, 'cards')
  const shown = cards.filter((c) => (tab === 'All' || c.type === tab) && (!q || c.id.toLowerCase().includes(q.toLowerCase()) || c.holder.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => (b.lastTap ?? '').localeCompare(a.lastTap ?? ''))
  const taps = list(db, 'taps').sort((a, b) => b.at.localeCompare(a.at)).slice(0, 14)
  const gateToday = list(db, 'taps').filter((t) => t.kind === 'Gate').length
  return (<>
    <PageHead title="NFC cards & gates" sub="Resident cards, staff cards and property plaques" actions={<><Btn variant="outline" icon={<Printer size={16} />} onClick={() => printCards(db, shown.slice(0, 24))}>Print cards with QR ({Math.min(24, shown.length)})</Btn><Btn icon={<Plus size={16} />} onClick={() => setIssue(true)}>Issue card</Btn></>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Stat label="Tenant cards" value={cards.filter((c) => c.type === 'Tenant').length} sub={`${cards.filter((c) => c.status === 'Grace period').length} in grace period`} />
      <Stat label="Gate taps today" value={gateToday + 3380} sub="across 38 gates" />
      <Stat label="Plaques" value={cards.filter((c) => c.type === 'Plaque').length} sub="tap to verify" tone="up" />
      <Stat label="Blocked" value={cards.filter((c) => c.status === 'Blocked').length} sub="refused at gates" tone="down" />
    </div>
    <div className="grid xl:grid-cols-3 gap-4 mt-4">
      <Card className="xl:col-span-2">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Chips options={['All', 'Tenant', 'Staff', 'Plaque'] as const} value={tab} onChange={setTab} />
          <div className="ml-auto flex items-center gap-2 h-9 rounded-lg border border-line px-2"><Search size={14} className="text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Card number or name" className="bg-transparent outline-none text-sm w-44" /></div>
        </div>
        <div className="max-h-[560px] overflow-y-auto">
          <Table head={['Card', 'Holder', 'Type', 'Chip', 'Status', 'Last tap', '']}>
            {shown.slice(0, 150).map((c) => <tr key={c.id} className={cx(last?.id === c.id && 'flash')}>
              <td className="font-mono text-xs whitespace-nowrap">{c.id}</td>
              <td className="font-semibold">{c.holder}</td>
              <td>{c.type}</td>
              <td className="font-mono text-[11px] text-muted">{c.uid ?? '—'}</td>
              <td><Badge tone={statusTone(c.status)}>{c.status}</Badge></td>
              <td className="text-muted whitespace-nowrap">{c.lastTap ? fmtDT(c.lastTap) : '—'}</td>
              <td className="whitespace-nowrap">
                <button title="Write to a card" className="p-1.5 rounded-lg hover:bg-card-2 text-brand" onClick={() => setWrite(c)}><Nfc size={16} /></button>
                <button title="QR code for phones without NFC" className="p-1.5 rounded-lg hover:bg-card-2 text-brand" onClick={() => setQr(c)}><QrCode size={16} /></button>
                {c.type !== 'Plaque' && <button title={c.status === 'Blocked' ? 'Unblock' : 'Block'} className="p-1.5 rounded-lg hover:bg-card-2" onClick={() => { patch('cards', c.id, { status: c.status === 'Blocked' ? 'Active' : 'Blocked' }); toast(c.status === 'Blocked' ? 'Card unblocked' : 'Card blocked at all gates') }}>{c.status === 'Blocked' ? <CheckCircle2 size={16} className="text-brand" /> : <Ban size={16} className="text-posh-red" />}</button>}
              </td>
            </tr>)}
          </Table>
        </div>
      </Card>
      <Card>
        <div className="p-4 pb-2 font-bold">Tap log</div>
        <div className="px-4 pb-4 space-y-1">{taps.map((t) => <div key={t.id} className={cx('flex items-center gap-2 text-sm py-1.5 rounded', last?.id === t.id && 'flash')}><span className="text-xs text-muted w-11">{fmtTime(t.at)}</span><span className="flex-1 min-w-0 truncate"><b>{t.kind}</b> · {t.who ?? t.cardId} · <span className="text-muted">{t.place}</span></span><Badge tone={statusTone(t.result)}>{t.result}</Badge></div>)}</div>
      </Card>
    </div>
    <IssueCard open={issue} onClose={() => setIssue(false)} onCreated={(c) => { setIssue(false); setWrite(c) }} />
    <Sheet open={!!qr} onClose={() => setQr(null)} title={qr ? `QR code · ${qr.id}` : ''}>{qr && <CardQr c={qr} />}</Sheet>
    <Sheet wide open={!!write} onClose={() => setWrite(null)} title="Write and register card">{write && <WriteCard c={db.cards[write.id] ?? write} />}</Sheet>
  </>)
}

export function CardQr({ c }: { c: PCard }) {
  const db = useStore((s) => s.db)
  const [img, setImg] = useState('')
  const link = qrLinkFor(c)
  useEffect(() => { qrDataUrl(link, 520).then(setImg) }, [link])
  return (
    <div className="text-center">
      {img && <img src={img} alt={`QR code for ${c.id}`} className="w-60 h-60 mx-auto rounded-2xl border border-line" />}
      <div className="font-bold mt-3">{c.holder}</div>
      <div className="text-sm text-muted">Any phone camera opens the same page as an NFC tap. Printed on the back of the card{c.type === 'Plaque' ? ' and on the plaque' : ''}.</div>
      <div className="font-mono text-xs bg-card-2 rounded-lg px-3 py-2 mt-3 break-all">{link}</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Btn icon={<Printer size={16} />} onClick={() => printCards(db, [c])}>Print {c.type === 'Plaque' ? 'plaque' : 'card'}</Btn>
        <Btn variant="outline" icon={<Copy size={16} />} onClick={() => { navigator.clipboard?.writeText(link); toast('Link copied') }}>Copy link</Btn>
      </div>
    </div>
  )
}

function IssueCard({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (c: PCard) => void }) {
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const patch = useStore((s) => s.patch)
  const [type, setType] = useState<'Tenant' | 'Plaque' | 'Staff'>('Tenant')
  const [who, setWho] = useState('')
  const [access, setAccess] = useState(['Main gate', 'Pay rent'])
  const [idChecked, setIdChecked] = useState(false)
  const tenants = list(db, 'tenants').sort((a, b) => a.name.localeCompare(b.name))
  const props = list(db, 'properties')
  const create = () => {
    let c: PCard
    if (type === 'Tenant') {
      const t = db.tenants[who]; const u = db.units[t.unitId]
      c = { id: `PC-${Math.floor(1000 + Math.random() * 8999)}-${u.name}-${Math.floor(1000 + Math.random() * 8999)}`, type, holder: t.name, holderId: t.id, unitId: u.id, access, status: 'New', issued: nowIso().slice(0, 10) }
      if (t.cardId && db.cards[t.cardId]) patch('cards', t.cardId, { status: 'Blocked' })
      patch('tenants', t.id, { cardId: c.id })
    } else if (type === 'Plaque') {
      const p = db.properties[who]
      c = { id: `PL-${p.id.slice(3)}`, type, holder: `Gate plaque · ${p.title}`, propertyId: p.id, access: ['Verify'], status: 'Genuine', issued: nowIso().slice(0, 10) }
    } else {
      const s = db.staff[who]
      c = { id: `ST-${Math.floor(1000 + Math.random() * 8999)}-${s.name.split(' ').pop()!.toUpperCase()}`, type, holder: s.name, holderId: s.id, access: ['Office', 'All sites'], status: 'Active', issued: nowIso().slice(0, 10) }
    }
    put('cards', c); toast(`Card ${c.id} created`); onCreated(c)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Issue a new card">
      <div className="space-y-3">
        <Chips options={['Tenant', 'Plaque', 'Staff'] as const} value={type} onChange={(t) => { setType(t); setWho('') }} />
        {type === 'Tenant' && <Field label="Tenant"><select className={inputCls} value={who} onChange={(e) => setWho(e.target.value)}><option value="">Choose…</option>{tenants.map((t) => <option key={t.id} value={t.id}>{t.name} · {db.units[t.unitId]?.estate.replace('Posh ', '')} {db.units[t.unitId]?.name}</option>)}</select></Field>}
        {type === 'Plaque' && <Field label="Property"><select className={inputCls} value={who} onChange={(e) => setWho(e.target.value)}><option value="">Choose…</option>{props.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.title}</option>)}</select></Field>}
        {type === 'Staff' && <Field label="Staff member"><select className={inputCls} value={who} onChange={(e) => setWho(e.target.value)}><option value="">Choose…</option>{list(db, 'staff').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
        {type === 'Tenant' && (<>
          <div className="text-sm font-semibold text-muted">Access</div>
          <div className="flex flex-wrap gap-2">{['Main gate', 'Lift', 'Gym', 'Parking', 'Pay rent'].map((a) => <button key={a} onClick={() => setAccess(access.includes(a) ? access.filter((x) => x !== a) : [...access, a])} className={cx('h-8 px-3 rounded-full border text-sm', access.includes(a) ? 'bg-brand text-white border-brand' : 'border-line')}>{a}</button>)}</div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={idChecked} onChange={(e) => setIdChecked(e.target.checked)} className="accent-[var(--brand)]" />National ID checked</label>
        </>)}
        <Btn block size="lg" disabled={!who || (type === 'Tenant' && !idChecked)} onClick={create}>Create and write card</Btn>
      </div>
    </Sheet>
  )
}

function WriteCard({ c }: { c: PCard }) {
  const patch = useStore((s) => s.patch)
  const db = useStore((s) => s.db)
  const url = c.type === 'Plaque' && c.propertyId ? verifyUrl(c.propertyId) : cardUrl(c.id)
  const [qr, setQr] = useState('')
  const [state, setState] = useState<'idle' | 'writing' | 'reading' | 'done'>('idle')
  const [manual, setManual] = useState(c.uid ?? '')
  if (!qr) QRCode.toDataURL(url, { margin: 1, width: 200, color: { dark: '#136734' } }).then(setQr)
  const register = (serial: string) => {
    const s = normSerial(serial)
    const clash = list(db, 'cards').find((x) => x.uid === s && x.id !== c.id)
    if (clash) return toast(`That chip is already registered to ${clash.id}`, 'warn')
    patch('cards', c.id, { uid: s, status: c.status === 'New' ? 'Active' : c.status })
    if (c.type === 'Plaque' && c.propertyId) patch('properties', c.propertyId, { plaqueUid: s })
    toast(`Chip ${s} registered to ${c.id}`); setState('done')
  }
  const write = async () => {
    try { setState('writing'); await writeUrl(url); toast('Link written to the card. Now hold it again to register its chip.'); setState('reading'); const r = await readOnce(); if (r.serial) register(r.serial) } catch (e) { toast((e as Error).message, 'warn'); setState('idle') }
  }
  const readOnly = async () => { try { setState('reading'); const r = await readOnce(); if (r.serial) register(r.serial) } catch (e) { toast((e as Error).message, 'warn'); setState('idle') } }
  const unit = c.unitId ? db.units[c.unitId] : undefined
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        {c.type === 'Plaque' ? <div className="rounded-2xl p-5 bg-[linear-gradient(135deg,#C9A227,#8a6d10)] text-white"><div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={18} />POSH PASSPORT PLAQUE</div><div className="font-mono text-2xl mt-6">{c.propertyId}</div><div className="text-xs mt-1 text-white/80">Tap with your phone to verify</div></div>
          : <PoshCard name={c.holder} number={c.id} unit={unit ? `${unit.estate.replace('Posh ', '')} ${unit.name}` : c.type} />}
        <div className="text-sm"><div className="text-muted text-xs">Link stored on the card</div><div className="font-mono text-xs break-all bg-card-2 rounded-lg p-2 mt-1 flex gap-2"><span className="flex-1">{url}</span><button onClick={() => { navigator.clipboard?.writeText(url); toast('Link copied') }}><Copy size={14} /></button></div></div>
        {qr && <img src={qr} alt="QR of the card link" className="w-32 h-32 rounded-lg" />}
        <div className="text-xs text-muted">Registered chip: <span className="font-mono">{db.cards[c.id]?.uid ?? 'none yet'}</span></div>
      </div>
      <div className="space-y-3">
        <Card className="p-4">
          <div className="font-bold flex items-center gap-2"><Nfc size={18} />Android (Chrome) · this screen</div>
          {webNfcSupported() ? (<>
            <p className="text-sm text-muted mt-1">Place the blank NTAG213 card on the back of this phone or tablet.</p>
            <div className="flex flex-wrap gap-2 mt-3"><Btn disabled={state === 'writing' || state === 'reading'} onClick={write}>{state === 'writing' ? 'Writing… hold the card' : state === 'reading' ? 'Hold again to register…' : 'Write card'}</Btn><Btn variant="outline" onClick={readOnly}>Only register chip</Btn></div>
            {state === 'done' && <div className="text-sm text-brand mt-2 flex items-center gap-1"><CheckCircle2 size={16} />Card is ready</div>}
          </>) : <p className="text-sm text-muted mt-1">Open Posh Office in Chrome on an Android phone to write cards straight from here.</p>}
        </Card>
        <Card className="p-4">
          <div className="font-bold flex items-center gap-2"><Smartphone size={18} />iPhone · NFC Tools app</div>
          <ol className="text-sm text-muted mt-1 list-decimal pl-5 space-y-1"><li>Copy the link on the left.</li><li>In NFC Tools: <b>Write</b> → <b>Add a record</b> → <b>URL</b>, paste, then <b>Write</b> and hold the card.</li><li>In NFC Tools <b>Read</b> the card and copy its <b>Serial number</b> into the box below.</li></ol>
          <div className="flex gap-2 mt-3"><input className={inputCls} placeholder="04:73:D4:CA:04:19:90" value={manual} onChange={(e) => setManual(e.target.value)} /><Btn onClick={() => manual.replace(/[^0-9a-f]/gi, '').length >= 8 ? register(manual) : toast('Paste the 7-byte serial number', 'warn')}>Register</Btn></div>
        </Card>
      </div>
    </div>
  )
}
