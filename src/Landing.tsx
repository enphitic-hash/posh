import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { Smartphone, LayoutDashboard, ShieldCheck, Nfc, ArrowRight, Wifi, WifiOff } from 'lucide-react'
import { ThemedLogo, Seal, AppIcon, Card, Btn, inputCls } from './components/ui'
import { useStore } from './data/store'
import { CONFIG } from './config'
import { ThemeQuick } from './components/Settings'

export default function Landing() {
  const nav = useNavigate()
  const status = useStore((s) => s.status)
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('PP-KLA-0412')
  useEffect(() => {
    const url = location.href.split('#')[0] + '#/app'
    QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#136734', light: '#FFFFFF' } }).then(setQr)
  }, [])
  return (
    <div className="min-h-dvh">
      <header className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <ThemedLogo className="w-40" />
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted">{status === 'live' ? <><Wifi size={14} className="text-brand" />Live data</> : <><WifiOff size={14} />This device only</>}</span>
          <ThemeQuick />
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-10 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-center">
        <div>
          <div className="text-xs font-bold tracking-[.25em] text-gold">BUILT FOR POSH PROPERTIES · BUKOTO, KAMPALA</div>
          <h1 className="mt-3 font-serif text-4xl sm:text-6xl leading-[1.05]">One system for every Posh business. <span className="text-brand">One tap</span> to trust any Posh property.</h1>
          <p className="mt-5 text-muted text-lg max-w-xl">Sales, construction, property management, valuation and mortgages share one record per property: its <b className="text-ink">Posh Passport</b>. Tenants pay rent with a Posh card tap, buyers verify a home with its NFC plaque, and the office sees everything live.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Btn size="lg" onClick={() => nav('/app')} icon={<Smartphone size={20} />}>Open the Posh app</Btn>
            <Btn size="lg" variant="outline" onClick={() => nav('/office')} icon={<LayoutDashboard size={20} />}>Open Posh Office</Btn>
          </div>
        </div>
        <div className="relative flex justify-center">
          <div className="absolute inset-0 m-auto w-72 h-72 rounded-full bg-brand/15 blur-3xl" />
          <Seal className="relative w-64 sm:w-80 dark:hidden" />
          <Seal className="relative w-64 sm:w-80 hidden dark:inline-block" dark />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 grid md:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3"><AppIcon className="w-12" /><div><div className="font-bold">Posh app</div><div className="text-sm text-muted">Tenants, buyers, landlords, clients, staff</div></div></div>
          <p className="text-sm text-muted">Scan to open on your phone, then use <b>Add to Home Screen</b> to install it.</p>
          {qr && <img src={qr} alt="QR code to open the Posh app" className="w-36 h-36 rounded-xl self-center" />}
          <Link to="/app" className="mt-auto inline-flex items-center gap-1 font-semibold text-brand">Open here <ArrowRight size={16} /></Link>
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand grid place-items-center"><LayoutDashboard /></div><div><div className="font-bold">Posh Office</div><div className="text-sm text-muted">One admin screen for every business</div></div></div>
          <ul className="text-sm text-muted space-y-1 list-disc pl-5">
            <li>Rent, payments and the late-payer AI</li><li>Repairs board and plumbers</li><li>NFC cards, gates and plaques</li><li>Passports, sites, sales, valuations, mortgages</li>
          </ul>
          <Link to="/office" className="mt-auto inline-flex items-center gap-1 font-semibold text-brand">Open Posh Office <ArrowRight size={16} /></Link>
        </Card>
        <Card className="p-5 flex flex-col gap-3">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-gold-soft text-gold grid place-items-center"><ShieldCheck /></div><div><div className="font-bold">Verify a property</div><div className="text-sm text-muted">Tap the plaque or type its number</div></div></div>
          <p className="text-sm text-muted flex gap-2"><Nfc size={18} className="shrink-0 text-brand" />Hold your phone to the Posh plaque. On iPhone, tap the top of the phone to the plaque.</p>
          <form onSubmit={(e) => { e.preventDefault(); nav(`/p/${code.trim().toUpperCase()}`) }} className="flex gap-2 mt-auto">
            <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} aria-label="Passport number" />
            <Btn type="submit">Check</Btn>
          </form>
        </Card>
      </section>

      <footer className="border-t border-line py-6 text-center text-sm text-muted px-4">
        {CONFIG.company.name} · {CONFIG.company.address} · {CONFIG.company.phone}
        <div className="mt-1 text-xs">Posh Passport demo with sample data · built by Victor Bee Technologies, Mbarara</div>
      </footer>
    </div>
  )
}
