import type { DB, Tenant, Listing, Payment, PayMethod } from '../data/types'
import { list, useStore } from '../data/store'
import { currentRentMonth, nowIso, uid, ugx, monthLabel } from './format'
import { CONFIG } from '../config'

export const WATER_ESTIMATE = 48500

export function tenantDue(db: DB, t: Tenant, month = currentRentMonth()) {
  const unit = db.units[t.unitId]
  const lines = [
    { label: 'Rent', amount: unit.rent },
    { label: 'Service charge', amount: unit.service },
    { label: 'Water (meter)', amount: WATER_ESTIMATE },
  ]
  const total = lines.reduce((a, b) => a + b.amount, 0)
  const pays = list(db, 'payments').filter((p) => p.tenantId === t.id && p.month === month && p.status !== 'Failed')
  const paid = pays.reduce((a, p) => a + p.amount, 0)
  return { month, lines, total, paid, balance: Math.max(0, total - paid), pays, unit }
}

export function monthTotals(db: DB, month: string) {
  const units = list(db, 'units')
  const let_ = units.filter((u) => u.tenantId)
  const due = let_.reduce((a, u) => a + u.rent + u.service, 0)
  const pays = list(db, 'payments').filter((p) => p.month === month && p.status !== 'Failed')
  const collected = pays.reduce((a, p) => a + p.amount, 0)
  const paidTenants = new Set(pays.map((p) => p.tenantId))
  const overdueTenants = let_.filter((u) => !paidTenants.has(u.tenantId!))
  return { due, collected, pct: due ? Math.round((collected / due) * 100) : 0, units: units.length, let: let_.length, vacant: units.length - let_.length, overdue: overdueTenants.reduce((a, u) => a + u.rent + u.service, 0), overdueCount: overdueTenants.length, pays }
}

// ---------- Posh AI: late-payment risk ----------
export interface Risk { tenantId: string; score: number; reasons: string[] }
export function lateRisk(db: DB, t: Tenant): Risk {
  const h = t.history
  const avg = h.reduce((a, b) => a + b, 0) / Math.max(1, h.length)
  const recent = h.slice(-3)
  const recentAvg = recent.reduce((a, b) => a + b, 0) / Math.max(1, recent.length)
  const lateMonths = h.filter((d) => d > 5).length
  const trend = recentAvg - (h.slice(0, 3).reduce((a, b) => a + b, 0) / 3)
  const nov = list(db, 'payments').filter((p) => p.tenantId === t.id && p.month === '2026-11')
  let score = 4 + avg * 1.6 + lateMonths * 6 + Math.max(0, trend) * 1.5
  const reasons: string[] = []
  if (lateMonths) reasons.push(`Paid after the 5th in ${lateMonths} of the last ${h.length} months`)
  if (trend > 2) reasons.push(`Paying later each month (+${Math.round(trend)} days)`)
  if (nov.length === 0) { score += 18; reasons.push('November rent not yet paid') }
  if (t.wallet === 0 && avg > 3) { score += 4; reasons.push('No Posh Wallet balance') }
  if (avg > 0 && !reasons.length) reasons.push(`Usually pays ${Math.round(avg)} days after the 1st`)
  if (!reasons.length) reasons.push('Always pays on time')
  return { tenantId: t.id, score: Math.min(94, Math.round(score)), reasons }
}
export function riskList(db: DB, min = 50) {
  return list(db, 'tenants').map((t) => lateRisk(db, t)).filter((r) => r.score >= min).sort((a, b) => b.score - a.score)
}

