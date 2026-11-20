// Renders every branded asset from src/brand/marks.ts:
// favicons, PWA icons, Apple touch icon, OG image, PDF logo, splash screens,
// Android launcher icons (all densities, adaptive + round) and Android splash.
// Run: node scripts/brand.mjs
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import { chromium } from './pw.mjs'
import { fontCss } from './fonts.mjs'
import * as M from '../src/brand/marks.ts'

const root = new URL('..', import.meta.url).pathname
const out = (p) => { const f = root + p; mkdirSync(dirname(f), { recursive: true }); return f }

const browser = await chromium.launch()
const page = await browser.newPage()
async function shot(html, w, h, file, transparent = false) {
  await page.setViewportSize({ width: w, height: h })
  await page.setContent(`<html><head><style>${fontCss} html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden;background:${transparent ? 'transparent' : '#fff'}} svg{display:block}</style></head><body>${html}</body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: out(file), omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } })
}
const sized = (svg, w, h) => svg.replace('<svg ', `<svg width="${w}" height="${h}" `)

// ---- Icons: the "Passport" tile ----
const icon = (s, o = {}) => M.iconPassport(s, o)
for (const s of [16, 32, 48, 64]) await shot(icon(s, { bleed: false }), s, s, `scripts/.tmp/fav-${s}.png`, true)
await shot(icon(180, { bleed: true }), 180, 180, 'public/icons/apple-touch-icon.png')
await shot(icon(192), 192, 192, 'public/icons/icon-192.png', true)
await shot(icon(512), 512, 512, 'public/icons/icon-512.png', true)
await shot(icon(512, { bleed: true }), 512, 512, 'public/icons/maskable-512.png')
await shot(icon(1024, { bleed: true }), 1024, 1024, 'public/icons/icon-1024.png')

// favicon.svg (simple towers on green tile, scales well) and favicon.ico (PNG-in-ICO)
const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#136734"/><g transform="translate(6 2) scale(0.88)">${M.towers({ red: '#FF5A5F', green: '#FFFFFF', sw: 6 })}</g></svg>`
writeFileSync(out('public/favicon.svg'), favSvg)
for (const s of [16, 32, 48]) await shot(sized(favSvg, s, s), s, s, `scripts/.tmp/ico-${s}.png`, true)
{
  const { readFileSync } = await import('node:fs')
  const imgs = [16, 32, 48].map((s) => ({ s, b: readFileSync(root + `scripts/.tmp/ico-${s}.png`) }))
  const head = Buffer.alloc(6); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4)
  let off = 6 + 16 * imgs.length
  const dir = imgs.map(({ s, b }) => { const d = Buffer.alloc(16); d.writeUInt8(s, 0); d.writeUInt8(s, 1); d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6); d.writeUInt32LE(b.length, 8); d.writeUInt32LE(off, 12); off += b.length; return d })
  writeFileSync(out('public/favicon.ico'), Buffer.concat([head, ...dir, ...imgs.map((i) => i.b)]))
}

// ---- Logos ----
await shot(sized(M.logoHorizontal(false), 1080, 240), 1080, 240, 'public/brand/logo-horizontal.png', true)
await shot(sized(M.logoHorizontal(true), 1080, 240), 1080, 240, 'public/brand/logo-horizontal-dark.png', true)
await shot(sized(M.logoHorizontal(false, 'PROPERTIES LTD'), 1080, 240), 1080, 240, 'public/brand/logo-company.png', true)
await shot(sized(M.logoHeritage(false), 600, 660), 600, 660, 'public/brand/logo-heritage.png', true)
await shot(sized(M.sealSvg(800), 800, 800), 800, 800, 'public/brand/seal.png', true)
writeFileSync(out('public/brand/logo-horizontal.svg'), M.logoHorizontal(false))
writeFileSync(out('public/brand/seal.svg'), M.sealSvg(512))
writeFileSync(out('public/brand/icon.svg'), M.iconPassport(1024))

// ---- OG / social share image ----
await shot(`<div style="width:1200px;height:630px;display:flex;align-items:center;gap:60px;padding:0 80px;box-sizing:border-box;background:linear-gradient(135deg,#1A8043,#062E17);color:#fff;font-family:Inter">
  <div style="width:300px;flex:none">${sized(M.sealSvg(300, true), 300, 300)}</div>
  <div><div style="font:700 18px Inter;letter-spacing:6px;color:#E3B93A">POSH PASSPORT</div>
  <div style="font:64px/1.05 'DM Serif Display';margin-top:14px">One system for every Posh business.</div>
  <div style="font:500 26px Inter;margin-top:18px;color:rgba(255,255,255,.8)">Tap the plaque. Pay with your Posh card. See it live.</div>
  <div style="font:600 18px Inter;margin-top:28px;color:rgba(255,255,255,.65)">Posh Properties Ltd · Bukoto, Kampala</div></div></div>`, 1200, 630, 'public/brand/og-image.png')

