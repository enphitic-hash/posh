import { StrictMode, lazy, Suspense, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './index.css'
import { applyPrefs } from './data/prefs'
import { startSync, useStore } from './data/store'
import { Loader, Toaster } from './components/ui'
import Landing from './Landing'

const MobileApp = lazy(() => import('./app/MobileApp'))
const Office = lazy(() => import('./office/Office'))
const Verify = lazy(() => import('./verify/Verify'))
const CardPage = lazy(() => import('./verify/CardPage'))
const ReceiptCheck = lazy(() => import('./verify/ReceiptCheck'))

applyPrefs()
startSync()

const isNative = () => !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

function DeepLinks() {
  const nav = useNavigate()
  useEffect(() => {
    // Android APK: an NFC tap or link opens the app with the card / passport URL.
    let off: (() => void) | undefined
    if (isNative()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appUrlOpen', ({ url }) => {
          const m = url.match(/#(\/(?:c|p)\/[^?#]+)/)
          if (m) nav(m[1])
        }).then((h) => (off = () => h.remove()))
        import('./lib/nfc').then(({ PoshNfc, parseTarget }) => PoshNfc.addListener('tag', (t) => {
          if (t.scanning) return // a screen is reading the card itself
          const x = parseTarget(t.url)
          if (x) nav(`/${x.type === 'card' ? 'c' : 'p'}/${x.id}${t.serial ? `?uid=${encodeURIComponent(t.serial)}` : ''}`)
        }))
        App.addListener('backButton', ({ canGoBack }) => { if (canGoBack) history.back(); else App.exitApp() })
      }).catch(() => {})
    }
    return () => off?.()
  }, [nav])
  return null
}

function Root() {
  const ready = useStore((s) => s.ready)
  useEffect(() => {
    if (ready) {
      const s = document.getElementById('boot')
      if (s) { s.classList.add('boot-out'); setTimeout(() => s.remove(), 400) }
    }
  }, [ready])
  if (!ready) return null
  return (
    <HashRouter>
      <DeepLinks />
      <Suspense fallback={<Loader full />}>
        <Routes>
          <Route path="/" element={isNative() ? <Navigate to="/app" replace /> : <Landing />} />
          <Route path="/app/*" element={<MobileApp />} />
          <Route path="/office/*" element={<Office />} />
          <Route path="/p/:code" element={<Verify />} />
          <Route path="/c/:cardId" element={<CardPage />} />
          <Route path="/r/:no" element={<ReceiptCheck />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster />
    </HashRouter>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>)
