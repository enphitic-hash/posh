import { chromium } from './pw.mjs'
import { fontCss } from './fonts.mjs'
import * as M from '../src/brand/marks.ts'
const out = process.argv[2]
const html = `<html><head><style>${fontCss} body{margin:0;font-family:Inter;background:#eee;padding:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px} .c{background:#fff;border-radius:16px;padding:20px;display:flex;flex-direction:column;align-items:center;gap:12px} .d{background:#062E17} svg{max-width:100%} h3{margin:0;font-size:16px}</style></head><body>
<div class=c><h3>A · Heritage</h3><div style="width:260px">${M.logoHeritage()}</div></div>
<div class=c><h3>B · Passport app icon</h3><div style="width:240px">${M.iconPassport(240)}</div></div>
<div class=c><h3>C · Verified seal</h3><div style="width:240px">${M.sealSvg(240)}</div></div>
<div class=c><div style="width:320px">${M.logoHorizontal()}</div></div>
<div class="c d"><div style="width:320px">${M.logoHorizontal(true)}</div></div>
<div class="c d"><div style="width:240px">${M.sealSvg(240,true)}</div></div>
</body></html>`
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1100, height: 900 } })
await p.setContent(html); await p.waitForTimeout(300); await p.screenshot({ path: out, fullPage: true }); await b.close()
