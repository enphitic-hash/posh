import { jsPDF } from 'jspdf'
import type { DB, Payment } from '../data/types'
import { ugx, fmtDT, monthLabel, fmtDate, num } from './format'
import { CONFIG } from '../config'
import { list } from '../data/store'

const GREEN: [number, number, number] = [19, 103, 52]
const RED: [number, number, number] = [237, 31, 36]
const INK: [number, number, number] = [35, 31, 32]
const MUTED: [number, number, number] = [95, 107, 99]

let logoCache: string | null = null
async function logo() {
  if (logoCache) return logoCache
  const res = await fetch(new URL('brand/logo-company.png', document.baseURI).href)
  const blob = await res.blob()
  logoCache = await new Promise<string>((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result as string); fr.readAsDataURL(blob) })
  return logoCache
}

async function header(doc: jsPDF, title: string, sub: string) {
  try { doc.addImage(await logo(), 'PNG', 15, 12, 54, 12) } catch { doc.setFont('times', 'bold'); doc.setFontSize(20); doc.text('POSH', 15, 22) }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED)
  doc.text([CONFIG.company.name, CONFIG.company.address, `${CONFIG.company.phone} · ${CONFIG.company.email}`], 195, 14, { align: 'right' })
  doc.setFillColor(...RED); doc.rect(15, 30, 90, 1.2, 'F'); doc.setFillColor(...GREEN); doc.rect(105, 30, 90, 1.2, 'F')
  doc.setTextColor(...INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(title, 15, 44)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text(sub, 15, 51)
}

function footer(doc: jsPDF, note: string) {
  doc.setDrawColor(225, 231, 224); doc.line(15, 275, 195, 275)
  doc.setFontSize(8); doc.setTextColor(...MUTED)
  doc.text(note, 15, 281)
  doc.text('Posh Passport · ' + CONFIG.company.tagline, 195, 281, { align: 'right' })
}

export async function receiptPdf(db: DB, p: Payment) {
  const t = db.tenants[p.tenantId]; const u = db.units[p.unitId]
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await header(doc, `Receipt ${p.receipt}`, `${fmtDT(p.at)} · ${monthLabel(p.month, true)}`)
  let y = 64
  const row = (a: string, b: string, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...(bold ? INK : MUTED)); doc.text(a, 15, y); doc.setTextColor(...INK); doc.text(b, 195, y, { align: 'right' }); y += 8 }
  doc.setFontSize(11)
  row('Received from', t.name)
  row('Home', `${u.estate}, ${u.name}`)
  row('Paid with', `${p.method} · ref ${p.ref}`)
  row('Started by', p.via === 'Card tap' ? 'Posh card tap' : p.via)
  y += 4; doc.setDrawColor(225, 231, 224); doc.line(15, y, 195, y); y += 9
  p.lines.forEach((l) => row(l.label, ugx(l.amount)))
  doc.line(15, y - 3, 195, y - 3); y += 4
  doc.setFontSize(14); row('Total paid', ugx(p.amount), true)
  if (p.part) { doc.setFontSize(10); row('Note', p.part) }
  doc.setFillColor(230, 242, 234); doc.roundedRect(15, y + 4, 180, 22, 3, 3, 'F')
  doc.setFontSize(10); doc.setTextColor(...GREEN); doc.setFont('helvetica', 'bold')
  doc.text(p.status === 'Paid' ? 'PAID · thank you' : 'PART PAYMENT RECEIVED', 22, y + 13)
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED)
  doc.text('Landlord statement updated · URA rental record saved · gate card active', 22, y + 20)
  footer(doc, `Receipt ${p.receipt} · verify at ${CONFIG.publicUrl}`)
  doc.save(`Posh-receipt-${p.receipt}.pdf`)
}

export async function statementPdf(db: DB, landlordId: string, month: string) {
  const l = db.landlords[landlordId]
  const units = list(db, 'units').filter((u) => u.landlordId === landlordId)
  const pays = list(db, 'payments').filter((p) => p.month === month && units.some((u) => u.id === p.unitId))
  const gross = pays.reduce((a, p) => a + p.amount, 0)
  const fee = Math.round(gross * 0.1)
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  await header(doc, `Landlord statement · ${monthLabel(month, true)}`, `${l.name} · ${units.length} units · issued ${fmtDate(new Date().toISOString())}`)
  let y = 64
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...MUTED)
  ;['Unit', 'Tenant', 'Rent due', 'Paid', 'Method', 'Date'].forEach((h, i) => doc.text(h, [15, 40, 95, 125, 150, 178][i], y))
  y += 6; doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK)
  for (const u of units) {
    const p = pays.find((x) => x.unitId === u.id)
    const t = u.tenantId ? db.tenants[u.tenantId] : undefined
    doc.text(`${u.estate.replace('Posh ', '')} ${u.name}`, 15, y)
    doc.text(t?.name ?? 'Vacant', 40, y)
    doc.text(num(u.rent + u.service), 95, y)
    doc.text(p ? num(p.amount) : '—', 125, y)
    doc.text(p ? p.method : t ? 'Unpaid' : '', 150, y)
    doc.text(p ? fmtDate(p.at, { day: 'numeric', month: 'short' }) : '', 178, y)
    y += 7
    if (y > 230) { doc.addPage(); y = 20 }
  }
  y += 6
  const row = (a: string, b: string, bold = false) => { doc.setFontSize(bold ? 13 : 11); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.text(a, 95, y); doc.text(b, 195, y, { align: 'right' }); y += 8 }
  row('Rent collected', ugx(gross))
  row('Posh management fee (10%)', '− ' + ugx(fee))
  row(`Paid to you on the ${l.payoutDay}th`, ugx(gross - fee), true)
  footer(doc, 'Receipts and leases are attached in the Posh app. Figures are for your URA rental income return.')
  doc.save(`Posh-statement-${l.name.replace(/\W+/g, '-')}-${month}.pdf`)
}

