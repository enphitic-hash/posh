import QRCode from 'qrcode'
import type { DB, Payment, Txn, Invoice, Line } from '../data/types'
import { list, useStore } from '../data/store'
import { usePrefs } from '../data/prefs'
import { CONFIG } from '../config'
import { ugx, num, fmtDT, fmtDate, monthLabel, nowIso, uid } from './format'

/** One printable money document: receipt, payment voucher or invoice. */
export interface PDoc {
  type: 'RECEIPT' | 'PAYMENT VOUCHER' | 'INVOICE'
  no: string
  at: string
  party: string
  partyLabel?: string
  phone?: string
  business: string
  category?: string
  lines: Line[]
  total: number
  paid: number
  balance: number
  method?: string
  ref?: string
  by: string
  note?: string
  tendered?: number
  change?: number
  due?: string
  extra?: [string, string][]
  photo?: string
}

export const receiptUrl = (no: string) => `${CONFIG.publicUrl.replace(/\/?$/, '/')}#/r/${no}`

export function docFromPayment(db: DB, p: Payment): PDoc {
  const t = db.tenants[p.tenantId]; const u = db.units[p.unitId]
  const lines = p.lines.map((l) => ({ desc: l.label, qty: 1, price: l.amount }))
  const bal = p.part?.match(/[\d,]+/)?.[0]
  return {
    type: 'RECEIPT', no: p.receipt, at: p.at, party: t?.name ?? 'Tenant', phone: t?.phone, business: 'Property management', category: `Rent · ${monthLabel(p.month, true)}`,
    lines, total: p.amount, paid: p.amount, balance: bal ? +bal.replace(/,/g, '') : 0, method: p.method, ref: p.ref, by: p.via === 'Office' ? 'Posh rent desk' : `Posh app (${p.via})`,
    extra: u ? [['Home', `${u.estate} ${u.name}`], ['Rent month', monthLabel(p.month, true)]] : undefined, note: p.part,
  }
}
export function docFromTxn(db: DB, t: Txn): PDoc {
  const inv = t.invoiceId ? db.invoices[t.invoiceId] : undefined
  const extra: [string, string][] = []
  if (t.propertyId) extra.push(['Passport', t.propertyId])
  if (inv) extra.push(['For invoice', inv.no])
  if (t.payer && t.dir === 'out') extra.push(['Received by', t.payer])
  return {
    type: t.dir === 'in' ? 'RECEIPT' : 'PAYMENT VOUCHER', no: t.no, at: t.at, party: t.party, partyLabel: t.dir === 'in' ? 'Received from' : 'Paid to', phone: t.phone,
    business: t.business, category: t.category, lines: t.lines, total: t.total, paid: t.paid, balance: Math.max(0, (inv ? inv.total - inv.paid : t.total - t.paid)),
    method: t.method, ref: t.ref, by: t.by, note: t.note, tendered: t.tendered, change: t.change, extra, photo: t.photo,
  }
}
export function docFromInvoice(i: Invoice): PDoc {
  return { type: 'INVOICE', no: i.no, at: i.createdAt, party: i.party, partyLabel: 'Bill to', phone: i.phone, business: i.business, lines: i.lines, total: i.total, paid: i.paid, balance: Math.max(0, i.total - i.paid), by: i.by, due: i.due, extra: i.propertyId ? [['Passport', i.propertyId]] : undefined }
}

export const lineTotal = (ls: Line[]) => ls.reduce((a, l) => a + l.qty * l.price, 0)

export function nextNo(db: DB, prefix: 'SR' | 'PV' | 'INV') {
  const src = prefix === 'INV' ? list(db, 'invoices').map((x) => x.no) : list(db, 'txns').map((x) => x.no)
  const max = Math.max(prefix === 'SR' ? 5100 : prefix === 'PV' ? 2200 : 3100, ...src.filter((n) => n.startsWith(prefix + '-')).map((n) => +n.split('-')[1] || 0))
  return `${prefix}-${max + 1}`
}

