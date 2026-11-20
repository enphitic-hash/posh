import { chromium } from './pw.mjs'
const OUT = process.argv[2]; const base = 'http://localhost:4173/'
const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${OUT}/cam.y4m`] })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera'] })
const errs = []
const o = await ctx.newPage(); o.on('pageerror', (e) => errs.push(e.message))
await o.goto(base + '#/office'); await o.waitForTimeout(600)
await o.locator('input[type=password]').fill('1234'); await o.getByRole('button', { name: 'Sign in' }).click(); await o.waitForTimeout(600)
await o.goto(base + '#/office/nfc'); await o.waitForTimeout(600)
await o.screenshot({ path: `${OUT}/q_01_monitor.png` })
// phone: app, scan QR with camera → card page (logs a tap) → office pops up
const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('app: ' + e.message))
await p.setViewportSize({ width: 390, height: 844 })
await p.goto(base + '#/app'); await p.waitForTimeout(500)
await p.getByText('Find a home or plot').click(); await p.waitForTimeout(500)
await p.getByLabel('Tap or scan a Posh card or plaque').click(); await p.waitForTimeout(300)
await p.waitForTimeout(3500)
await p.screenshot({ path: `${OUT}/q_02_app_after_scan.png` })
console.log('app url', p.url())
await o.bringToFront(); await o.waitForTimeout(800)
await o.screenshot({ path: `${OUT}/q_03_office_popup.png` })
// office camera scan
await o.getByRole('button', { name: 'Scan QR with camera' }).click(); await o.waitForTimeout(3000)
await o.screenshot({ path: `${OUT}/q_04_office_scan.png` })
// cards page QR + print
await o.goto(base + '#/office/cards'); await o.waitForTimeout(600)
await o.getByTitle('QR code for phones without NFC').first().click(); await o.waitForTimeout(600)
await o.screenshot({ path: `${OUT}/q_05_card_qr.png` })
// print sheet render
await o.evaluate(() => { const d = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow'); Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { get() { const w = d.get.call(this); if (w && !w.__s) { w.__s = 1; w.print = () => { window.__last = w.document.documentElement.outerHTML } } return w } }) })
await o.keyboard.press('Escape')
await o.getByRole('button', { name: /Print cards with QR/ }).click(); await o.waitForTimeout(1500)
const html = await o.evaluate(() => window.__last)
const pp = await ctx.newPage(); await pp.setViewportSize({ width: 820, height: 1100 }); await pp.goto(base); await pp.setContent(html); await pp.waitForTimeout(500)
await pp.screenshot({ path: `${OUT}/q_06_print_cards.png` })
// photo fallback + tenant pay by QR
await p.goto(base + '#/app'); await p.waitForTimeout(300)
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('posh.prefs.v1')); s.app = { role: 'tenant', tenantId: 'T-0001' }; localStorage.setItem('posh.prefs.v1', JSON.stringify(s)) })
await p.goto(base + '#/app/pay/go'); await p.reload(); await p.waitForTimeout(800)
await p.screenshot({ path: `${OUT}/q_07_pay_step1.png` })
await p.getByRole('button', { name: /No NFC\? Scan the QR/ }).click(); await p.waitForTimeout(3500)
await p.screenshot({ path: `${OUT}/q_08_pay_after_qr.png` })
// plaque via QR url directly
await p.goto(base + '#/p/PP-KLA-0412?via=qr'); await p.waitForTimeout(800)
await p.screenshot({ path: `${OUT}/q_09_plaque_qr.png` })
await p.goto(base + '#/c/PC-0412-B4-7781?via=qr'); await p.waitForTimeout(800)
await p.screenshot({ path: `${OUT}/q_10_card_qr_page.png` })
console.log('ERRORS', errs)
await b.close()