/** PDF of any receipt, payment voucher or invoice. */
export async function docPdf(d: import('./docs').PDoc) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const title = d.type === 'INVOICE' ? `Invoice ${d.no}` : d.type === 'RECEIPT' ? `Receipt ${d.no}` : `Payment voucher ${d.no}`
  await header(doc, title, `${fmtDT(d.at)} · ${d.business}${d.category ? ' · ' + d.category : ''}`)
  let y = 62
  const kv = (a: string, b: string) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED); doc.text(a, 15, y); doc.setTextColor(...INK); doc.text(b, 195, y, { align: 'right' }); y += 6.5 }
  kv(d.partyLabel ?? (d.type === 'PAYMENT VOUCHER' ? 'Paid to' : 'Received from'), d.party)
  if (d.phone) kv('Phone', d.phone)
  ;(d.extra ?? []).forEach(([a, b]) => kv(a, b))
  if (d.due) kv('Due by', fmtDate(d.due))
  if (d.type !== 'INVOICE') { kv('Method', d.method ?? ''); kv('Reference', d.ref ?? '') }
  if (d.tendered) { kv('Cash given', ugx(d.tendered)); kv('Change', ugx(d.change ?? 0)) }
  y += 4
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...MUTED)
  doc.text('Description', 15, y); doc.text('Qty', 130, y, { align: 'right' }); doc.text('Unit price', 160, y, { align: 'right' }); doc.text('Amount', 195, y, { align: 'right' })
  doc.setDrawColor(...GREEN); doc.setLineWidth(0.6); doc.line(15, y + 2, 195, y + 2); doc.setLineWidth(0.2); y += 8
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...INK); doc.setFontSize(10)
  for (const l of d.lines) {
    const desc = doc.splitTextToSize(l.desc, 100) as string[]
    doc.text(desc, 15, y); doc.text(num(l.qty), 130, y, { align: 'right' }); doc.text(num(l.price), 160, y, { align: 'right' }); doc.text(num(l.qty * l.price), 195, y, { align: 'right' })
    y += 5 * desc.length + 2
    if (y > 240) { doc.addPage(); y = 20 }
  }
  doc.setDrawColor(225, 231, 224); doc.line(15, y, 195, y); y += 7
  const sum = (a: string, b: string, bold = false) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 13 : 10); doc.text(a, 120, y); doc.text(b, 195, y, { align: 'right' }); y += bold ? 8 : 6 }
  sum('Total', ugx(d.total), true)
  if (d.type === 'INVOICE') { sum('Paid so far', ugx(d.paid)); sum('Balance due', ugx(d.balance), true) }
  else if (d.balance) { sum('Paid now', ugx(d.paid)); sum('Balance', ugx(d.balance)) }
  const stamp = d.type === 'INVOICE' ? (d.balance === 0 ? 'PAID' : d.paid ? 'PART PAID' : 'UNPAID') : d.balance > 0 ? 'PART PAYMENT' : 'PAID'
  doc.setDrawColor(...GREEN); doc.setTextColor(...GREEN); doc.setLineWidth(0.8); doc.roundedRect(15, y, 50, 13, 2, 2); doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text(stamp, 40, y + 8.7, { align: 'center' }); doc.setLineWidth(0.2)
  y += 22
  if (d.note) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text(doc.splitTextToSize('Note: ' + d.note, 180), 15, y); y += 10 }
  if (d.type === 'INVOICE') { doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text(doc.splitTextToSize(`Pay to ${CONFIG.company.bank.holder}, ${CONFIG.company.bank.name}, ${CONFIG.company.bank.branch}, account ${CONFIG.company.bank.account}. MTN MoMo ${CONFIG.company.momo.mtn}. Quote ${d.no}.`, 180), 15, y) }
  if (d.type === 'PAYMENT VOUCHER') { y += 14; doc.setTextColor(...MUTED); doc.setFontSize(9); ['Prepared by ' + d.by, 'Approved by', 'Received by (sign)'].forEach((s, i) => { doc.line(15 + i * 62, y, 70 + i * 62, y); doc.text(s, 15 + i * 62, y + 5) }) }
  footer(doc, `${d.no} · served by ${d.by} · TIN ${CONFIG.company.tin}`)
  doc.save(`Posh-${d.no}.pdf`)
}