// ---------- Posh AI: home matching ----------
export interface Query { area?: string; beds?: number; max?: number; kind?: Listing['kind']; words: string[] }
const AREAS = ['ntinda', 'kyanja', 'naguru', 'kololo', 'bukoto', 'kira', 'najjera', 'muyenga', 'munyonyo', 'gayaza', 'matugga', 'kajjansi', 'kasangati', 'kiwatule']
export function parseQuery(q: string): Query {
  const s = q.toLowerCase()
  const out: Query = { words: [] }
  out.area = AREAS.find((a) => s.includes(a))
  const b = s.match(/(\d)\s*-?\s*(bed|br|bedroom)/)
  if (b) out.beds = +b[1]
  const m = s.match(/(under|below|max|<)\s*(ugx\s*)?([\d.]+)\s*(m|million|k|bn)?/)
  if (m) { const v = parseFloat(m[3]); const u = m[4] ?? 'm'; out.max = u.startsWith('b') ? v * 1e9 : u === 'k' ? v * 1e3 : v * 1e6 }
  if (/buy|sale|purchase/.test(s)) out.kind = 'Buy'
  else if (/plot|land|acre/.test(s)) out.kind = 'Land'
  else if (/shop|office|commercial/.test(s)) out.kind = 'Commercial'
  else if (/night|short/.test(s)) out.kind = 'Short stay'
  else if (/rent|month|mo\b/.test(s)) out.kind = 'Rent'
  for (const w of ['school', 'parking', 'generator', 'furnished', 'garden', 'pool', 'gated', 'lift']) if (s.includes(w)) out.words.push(w)
  return out
}
export function matchListings(db: DB, q: Query, kind?: Listing['kind']) {
  const k = q.kind ?? kind
  return list(db, 'listings')
    .filter((l) => !k || l.kind === k)
    .map((l) => {
      let score = 50
      const why: string[] = []
      if (q.area) { if (l.area.toLowerCase().includes(q.area)) { score += 25; why.push(l.area) } else score -= 30 }
      if (q.beds) { if (l.beds === q.beds) { score += 15; why.push(`${l.beds}-bed`) } else if (l.beds && Math.abs(l.beds - q.beds) === 1) score += 3; else score -= 20 }
      if (q.max) { if (l.price <= q.max) { score += 15; why.push(`under ${ugx(q.max).replace('UGX ', 'UGX ')}`) } else score -= 40 }
      for (const w of q.words) {
        const hit = (w === 'school' && l.nearSchools) || (w === 'parking' && l.parking) || (w === 'generator' && l.generator) || l.features.join(' ').toLowerCase().includes(w)
        if (hit) { score += 6; why.push(w === 'school' ? 'near schools' : w) }
      }
      if (l.verified) score += 5
      return { l, score: Math.max(0, Math.min(99, score)), why }
    })
    .filter((x) => x.score >= 45)
    .sort((a, b) => b.score - a.score)
}

// ---------- Actions ----------
export function recordPayment(opts: { tenantId: string; amount: number; method: PayMethod; via: Payment['via']; lines: Payment['lines']; month: string; part?: string; ref?: string }) {
  const st = useStore.getState()
  const db = st.db
  const t = db.tenants[opts.tenantId]
  const unit = db.units[t.unitId]
  const n = 88000 + list(db, 'payments').length + 1 + Math.floor(Math.random() * 50)
  const ref = opts.ref ?? (opts.method === 'MTN MoMo' ? `MP${Date.now().toString().slice(-9)}` : opts.method === 'Airtel Money' ? `AM${Date.now().toString().slice(-8)}X` : `TX${Date.now().toString().slice(-8)}`)
  const p: Payment = { id: uid('P'), receipt: `RC-${n}`, tenantId: t.id, unitId: unit.id, month: opts.month, amount: opts.amount, lines: opts.lines, method: opts.method, ref, status: opts.part ? 'Part' : 'Paid', via: opts.via, at: nowIso(), part: opts.part }
  st.put('payments', p)
  if (opts.method === 'Posh Wallet') st.patch('tenants', t.id, { wallet: Math.max(0, t.wallet - opts.amount) })
  if (t.cardId && opts.via === 'Card tap') {
    st.patch('cards', t.cardId, { lastTap: p.at })
    st.put('taps', { id: uid('TP'), cardId: t.cardId, kind: 'Pay', place: 'Posh app · rent', at: p.at, result: 'OK', who: t.name })
  }
  const landlord = db.landlords[unit.landlordId]
  sendMessage({ to: t.name, phone: t.phone, channel: 'WhatsApp', kind: 'receipt', text: `Posh Properties: Payment received, ${ugx(p.amount)} for ${monthLabel(p.month, true)} (${unit.estate} ${unit.name}). Receipt ${p.receipt}, ${p.method} ref ${p.ref}. Thank you!` })
  if (landlord && landlord.id !== 'L-03') sendMessage({ to: landlord.name, phone: landlord.phone, channel: 'SMS', kind: 'landlord', text: `Posh: ${unit.estate} ${unit.name} paid ${ugx(p.amount)} for ${monthLabel(p.month)}. Payout on the ${landlord.payoutDay}th.` })
  return p
}

export function sendMessage(m: { to: string; phone?: string; channel: 'WhatsApp' | 'SMS' | 'Email'; text: string; kind: string }) {
  useStore.getState().put('messages', { id: uid('M'), at: nowIso(), ...m })
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}
export const poshWa = (text: string) => waLink(CONFIG.company.whatsapp, text)

export function verifyUrl(code: string) {
  return `${CONFIG.publicUrl.replace(/\/?$/, '/')}#/p/${code}`
}
export function cardUrl(cardId: string) {
  return `${CONFIG.publicUrl.replace(/\/?$/, '/')}#/c/${cardId}`
}
