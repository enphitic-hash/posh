import { chromium } from './pw.mjs'
const OUT = process.argv[2]; const base = 'http://localhost:4173/'
const routes = process.argv.slice(3)
const b = await chromium.launch()
const errs = []
for (const r of routes) {
  const [path, mode = 'm', theme = 'light', pre = ''] = r.split('|')
  const ctx = await b.newContext(mode === 'm' ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: theme } : { viewport: { width: 1440, height: 900 }, colorScheme: theme })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errs.push(`${path}: ${e.message}`))
  p.on('console', (m) => m.type() === 'error' && !/supabase|Failed to load resource|fetch/i.test(m.text()) && errs.push(`${path}: ${m.text()}`))
  await p.goto(base)
  await p.evaluate((pre) => { localStorage.setItem('posh.prefs.v1', pre || JSON.stringify({ theme: 'system', textSize: 'md', app: { role: 'tenant', tenantId: 'T-0001' }, officeStaffId: 'S-1' })) }, pre)
  await p.goto(base + '#' + path); await p.reload(); await p.waitForTimeout(1800)
  await p.screenshot({ path: `${OUT}/${path.replace(/[^a-z0-9]+/gi, '_')}_${mode}_${theme}.png`, fullPage: mode !== 'm' })
  await ctx.close()
}
await b.close()
console.log(errs.length ? errs.join('\n') : 'no errors')
