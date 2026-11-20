import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, ShieldAlert, FileCheck2, User, Phone, MessageCircle, Building2, HardHat, Landmark, Scale, Handshake, Ruler, ChevronLeft, Nfc, Home } from 'lucide-react'
import { useStore, list } from '../data/store'
import type { Biz } from '../data/types'
import { ugxShort, fmtDate, nowIso, uid, ago } from '../lib/format'
import { poshWa } from '../lib/logic'
import { normSerial } from '../lib/nfc'
import { Card, Btn, PhotoTile, Chips, ThemedLogo, cx, Seal } from '../components/ui'

const ICON: Record<Biz, typeof Building2> = { Sales: Handshake, Construction: HardHat, Management: Building2, Valuation: Scale, Finance: Landmark, Survey: Ruler }
const TONE: Record<Biz, string> = { Sales: 'bg-blue-soft text-sky-600', Construction: 'bg-gold-soft text-gold', Management: 'bg-brand-soft text-brand', Valuation: 'bg-card-2 text-ink', Finance: 'bg-red-soft text-posh-red', Survey: 'bg-card-2 text-muted' }

export default function Verify() {
  const { code } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const db = useStore((s) => s.db)
  const put = useStore((s) => s.put)
  const p = db.properties[(code ?? '').toUpperCase()]
  const serial = sp.get('uid') ? normSerial(sp.get('uid')!) : undefined
  const [tab, setTab] = useState<'Story' | 'Docs' | 'Money' | 'Tenancy'>('Story')
  const logged = useRef(false)
  useEffect(() => {
    if (logged.current || !code) return
    logged.current = true
    const plaque = list(db, 'cards').find((c) => c.type === 'Plaque' && c.propertyId === p?.id)
    put('taps', { id: uid('TP'), cardId: plaque?.id, uid: serial, kind: 'Plaque', place: p ? `${p.title} · ${p.area}` : `Unknown code ${code}`, at: nowIso(), result: p ? 'OK' : 'Unknown card', who: /iPhone|iPad/.test(navigator.userAgent) ? 'Visitor phone (iPhone)' : /Android/.test(navigator.userAgent) ? 'Visitor phone (Android)' : 'Web visitor' })
    if (plaque) useStore.getState().patch('cards', plaque.id, { lastTap: nowIso() })
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return (
    <div className="min-h-dvh grid place-items-center p-6 text-center">
      <div><ShieldAlert size={64} className="mx-auto text-posh-red" /><h1 className="text-2xl font-extrabold mt-3">Not a Posh plaque</h1><p className="text-muted mt-1">We have no Posh Passport with number <b>{code}</b>. If someone is selling or renting this property as "Posh", call us before paying anything.</p>
        <a href="tel:+256414662954" className="inline-block mt-4"><Btn icon={<Phone size={16} />}>Call Posh: 0414 662954</Btn></a></div>
    </div>
  )
  const chipMismatch = serial && p.plaqueUid && serial !== p.plaqueUid
  const lastTaps = list(db, 'taps').filter((t) => t.kind === 'Plaque' && t.place.startsWith(p.title)).sort((a, b) => b.at.localeCompare(a.at))
  const units = list(db, 'units').filter((u) => u.propertyId === p.id)
  const listing = list(db, 'listings').find((l) => l.propertyId === p.id)
  return (
    <div className="min-h-dvh max-w-xl mx-auto pb-10">
      <div className="pt-safe flex items-center justify-between px-4 h-16">
        <button onClick={() => (history.length > 1 ? nav(-1) : nav('/'))} className="w-10 h-10 grid place-items-center rounded-full hover:bg-card-2" aria-label="Back"><ChevronLeft /></button>
        <ThemedLogo className="w-32" />
        <Link to="/" className="w-10 h-10 grid place-items-center rounded-full hover:bg-card-2" aria-label="Home"><Home size={18} /></Link>
      </div>
      <div className="px-4">
        <div className={cx('rounded-3xl p-5 text-white relative overflow-hidden', chipMismatch ? 'bg-[linear-gradient(135deg,#B91C1C,#7F1D1D)]' : 'bg-[linear-gradient(135deg,#1A8043,#062E17)]')}>
          <Seal className="absolute -right-10 -top-10 w-44 opacity-20" dark />
          <div className="flex items-center gap-2 text-sm font-semibold">{chipMismatch ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}{chipMismatch ? 'Warning: chip does not match' : 'Genuine Posh plaque'}</div>
          <div className="text-3xl font-extrabold mt-2 font-mono tracking-wide">{p.id}</div>
          <div className="text-white/85 mt-1">{p.title} · {p.area}</div>
          {serial && <div className="text-xs mt-2 text-white/80 flex items-center gap-1"><Nfc size={14} />Chip {serial} {chipMismatch ? '≠ registered chip' : p.plaqueUid ? '✓ matches our record' : '(no chip registered yet)'}</div>}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Card className="p-3"><div className="text-xs text-muted">Title</div><div className="font-bold flex items-center gap-1">{p.titleStatus === 'Clean' ? <FileCheck2 size={16} className="text-brand" /> : <ShieldAlert size={16} className="text-posh-red" />}{p.titleStatus === 'Clean' ? 'Clean' : p.titleStatus}</div><div className="text-[11px] text-muted">{p.titleStatus === 'Clean' ? 'no caveats, no mortgage' : p.titleStatus === 'Caveat' ? 'caveat lodged, ask Posh' : 'search in progress'}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted">Latest value</div><div className="font-bold">{ugxShort(p.value)}</div><div className="text-[11px] text-brand">{p.valueChange ? `+${p.valueChange}% since build` : 'Posh Valuers'}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted">Stage</div><div className="font-bold">{p.stage}</div><div className="text-[11px] text-muted">{p.tenancy ?? p.kind}</div></Card>
          <Card className="p-3"><div className="text-xs text-muted">Posh agent</div><div className="font-bold flex items-center gap-1"><User size={14} />{p.agent}</div><div className="text-[11px] text-muted">managed by Posh</div></Card>
        </div>
        <PhotoTile hue={p.hue} className="h-40 rounded-2xl mt-3"><div className="absolute bottom-3 left-3 text-white text-sm font-semibold">{p.photos} verified photos · issued {fmtDate(p.issued)}</div></PhotoTile>
        <div className="flex gap-4 text-sm mt-3">{p.beds && <span><b>{p.beds}</b> beds</span>}{p.baths && <span><b>{p.baths}</b> baths</span>}<span><b>{p.size}</b></span>{p.built && <span>built <b>{p.built}</b></span>}</div>
        <Chips className="mt-4" options={['Story', 'Docs', 'Money', 'Tenancy'] as const} value={tab} onChange={setTab} />
        {tab === 'Story' && (
          <div className="mt-4 relative pl-6">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-line" />
            {p.timeline.slice().reverse().map((t, i) => { const I = ICON[t.biz]; return (
              <div key={i} className="relative mb-4">
                <span className={cx('absolute -left-6 top-0 w-6 h-6 rounded-full grid place-items-center', TONE[t.biz])}><I size={13} /></span>
                <div className="ml-3"><div className="text-xs text-muted">{fmtDate(t.date)} · Posh {t.biz === 'Survey' ? 'Surveyors' : t.biz === 'Sales' ? 'Agency' : t.biz}</div><div className="font-semibold">{t.title}</div><div className="text-sm text-muted">{t.detail}</div></div>
              </div>) })}
            {p.timeline.length === 0 && <div className="text-sm text-muted">Records will appear here as Posh works on this property.</div>}
          </div>
        )}
        {tab === 'Docs' && (
          <Card className="mt-4">{[['Certificate of title', p.titleNo], ['Land registry search', p.titleStatus === 'Clean' ? 'Clean · 12 Nov 2026' : p.titleStatus], ['Approved building plans', 'KCCA / municipal'], ['Valuation report', `Posh Valuers · ${ugxShort(p.value)}`], ['Occupation permit', p.built ? `Issued ${p.built}` : 'After handover']].map(([a, b], i) => <div key={a} className={cx('p-3 flex justify-between gap-3 text-sm', i && 'border-t border-line')}><span className="font-semibold">{a}</span><span className="text-muted text-right">{b}</span></div>)}<div className="p-3 text-xs text-muted border-t border-line">Full documents are shared with the owner, buyers' lawyers and banks on request.</div></Card>
        )}
        {tab === 'Money' && (
          <Card className="mt-4 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted">Latest valuation</span><b>{ugxShort(p.value)}</b></div>
            <div className="flex justify-between"><span className="text-muted">Change since build</span><b className="text-brand">+{p.valueChange}%</b></div>
            {listing && <div className="flex justify-between"><span className="text-muted">Listed</span><b>{listing.kind} · {ugxShort(listing.price)}{listing.per ? `/${listing.per}` : ''}</b></div>}
            <div className="flex justify-between"><span className="text-muted">Mortgage on title</span><b>{p.stage === 'Finance' ? 'Application in progress' : 'None'}</b></div>
          </Card>
        )}
        {tab === 'Tenancy' && (
          <Card className="mt-4 p-4 text-sm">
            {p.tenancy ? <div className="font-semibold">{p.tenancy}</div> : <div className="text-muted">Not let through Posh.</div>}
            {units.length > 0 && <div className="text-muted mt-1">{units.filter((u) => u.tenantId).length} of {units.length} units let · rent paid by Posh card and MoMo</div>}
            <div className="text-xs text-muted mt-2">Tenant names are private and never shown here.</div>
          </Card>
        )}
        <Card className="mt-4 p-3 text-xs text-muted">Plaque tapped {lastTaps.length} time{lastTaps.length === 1 ? '' : 's'} recently{lastTaps[1] ? ` · before this ${ago(lastTaps[1].at)}` : ''}.</Card>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Btn variant="outline" icon={<Phone size={16} />} onClick={() => (location.href = 'tel:+256414662954')}>Call Posh</Btn>
          <Btn className="!bg-[#25D366]" icon={<MessageCircle size={16} />} onClick={() => window.open(poshWa(`Hello Posh, I tapped the plaque on ${p.id} (${p.title}, ${p.area}). I'd like to know more.`), '_blank')}>WhatsApp</Btn>
        </div>
        {listing && <Btn block size="lg" className="mt-2" onClick={() => nav(`/app/listing/${listing.id}`)}>See the listing</Btn>}
      </div>
    </div>
  )
}
