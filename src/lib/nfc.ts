// NFC helpers.
// - Android Chrome (and the installed web app) use Web NFC: read the chip serial + the URL record, and write cards.
// - iPhone cannot read/write NFC from a web page, but it opens the URL stored on the card natively
//   (tap the card on the top of the iPhone → notification → opens Safari on #/c/<card> or #/p/<passport>).
// - The Android APK registers an NDEF intent filter for the same URLs, so a tap opens the app on the right page.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { registerPlugin, Capacitor } from '@capacitor/core'

interface PoshNfcPlugin {
  isAvailable(): Promise<{ available: boolean; enabled: boolean }>
  startScan(): Promise<void>
  stopScan(): Promise<void>
  write(o: { url: string }): Promise<{ serial: string }>
  addListener(ev: 'tag', cb: (t: { serial?: string; url?: string; scanning?: boolean }) => void): Promise<{ remove: () => Promise<void> }>
}
export const PoshNfc = registerPlugin<PoshNfcPlugin>('PoshNfc')
export const isNativeApp = () => Capacitor.isNativePlatform()
/** True when this screen can read/write NFC itself (Android Chrome or the Posh Android app). */
export const webNfcSupported = () => isNativeApp() || (typeof window !== 'undefined' && 'NDEFReader' in window)
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export interface NfcRead { serial?: string; url?: string; text?: string }

export function parseTarget(url?: string): { type: 'card' | 'passport'; id: string } | null {
  if (!url) return null
  const m = url.match(/#\/(c|p)\/([A-Za-z0-9-]+)/) || url.match(/\/(c|p)\/([A-Za-z0-9-]+)/)
  if (!m) return null
  return { type: m[1] === 'c' ? 'card' : 'passport', id: decodeURIComponent(m[2]) }
}

export function normSerial(s?: string) { return (s ?? '').toUpperCase().replace(/[^0-9A-F]/g, '').replace(/(..)(?!$)/g, '$1:') }

/** Wait for one tag. Resolves with serial + first URL/text record. */
export async function readOnce(signal?: AbortSignal): Promise<NfcRead> {
  if (isNativeApp()) {
    const st = await PoshNfc.isAvailable()
    if (!st.available) throw new Error('This phone has no NFC.')
    if (!st.enabled) throw new Error('Turn on NFC in your phone settings, then try again.')
    await PoshNfc.startScan()
    return new Promise((resolve, reject) => {
      let h: { remove: () => Promise<void> } | undefined
      const done = () => { h?.remove(); PoshNfc.stopScan() }
      signal?.addEventListener('abort', () => { done(); reject(new Error('cancelled')) })
      PoshNfc.addListener('tag', (t) => { done(); resolve({ serial: normSerial(t.serial), url: t.url }) }).then((x) => (h = x))
    })
  }
  if (!webNfcSupported()) throw new Error('This phone or browser cannot read NFC from a web page.')
  const reader = new (window as any).NDEFReader()
  const ctrl = new AbortController()
  signal?.addEventListener('abort', () => ctrl.abort())
  await reader.scan({ signal: ctrl.signal })
  return new Promise((resolve, reject) => {
    reader.onreadingerror = () => reject(new Error('Could not read that card. Hold it still on the back of the phone.'))
    reader.onreading = (e: any) => {
      const out: NfcRead = { serial: normSerial(e.serialNumber) }
      for (const r of e.message.records) {
        try {
          const dec = new TextDecoder(r.encoding || 'utf-8')
          if (r.recordType === 'url' || r.recordType === 'absolute-url') out.url = dec.decode(r.data)
          else if (r.recordType === 'text') out.text = dec.decode(r.data)
        } catch { /* ignore */ }
      }
      ctrl.abort()
      resolve(out)
    }
  })
}

export async function writeUrl(url: string, signal?: AbortSignal) {
  if (isNativeApp()) { await PoshNfc.write({ url }); return }
  if (!webNfcSupported()) throw new Error('Writing cards needs Chrome on Android. On iPhone, use the NFC Tools app (Write → Add a record → URL).')
  const writer = new (window as any).NDEFReader()
  await writer.write({ records: [{ recordType: 'url', data: url }] }, { signal, overwrite: true })
}
