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
  const res = await fetch(new URL('brand/logo-horizontal.png', document.baseURI).href)
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
