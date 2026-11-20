export const ugx = (n: number) => 'UGX ' + Math.round(n).toLocaleString('en-UG')
export const num = (n: number) => Math.round(n).toLocaleString('en-UG')
export function ugxShort(n: number) {
  if (n >= 1e9) return `UGX ${(n / 1e9).toFixed(n >= 1e10 ? 0 : 2).replace(/\.?0+$/, '')}bn`
  if (n >= 1e6) return `UGX ${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1).replace(/\.0$/, '')}m`
  if (n >= 1e3) return `UGX ${Math.round(n / 1e3)}k`
  return `UGX ${n}`
}
const TZ = 'Africa/Kampala'
export const fmtDate = (iso: string, o: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(iso).toLocaleDateString('en-GB', { timeZone: TZ, ...o })
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
export const fmtDT = (iso: string) => `${fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(iso)}`
export const monthLabel = (m: string, long = false) => new Date(m + '-01T12:00:00Z').toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined })
export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return fmtDate(iso, { day: 'numeric', month: 'short' })
}
export const initials = (n: string) => n.replace(/^(Dr\.|Eng\.|Hajji)\s+/, '').split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase()
export const nowIso = () => new Date().toISOString()
/** The current rent month (next month once we're past the 20th, like the office does). */
export function currentRentMonth(d = new Date()) {
  const k = new Date(d.toLocaleString('en-US', { timeZone: TZ }))
  let y = k.getFullYear(), m = k.getMonth() + 1
  if (k.getDate() >= 15) { m++; if (m > 12) { m = 1; y++ } }
  return `${y}-${String(m).padStart(2, '0')}`
}
export const uid = (p: string) => `${p}-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase()}`
export function hueBg(h: number) { return `linear-gradient(135deg, hsl(${h} 55% 32%), hsl(${(h + 25) % 360} 60% 46%))` }
