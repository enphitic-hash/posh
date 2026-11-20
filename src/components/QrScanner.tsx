import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { CameraOff, ImageUp } from 'lucide-react'
import { Btn } from './ui'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Camera QR scanner for phones without NFC (and laptops with a webcam).
 * Uses the built-in BarcodeDetector where the browser has it (Chrome, Android), otherwise jsQR on video frames
 * (works on iPhone Safari and in the Android app). Also reads a QR from a photo as a last resort.
 */
export function QrScanner({ onResult, hint }: { onResult: (text: string) => void; hint?: string }) {
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const [err, setErr] = useState('')
  const done = useRef(false)
  const cb = useRef(onResult)
  cb.current = onResult

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    let stop = false
    const detector = 'BarcodeDetector' in window ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null
    const found = (t: string) => { if (done.current) return; done.current = true; navigator.vibrate?.(60); cb.current(t) }
    const tick = async () => {
      if (stop || done.current) return
      const v = video.current
      if (v && v.readyState >= 2 && v.videoWidth) {
        try {
          if (detector) {
            const codes = await detector.detect(v)
            if (codes[0]?.rawValue) return found(codes[0].rawValue)
          } else {
            const c = (canvas.current ??= document.createElement('canvas'))
            const s = Math.min(1, 640 / v.videoWidth)
            c.width = v.videoWidth * s; c.height = v.videoHeight * s
            const ctx = c.getContext('2d', { willReadFrequently: true })!
            ctx.drawImage(v, 0, 0, c.width, c.height)
            const img = ctx.getImageData(0, 0, c.width, c.height)
            const r = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
            if (r?.data) return found(r.data)
          }
        } catch { /* keep trying */ }
      }
      raf = requestAnimationFrame(() => { setTimeout(tick, 120) })
    }
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser cannot open the camera here. Use the phone camera app to scan the QR, or upload a photo below.')
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (stop) return stream.getTracks().forEach((t) => t.stop())
        const v = video.current!
        v.srcObject = stream
        v.setAttribute('playsinline', 'true')
        await v.play()
        tick()
      } catch (e) {
        const m = (e as Error).message
        setErr(/Permission|denied|NotAllowed/i.test(m + (e as Error).name) ? 'Camera permission was refused. Allow the camera for this site, or upload a photo of the QR below.' : m)
      }
    })()
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()) }
  }, [])

  const fromPhoto = async (f: File) => {
    const url = URL.createObjectURL(f)
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const c = document.createElement('canvas'); const s = Math.min(1, 1200 / Math.max(img.width, img.height))
    c.width = img.width * s; c.height = img.height * s
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0, c.width, c.height)
    URL.revokeObjectURL(url)
    const r = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)
    if (r?.data) { done.current = true; onResult(r.data) } else setErr('No QR code found in that photo. Try again closer, with the whole code in view.')
  }

  return (
    <div className="w-full">
      <div className="relative w-full aspect-square max-w-xs mx-auto rounded-3xl overflow-hidden bg-black">
        {!err && <video ref={video} muted playsInline className="absolute inset-0 w-full h-full object-cover" />}
        {err ? <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/80 text-sm"><div><CameraOff className="mx-auto mb-2" />{err}</div></div> : (
          <div className="absolute inset-[14%] rounded-2xl border-[3px] border-white/90 shadow-[0_0_0_999px_rgba(0,0,0,.35)]">
            <div className="absolute left-2 right-2 h-0.5 bg-[#E3B93A] qr-line" />
          </div>
        )}
      </div>
      <p className="text-sm text-muted text-center mt-3">{hint ?? 'Point the camera at the QR code on the Posh card or plaque.'}</p>
      <label className="mt-2 flex justify-center"><span className="inline-flex"><Btn variant="ghost" size="sm" icon={<ImageUp size={14} />} onClick={(e) => ((e.currentTarget.nextElementSibling as HTMLInputElement).click())}>Use a photo instead</Btn><input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && fromPhoto(e.target.files[0])} /></span></label>
    </div>
  )
}