export function meName() {
  const id = usePrefs.getState().officeStaffId
  return (id && useStore.getState().db.staff[id]?.name) || 'Posh Office'
}
export function audit(action: string, area: string) {
  useStore.getState().put('audit', { id: uid('A'), at: nowIso(), who: meName(), action, area })
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

/** Print a document. 'thermal' = 80mm receipt printer roll, 'a4' = office printer. */
export async function printDoc(d: PDoc, format: 'thermal' | 'a4' = 'thermal') {
  const qr = await QRCode.toDataURL(receiptUrl(d.no), { margin: 0, width: 200, color: { dark: '#136734', light: '#FFFFFF' } })
  const logo = new URL('brand/logo-company.png', document.baseURI).href
  const c = CONFIG.company
  const title = d.type === 'INVOICE' ? 'TAX INVOICE' : d.type
  const meta: [string, string][] = [
    [d.type === 'INVOICE' ? 'Invoice no.' : d.type === 'RECEIPT' ? 'Receipt no.' : 'Voucher no.', d.no],
    ['Date', fmtDT(d.at)],
    [d.partyLabel ?? (d.type === 'PAYMENT VOUCHER' ? 'Paid to' : 'Received from'), d.party],
    ...(d.phone ? [['Phone', d.phone] as [string, string]] : []),
    ['Business', d.business + (d.category ? ` · ${d.category}` : '')],
    ...(d.extra ?? []),
    ...(d.due ? [['Due by', fmtDate(d.due)] as [string, string]] : []),
  ]
  const pay: [string, string][] = d.type === 'INVOICE' ? [] : [
    ['Method', d.method ?? ''], ['Reference', d.ref ?? ''],
    ...(d.tendered ? [['Cash given', ugx(d.tendered)], ['Change', ugx(d.change ?? 0)]] as [string, string][] : []),
  ]
  const stamp = d.type === 'INVOICE' ? (d.balance === 0 ? 'PAID' : d.paid ? 'PART PAID' : 'UNPAID') : d.balance > 0 ? 'PART PAYMENT' : 'PAID'
  const thermal = format === 'thermal'
  const rows = d.lines.map((l) => thermal
    ? `<tr><td colspan="2">${esc(l.desc)}</td></tr><tr class="sub"><td>${num(l.qty)} × ${num(l.price)}</td><td class="r">${num(l.qty * l.price)}</td></tr>`
    : `<tr><td>${esc(l.desc)}</td><td class="r">${num(l.qty)}</td><td class="r">${num(l.price)}</td><td class="r">${num(l.qty * l.price)}</td></tr>`).join('')
  const kv = (a: [string, string][]) => a.map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')
  const css = thermal ? `
    @page { size: 80mm auto; margin: 3mm }
    body { width: 72mm; margin: 0 auto; font: 11px/1.35 'Inter', Arial, sans-serif; color: #111 }
    .logo { width: 46mm; display: block; margin: 0 auto 4px }
    .c { text-align: center } .muted { color: #444; font-size: 9.5px }
    h1 { font-size: 15px; letter-spacing: 2px; text-align: center; margin: 8px 0 4px }
    .rule { border-top: 1px dashed #000; margin: 6px 0 }
    .kv { display: flex; justify-content: space-between; gap: 6px } .kv b { text-align: right; font-weight: 600 }
    table { width: 100%; border-collapse: collapse } td { padding: 1px 0; vertical-align: top } .r { text-align: right; white-space: nowrap } tr.sub td { color: #333; padding-bottom: 3px }
    .tot { font-size: 15px; font-weight: 800 } .stamp { text-align: center; font-weight: 800; letter-spacing: 3px; border: 2px solid #000; margin: 8px 6mm; padding: 3px }
    .qr { width: 26mm; display: block; margin: 6px auto 2px } .bars { height: 3px; display: flex } .bars i { flex: 1 } ` : `
    @page { size: A4; margin: 16mm }
    body { font: 12px/1.5 'Inter', Arial, sans-serif; color: #231F20; margin: 0 }
    .top { display: flex; justify-content: space-between; align-items: flex-start } .logo { width: 62mm }
    .muted { color: #5F6B63; font-size: 10.5px } .r { text-align: right }
    .bars { height: 4px; display: flex; margin: 10px 0 18px } .bars i { flex: 1 }
    h1 { font-size: 26px; margin: 0; letter-spacing: 1px } .no { font-size: 14px; color: #136734; font-weight: 700 }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 40px; margin: 16px 0 } .kv { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid #E1E7E0; padding: 4px 0 } .kv span { color: #5F6B63 }
    table { width: 100%; border-collapse: collapse; margin-top: 10px } th { text-align: left; font-size: 10.5px; color: #5F6B63; border-bottom: 2px solid #136734; padding: 6px } td { padding: 7px 6px; border-bottom: 1px solid #E1E7E0 } th.r, td.r { text-align: right }
    .sum { width: 80mm; margin-left: auto; margin-top: 10px } .tot { font-size: 16px; font-weight: 800 }
    .stamp { display: inline-block; color: #136734; border: 3px solid #136734; border-radius: 8px; font-weight: 800; letter-spacing: 4px; padding: 6px 16px; transform: rotate(-6deg); font-size: 18px; margin-top: 10px }
    .stamp.warn { color: #C9A227; border-color: #C9A227 } .foot { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end } .qr { width: 28mm }
    .sign { margin-top: 36px; display: flex; gap: 40px } .sign div { flex: 1; border-top: 1px solid #231F20; padding-top: 4px; font-size: 10.5px; color: #5F6B63 }`
  const sums = kv([['Total', ugx(d.total)], ...(d.type === 'INVOICE' ? [['Paid so far', ugx(d.paid)], ['Balance due', ugx(d.balance)]] : d.paid !== d.total || d.balance ? [['Paid now', ugx(d.paid)], ['Balance', ugx(d.balance)]] : []) as [string, string][]])
  const body = thermal ? `
    <img class="logo" src="${logo}" alt="Posh Properties">
    <div class="c muted">${esc(c.name)}<br>${esc(c.address)}<br>Tel ${esc(c.phone)} · WhatsApp +${esc(c.whatsapp)}<br>TIN ${esc(c.tin)}</div>
    <div class="bars" style="margin-top:6px"><i style="background:#ED1F24"></i><i style="background:#136734"></i></div>
    <h1>${title}</h1>
    ${kv(meta)}
    <div class="rule"></div>
    <table>${rows}</table>
    <div class="rule"></div>
    <div class="kv tot"><span>TOTAL</span><b>${ugx(d.total)}</b></div>
    ${d.type === 'INVOICE' ? kv([['Paid so far', ugx(d.paid)], ['Balance due', ugx(d.balance)]]) : (d.paid !== d.total || d.balance) ? kv([['Paid now', ugx(d.paid)], ['Balance', ugx(d.balance)]]) : ''}
    ${pay.length ? '<div class="rule"></div>' + kv(pay) : ''}
    ${d.note ? `<div class="muted" style="margin-top:4px">${esc(d.note)}</div>` : ''}
    <div class="stamp">${stamp}</div>
    <div class="c muted">Served by ${esc(d.by)}</div>
    <img class="qr" src="${qr}" alt="">
    <div class="c muted">Scan to check this ${d.type.toLowerCase()} is genuine<br>${esc(c.tagline)} · ${esc(c.web)}</div>` : `
    <div class="top"><img class="logo" src="${logo}" alt="Posh Properties"><div class="r muted">${esc(c.name)}<br>${esc(c.address)}<br>${esc(c.box)}<br>Tel ${esc(c.phone)} · ${esc(c.email)}<br>TIN ${esc(c.tin)}</div></div>
    <div class="bars"><i style="background:#ED1F24"></i><i style="background:#136734"></i></div>
    <h1>${title}</h1><div class="no">${esc(d.no)}</div>
    <div class="grid">${kv(meta)}${kv(pay)}</div>
    <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price (UGX)</th><th class="r">Amount (UGX)</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="sum">${sums}</div>
    ${d.note ? `<p class="muted">Note: ${esc(d.note)}</p>` : ''}
    ${d.type === 'INVOICE' ? `<p class="muted">Pay to ${esc(c.bank.holder)}, ${esc(c.bank.name)}, ${esc(c.bank.branch)}, account ${esc(c.bank.account)} (SWIFT ${esc(c.bank.swift)}). MTN MoMo ${esc(c.momo.mtn)} · Airtel ${esc(c.momo.airtel)}. Quote ${esc(d.no)}.</p>` : ''}
    <div class="stamp ${stamp === 'PAID' ? '' : 'warn'}">${stamp}</div>
    ${d.type === 'PAYMENT VOUCHER' ? '<div class="sign"><div>Prepared by ' + esc(d.by) + '</div><div>Approved by</div><div>Received by (sign)</div></div>' : ''}
    <div class="foot"><div class="muted">Prepared by ${esc(d.by)} · printed ${fmtDT(nowIso())}<br>${esc(c.tagline)} · ${esc(c.web)}</div><div class="r"><img class="qr" src="${qr}" alt=""><div class="muted">Scan to verify</div></div></div>`
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.no)}</title><style>*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact} table{font-size:inherit}${css}</style></head><body>${body}</body></html>`
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  const w = f.contentWindow!
  w.document.open(); w.document.write(html); w.document.close()
  await new Promise<void>((res) => { const imgs = Array.from(w.document.images); let n = imgs.length; if (!n) return res(); imgs.forEach((i) => { if (i.complete) { if (--n === 0) res() } else i.onload = i.onerror = () => { if (--n === 0) res() } }); setTimeout(res, 2500) })
  w.focus(); w.print()
  setTimeout(() => f.remove(), 60000)
}

export function docText(d: PDoc) {
  return [
    `${CONFIG.company.name} · ${d.type === 'INVOICE' ? 'Invoice' : d.type === 'RECEIPT' ? 'Receipt' : 'Payment voucher'} ${d.no}`,
    `${d.partyLabel ?? 'To'}: ${d.party}`,
    ...d.lines.map((l) => `• ${l.desc}${l.qty > 1 ? ` × ${num(l.qty)}` : ''}: ${ugx(l.qty * l.price)}`),
    `Total ${ugx(d.total)}${d.type !== 'INVOICE' ? ` · paid ${ugx(d.paid)} by ${d.method} (ref ${d.ref})` : ` · due ${d.due ? fmtDate(d.due) : ''}`}`,
    d.balance ? `Balance ${ugx(d.balance)}` : 'Fully paid. Thank you!',
    `Check it: ${receiptUrl(d.no)}`,
  ].join('\n')
}
