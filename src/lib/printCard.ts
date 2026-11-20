import QRCode from 'qrcode'
import type { Card, DB } from '../data/types'
import { cardUrl, verifyUrl } from './logic'
import { logoHorizontal } from '../brand/marks'
import { CONFIG } from '../config'

/** The link printed as a QR code: same page as the NFC tap, marked so Posh Office knows it was scanned. */
export const qrLinkFor = (c: Card) => (c.type === 'Plaque' && c.propertyId ? verifyUrl(c.propertyId) : cardUrl(c.id)) + '?via=qr'
export const qrDataUrl = (text: string, width = 360) => QRCode.toDataURL(text, { margin: 1, width, errorCorrectionLevel: 'M', color: { dark: '#062E17', light: '#FFFFFF' } })

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const nfcIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/><path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/><path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.8"/><path d="M16.37 2a20.16 20.16 0 0 1 0 20"/></svg>'

/** Print Posh cards (CR80, front and back) and property plaques, each with an NFC note and a QR code. */
export async function printCards(db: DB, cards: Card[]) {
  const parts: string[] = []
  for (const c of cards) {
    const qr = await qrDataUrl(qrLinkFor(c))
    if (c.type === 'Plaque') {
      const p = c.propertyId ? db.properties[c.propertyId] : undefined
      parts.push(`<section class="plaque"><div class="pl-top">${logoHorizontal(true, 'PROPERTIES LTD')}</div>
        <div class="pl-title">POSH PASSPORT</div><div class="pl-code">${esc(c.propertyId ?? c.id)}</div>
        <img class="pl-qr" src="${qr}" alt=""><div class="pl-how">${nfcIcon} Tap your phone here, or scan the QR code</div>
        <div class="pl-sub">Check this property is genuine: owner, title and history${p ? ` · ${esc(p.title)}, ${esc(p.area)}` : ''}</div>
        <div class="pl-foot">${esc(CONFIG.company.phone)} · ${esc(CONFIG.company.web)}</div></section>`)
      continue
    }
    const t = c.holderId ? db.tenants[c.holderId] : undefined
    const u = t ? db.units[t.unitId] : undefined
    parts.push(`<section class="pair">
      <div class="card front"><div class="f-logo">${logoHorizontal(true, 'PROPERTIES LTD')}</div><div class="chip"></div><div class="f-nfc">${nfcIcon}</div>
        <div class="f-name">${esc(c.holder)}</div><div class="f-meta">${esc(u ? `${u.estate.replace('Posh ', '')} · ${u.name}` : c.type + ' card')}</div><div class="f-no">${esc(c.id)}</div></div>
      <div class="card back"><img class="b-qr" src="${qr}" alt=""><div class="b-text"><b>Tap or scan</b><span>${nfcIcon} Hold to an NFC phone, or scan this QR with any phone camera to open your Posh card and pay rent.</span><span class="b-no">${esc(c.id)}</span><span class="b-small">If found, return to Posh Properties · ${esc(CONFIG.company.phone)}</span></div></div>
    </section>`)
  }
  const css = `
    @page { size: A4; margin: 10mm }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact }
    body { font-family: Inter, Arial, sans-serif; margin: 0; color: #231F20 }
    .pair { display: flex; gap: 8mm; margin-bottom: 8mm; break-inside: avoid }
    .card { width: 85.6mm; height: 54mm; border-radius: 3.2mm; position: relative; overflow: hidden; border: 0.2mm solid #ccc }
    .front { background: linear-gradient(140deg, #1A8043, #062E17); color: #fff; padding: 4mm 5mm }
    .f-logo svg { width: 36mm; height: auto } .chip { position: absolute; left: 5mm; top: 19mm; width: 10mm; height: 7.5mm; border-radius: 1.5mm; background: linear-gradient(135deg, #E3B93A, #A8851C) }
    .f-nfc { position: absolute; left: 17mm; top: 19.5mm; color: #fff; opacity: .85 } .f-nfc svg { width: 6mm; height: 6mm }
    .f-name { position: absolute; left: 5mm; bottom: 12mm; font-weight: 800; font-size: 4mm } .f-meta { position: absolute; left: 5mm; bottom: 8mm; font-size: 2.6mm; opacity: .8 }
    .f-no { position: absolute; left: 5mm; bottom: 3.5mm; font-family: monospace; font-size: 2.8mm; letter-spacing: .3mm; color: #E3B93A }
    .back { background: #fff; display: flex; gap: 3mm; padding: 4mm; align-items: center; border-top: 2mm solid #136734 }
    .b-qr { width: 40mm; height: 40mm } .b-text { display: flex; flex-direction: column; gap: 1.5mm; font-size: 2.6mm; color: #333 } .b-text b { font-size: 4mm; color: #136734 }
    .b-text svg { width: 3mm; height: 3mm; vertical-align: -0.5mm } .b-no { font-family: monospace; font-weight: 700; color: #231F20 } .b-small { font-size: 2.1mm; color: #777 }
    .plaque { width: 120mm; height: 160mm; margin: 0 auto 10mm; border-radius: 6mm; background: linear-gradient(160deg, #1A8043, #062E17); color: #fff; padding: 8mm; text-align: center; break-inside: avoid; display: flex; flex-direction: column; align-items: center; border: 1.5mm solid #C9A227 }
    .pl-top svg { width: 70mm; height: auto } .pl-title { margin-top: 4mm; letter-spacing: 1.5mm; font-weight: 800; color: #E3B93A; font-size: 4mm } .pl-code { font-family: monospace; font-size: 8mm; font-weight: 800; margin: 1mm 0 4mm }
    .pl-qr { width: 70mm; height: 70mm; background: #fff; padding: 2mm; border-radius: 3mm } .pl-how { margin-top: 4mm; font-weight: 700; font-size: 4mm } .pl-how svg { width: 5mm; height: 5mm; vertical-align: -1mm }
    .pl-sub { margin-top: 2mm; font-size: 3mm; opacity: .85 } .pl-foot { margin-top: auto; font-size: 3mm; opacity: .7 }`
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Posh cards</title><style>${css}</style></head><body>${parts.join('')}</body></html>`
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  const w = f.contentWindow!
  w.document.open(); w.document.write(html); w.document.close()
  await new Promise((r) => setTimeout(r, 600))
  w.focus(); w.print()
  setTimeout(() => f.remove(), 60000)
}