// ---- Splash (web + Android) ----
const splash = (w, h) => `<div style="width:${w}px;height:${h}px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,#1A8043,#062E17);color:#fff">
  <div style="width:${Math.round(Math.min(w, h) * 0.32)}px">${sized(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90">${M.towers({ red: '#FF5A5F', green: '#FFFFFF', sw: 3.6 })}</svg>`, Math.round(Math.min(w, h) * 0.32), Math.round(Math.min(w, h) * 0.288))}</div>
  <div style="font:${Math.round(Math.min(w, h) * 0.1)}px 'DM Serif Display';letter-spacing:6px;margin-top:${Math.round(Math.min(w, h) * 0.03)}px">POSH</div>
  <div style="font:700 ${Math.round(Math.min(w, h) * 0.026)}px Inter;letter-spacing:${Math.round(Math.min(w, h) * 0.012)}px;color:#E3B93A">PASSPORT</div></div>`
await shot(splash(2732, 2732), 2732, 2732, 'resources/splash.png')
await shot(splash(1290, 2796), 1290, 2796, 'public/brand/splash-portrait.png')

// ---- Android launcher icons ----
const dens = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const fgSvg = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${s}" height="${s}"><g transform="translate(22 20) scale(0.64)">${M.towers({ red: '#FF4A4F', green: '#FFFFFF', sw: 3.6 })}</g><text x="54" y="86" text-anchor="middle" font-family="'DM Serif Display'" font-size="15" fill="#fff" letter-spacing="1">POSH</text></svg>`
const bgSvg = (s) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${s}" height="${s}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1A8043"/><stop offset="1" stop-color="#062E17"/></linearGradient></defs><rect width="108" height="108" fill="url(#g)"/></svg>`
for (const [d, k] of Object.entries(dens)) {
  const s = Math.round(48 * k), a = Math.round(108 * k)
  await shot(icon(s, { bleed: false }), s, s, `resources/android/mipmap-${d}/ic_launcher.png`, true)
  await shot(icon(s, { round: true }), s, s, `resources/android/mipmap-${d}/ic_launcher_round.png`, true)
  await shot(fgSvg(a), a, a, `resources/android/mipmap-${d}/ic_launcher_foreground.png`, true)
  await shot(bgSvg(a), a, a, `resources/android/mipmap-${d}/ic_launcher_background.png`)
}
const spl = { mdpi: [320, 480], hdpi: [480, 800], xhdpi: [720, 1280], xxhdpi: [960, 1600], xxxhdpi: [1280, 1920] }
for (const [d, [w, h]] of Object.entries(spl)) {
  await shot(splash(w, h), w, h, `resources/android/drawable-port-${d}/splash.png`)
  await shot(splash(h, w), h, w, `resources/android/drawable-land-${d}/splash.png`)
}
await shot(splash(480, 800), 480, 800, 'resources/android/drawable/splash.png')
// Android 12+ splash icon (centre of a circle)
await shot(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 288" width="288" height="288"><g transform="translate(64 60) scale(1.6)">${M.towers({ red: '#FF4A4F', green: '#FFFFFF', sw: 3.6 })}</g></svg>`, 288, 288, 'resources/android/drawable/splash_icon.png', true)

// ---- Brand sheet (for Victor to review) ----
await page.setViewportSize({ width: 1400, height: 1000 })
await page.setContent(`<html><head><style>${fontCss} body{margin:0;font-family:Inter;background:#F4F6F3;padding:40px} h1{font:44px 'DM Serif Display';margin:0 0 4px} .g{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:24px} .c{background:#fff;border-radius:20px;padding:22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:240px} .d{background:#062E17;color:#fff} .l{font-size:13px;font-weight:700;color:#5F6B63;align-self:flex-start} .d .l{color:#9AAEA1} .sw{display:flex;gap:10px} .sw div{width:64px;height:64px;border-radius:14px;display:flex;align-items:flex-end;padding:6px;box-sizing:border-box;font-size:10px;font-weight:700;color:#fff}</style></head><body>
<h1>Posh Passport · brand kit</h1><div style="color:#5F6B63">Drawn from the Posh Properties Ltd towers logo · red #ED1F24 · green #136734 · ink #231F20</div>
<div class="g">
<div class="c"><div class="l">A · Heritage (Posh Properties)</div><div style="width:200px">${M.logoHeritage()}</div></div>
<div class="c"><div class="l">B · App launcher icon</div>${M.iconPassport(170)}</div>
<div class="c"><div class="l">C · Verified seal (plaques, verify page)</div>${M.sealSvg(190)}</div>
<div class="c d"><div class="l">Seal on dark</div>${M.sealSvg(190, true)}</div>
<div class="c"><div class="l">Header lock-up</div><div style="width:280px">${M.logoHorizontal()}</div><div style="width:280px">${M.logoHorizontal(false, 'OFFICE')}</div></div>
<div class="c d"><div class="l">Header on dark</div><div style="width:280px">${M.logoHorizontal(true)}</div></div>
<div class="c"><div class="l">Round icon · favicon</div><div style="display:flex;gap:16px;align-items:center">${M.iconPassport(110, { round: true })}${favSvg.replace('<svg ', '<svg width="48" height="48" ')}${favSvg.replace('<svg ', '<svg width="24" height="24" ')}</div></div>
<div class="c"><div class="l">Colours</div><div class="sw"><div style="background:#ED1F24">RED</div><div style="background:#136734">GREEN</div><div style="background:#062E17">NIGHT</div><div style="background:#E3B93A">GOLD</div><div style="background:#231F20">INK</div></div></div>
</div></body></html>`)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: out('public/brand/brand-sheet.png'), fullPage: true })

await browser.close()
if (existsSync(root + 'scripts/.tmp')) (await import('node:fs')).rmSync(root + 'scripts/.tmp', { recursive: true })
console.log('brand assets written')
