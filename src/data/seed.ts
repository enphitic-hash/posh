import type { Txn, Invoice, DB, Property, Unit, Tenant, Payment, Card, Tap, Listing, Repair, Site, Worker, Deal, Valuation, Mortgage, Technician, Landlord, Staff, Viewing, Message } from './types'

// Deterministic pseudo-random so every reseed gives the same demo data.
let s = 20261124
const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
const idx = (n: number, w = 4) => String(n).padStart(w, '0')

const FIRST = ['Nakato', 'Okello', 'Namubiru', 'Mugisha', 'Achieng', 'Ssemanda', 'Nabirye', 'Kizza', 'Atuhaire', 'Byaruhanga', 'Nansubuga', 'Tumusiime', 'Kyomugisha', 'Wasswa', 'Babirye', 'Opio', 'Nalwoga', 'Kato', 'Akello', 'Mukasa', 'Namatovu', 'Ochieng', 'Asiimwe', 'Nantongo', 'Lubega', 'Ainembabazi', 'Ssali', 'Auma', 'Kiggundu', 'Nyakato']
const GIVEN = ['Sarah', 'Brian', 'Grace', 'Joseph', 'Esther', 'Ivan', 'Patience', 'Moses', 'Joan', 'Daniel', 'Ruth', 'Peter', 'Diana', 'Allan', 'Brenda', 'Samuel', 'Faith', 'Henry', 'Mercy', 'Isaac', 'Prossy', 'Ronald', 'Sharon', 'Edward', 'Juliet', 'Hassan', 'Aisha', 'Paul', 'Winnie', 'Collins']
const ESTATES = ['Posh Naguru Heights', 'Posh Kololo Court', 'Posh Ntinda Gardens', 'Posh Kyanja Townhouses', 'Posh Muyenga View', 'Posh Bukoto Flats']
const AREA: Record<string, string> = { 'Posh Naguru Heights': 'Naguru', 'Posh Kololo Court': 'Kololo', 'Posh Ntinda Gardens': 'Ntinda', 'Posh Kyanja Townhouses': 'Kyanja', 'Posh Muyenga View': 'Muyenga', 'Posh Bukoto Flats': 'Bukoto' }
const ESTATE_RENT: Record<string, number> = { 'Posh Naguru Heights': 2800000, 'Posh Kololo Court': 3500000, 'Posh Ntinda Gardens': 2200000, 'Posh Kyanja Townhouses': 3000000, 'Posh Muyenga View': 1800000, 'Posh Bukoto Flats': 1500000 }
const MONTHS = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']

export const DEMO_TENANT = 'T-0001'
export const DEMO_LANDLORD = 'L-01'
export const DEMO_UID = '04:73:D4:CA:04:19:90' // Victor's NTAG213 card

function phone() { return '+256 7' + pick(['72', '74', '75', '01', '03', '06', '82', '78']) + ' ' + Math.floor(100 + rnd() * 899) + ' ' + Math.floor(100 + rnd() * 899) }

export function makeSeed(): DB {
  s = 20261124
  const db: DB = { properties: {}, landlords: {}, units: {}, tenants: {}, payments: {}, technicians: {}, repairs: {}, listings: {}, viewings: {}, cards: {}, taps: {}, sites: {}, workers: {}, valuations: {}, mortgages: {}, deals: {}, checkpoints: {}, messages: {}, staff: {}, txns: {}, invoices: {}, suppliers: {}, audit: {} }

  // ---------- Staff (Posh Office logins) ----------
  const staff: Staff[] = [
    { id: 'S-1', name: 'Hajji Issa Bukenya', role: 'Managing Director', email: 'hajji@poshproperties.co.ug', pin: '2024', phone: '+256 774 755146' },
    { id: 'S-2', name: 'Grace Namubiru', role: 'Rent desk', email: 'rent@poshproperties.co.ug', pin: '1111', phone: '+256 703 995674' },
    { id: 'S-3', name: 'Eng. Paul Okello', role: 'Site manager', email: 'paul@poshproperties.co.ug', pin: '2222', phone: '+256 753 100355' },
    { id: 'S-4', name: 'Moses Kizza', role: 'Caretaker, Naguru Heights', email: 'moses@poshproperties.co.ug', pin: '3333', phone: '+256 706 256881' },
    { id: 'S-5', name: 'Diana Atuhaire', role: 'Sales agent', email: 'diana@poshproperties.co.ug', pin: '4444', phone: '+256 772 410 228' },
  ]
  staff.forEach((x) => (db.staff[x.id] = x))

  // ---------- Landlords ----------
  const landlords: Landlord[] = [
    { id: 'L-01', name: 'Kato Ssekandi', phone: '+256 772 118 440', area: 'Ntinda', payoutDay: 5 },
    { id: 'L-02', name: 'Dr. Ruth Nansubuga', phone: '+256 701 552 019', area: 'Kololo', payoutDay: 5 },
    { id: 'L-03', name: 'Posh Properties (own)', phone: '+256 414 662954', area: 'Bukoto', payoutDay: 1 },
    { id: 'L-04', name: 'Henry Mukasa (UK)', phone: '+44 7700 900 412', area: 'Kyanja', payoutDay: 7 },
  ]
  landlords.forEach((x) => (db.landlords[x.id] = x))

  // ---------- Properties / Passports ----------
  const props: Property[] = [
    {
      id: 'PP-KLA-0412', title: '4-bed villa', kind: 'Villa', estate: 'Kiwatule Close', area: 'Kiwatule', beds: 4, baths: 3.5, size: '0.25 acre', built: '2025', value: 1450000000, valueChange: 11, stage: 'Management', titleStatus: 'Clean', titleNo: 'Kyadondo Block 216 Plot 4412', owner: 'Henry Mukasa', agent: 'Diana Atuhaire', plaqueUid: DEMO_UID, photos: 212, hue: 142, issued: '2025-03-03', tenancy: 'Occupied · lease to Aug 2027',
      timeline: [
        { date: '2024-01-14', biz: 'Sales', title: 'Plot sold by Posh Agency', detail: 'Plot 4412 sold to Henry Mukasa for UGX 180m. Sale agreement signed at Bukoto office.' },
        { date: '2024-02-09', biz: 'Survey', title: 'Boundary opened and title checked', detail: 'Posh Surveyors opened boundaries. Mailo title clean, no caveats.' },
        { date: '2024-03-10', biz: 'Construction', title: 'Construction started', detail: 'Posh Construction broke ground. Budget UGX 720m, 11-month schedule.' },
        { date: '2025-02-20', biz: 'Construction', title: 'Handed over on time', detail: 'Built in 11 months. 212 verified site photos in the passport.' },
        { date: '2025-03-03', biz: 'Management', title: 'Posh Passport issued, plaque fitted', detail: 'NFC plaque PP-KLA-0412 fitted at the gate.' },
        { date: '2025-04-01', biz: 'Management', title: 'Let to a family', detail: 'Rent UGX 6.5m a month by MoMo. Lease signed in the app to Aug 2027.' },
        { date: '2026-11-04', biz: 'Valuation', title: 'Valued at UGX 1.45bn', detail: 'Posh Valuers report for Stanbic Bank. +11% since build.' },
        { date: '2026-11-12', biz: 'Survey', title: 'Title searched again', detail: 'Land registry search: clean, no caveats, no mortgage.' },
      ],
    },
    { id: 'PP-KLA-0388', title: 'Naguru Heights (24 apartments)', kind: 'Apartment block', estate: 'Posh Naguru Heights', area: 'Naguru', size: '24 units', built: '2022', value: 9800000000, valueChange: 8, stage: 'Management', titleStatus: 'Clean', titleNo: 'LRV 4120 Folio 8', owner: 'Posh Properties Ltd', agent: 'Grace Namubiru', photos: 96, hue: 150, issued: '2023-01-10', tenancy: '23 of 24 let',
      timeline: [
        { date: '2021-02-01', biz: 'Construction', title: 'Construction started', detail: '6-floor block with lift and backup generator.' },
        { date: '2022-08-15', biz: 'Construction', title: 'Completed', detail: '24 apartments, 2 and 3 bed.' },
        { date: '2023-01-10', biz: 'Management', title: 'Passport issued', detail: 'Resident cards and gate readers installed.' },
      ] },
    { id: 'PP-KLA-0517', title: 'Kololo Court (12 apartments)', kind: 'Apartment block', estate: 'Posh Kololo Court', area: 'Kololo', size: '12 units', built: '2021', value: 7200000000, valueChange: 6, stage: 'Management', titleStatus: 'Clean', titleNo: 'LRV 3988 Folio 21', owner: 'Dr. Ruth Nansubuga', agent: 'Grace Namubiru', photos: 54, hue: 160, issued: '2023-05-02', tenancy: '12 of 12 let', timeline: [{ date: '2023-05-02', biz: 'Management', title: 'Taken under Posh management', detail: '12 apartments.' }] },
    { id: 'PP-WAK-0077', title: '5-bed home, Plot 77', kind: 'House (building)', estate: 'Kira-Mulawa', area: 'Kira', beds: 5, baths: 4, size: '50 x 100 ft', value: 640000000, valueChange: 0, stage: 'Construction', titleStatus: 'Clean', titleNo: 'Kyadondo Block 232 Plot 77', owner: 'Joan Atuhaire', agent: 'Eng. Paul Okello', photos: 212, hue: 35, issued: '2026-03-10',
      timeline: [
        { date: '2026-01-20', biz: 'Sales', title: 'Plot bought through Posh', detail: 'Client in London; paid by card from the UK.' },
        { date: '2026-03-10', biz: 'Construction', title: 'Ground broken', detail: 'Handover planned June 2027.' },
        { date: '2026-10-02', biz: 'Construction', title: 'Ring beam and walls paid', detail: 'GBP 18,400 by UK card.' },
      ] },
    { id: 'PP-KLA-0631', title: '4-bed bungalow', kind: 'Bungalow', estate: 'Najjera II', area: 'Najjera', beds: 4, baths: 3, size: '50 x 100 ft', built: '2024', value: 780000000, valueChange: 9, stage: 'Sales', titleStatus: 'Clean', titleNo: 'Kyadondo Block 189 Plot 2207', owner: 'Brian Ssemanda', agent: 'Diana Atuhaire', photos: 40, hue: 95, issued: '2026-09-01', timeline: [{ date: '2026-09-01', biz: 'Sales', title: 'Listed for sale', detail: 'Valued, title checked, mortgage-ready.' }] },
    { id: 'PP-MUK-0204', title: 'Munyonyo Villas, Block B', kind: 'Villas (building)', estate: 'Munyonyo Villas', area: 'Munyonyo', size: '6 villas', value: 4100000000, valueChange: 0, stage: 'Construction', titleStatus: 'Clean', titleNo: 'Kyadondo Block 273 Plot 90', owner: 'Posh Properties Ltd', agent: 'Eng. Paul Okello', photos: 330, hue: 200, issued: '2026-01-15', timeline: [{ date: '2026-01-15', biz: 'Construction', title: 'Block B started', detail: '6 lakeside villas.' }] },
    { id: 'PP-KLA-0712', title: 'Gayaza Rd shops', kind: 'Commercial', estate: 'Gayaza Road', area: 'Kasangati', size: '10 shops', value: 1900000000, valueChange: 0, stage: 'Construction', titleStatus: 'Caveat', titleNo: 'Kyadondo Block 108 Plot 33', owner: 'Mukasa Holdings', agent: 'Eng. Paul Okello', photos: 120, hue: 20, issued: '2026-02-01', timeline: [{ date: '2026-06-02', biz: 'Survey', title: 'Caveat lodged', detail: 'Boundary dispute with neighbour; lawyer handling.' }] },
    { id: 'PP-ENT-0103', title: 'Entebbe Kitoro townhouses', kind: 'Townhouses (building)', estate: 'Kitoro', area: 'Entebbe', size: '3 units', value: 1200000000, valueChange: 0, stage: 'Construction', titleStatus: 'Clean', titleNo: 'Busiro Block 412 Plot 18', owner: 'Posh Properties Ltd', agent: 'Eng. Paul Okello', photos: 61, hue: 185, issued: '2026-05-04', timeline: [] },
    { id: 'PP-KLA-0820', title: '3-bed apartment, Ntinda', kind: 'Apartment', estate: 'Posh Ntinda Gardens', area: 'Ntinda', beds: 3, baths: 2, size: '140 m²', built: '2023', value: 520000000, valueChange: 7, stage: 'Valuation', titleStatus: 'Clean', titleNo: 'Condo Plan 22 Unit 6', owner: 'Kato Ssekandi', agent: 'Grace Namubiru', photos: 18, hue: 130, issued: '2024-06-12', timeline: [{ date: '2026-11-18', biz: 'Valuation', title: 'Valuation for dfcu Bank', detail: 'Inspection booked 21 Nov.' }] },
    { id: 'PP-KLA-0905', title: 'Residential plot, Gayaza', kind: 'Plot', estate: 'Gayaza Hills', area: 'Gayaza', size: '50 x 100 ft', value: 95000000, valueChange: 14, stage: 'Sales', titleStatus: 'Clean', titleNo: 'Kyadondo Block 99 Plot 1501', owner: 'Posh Properties Ltd', agent: 'Diana Atuhaire', photos: 6, hue: 80, issued: '2026-10-01', timeline: [] },
    { id: 'PP-KLA-0950', title: '5-bed house, Muyenga', kind: 'House', estate: 'Muyenga', area: 'Muyenga', beds: 5, baths: 5, size: '0.3 acre', built: '2019', value: 2300000000, valueChange: 5, stage: 'Finance', titleStatus: 'Pending', titleNo: 'Kyadondo Block 244 Plot 812', owner: 'Patience Nabirye', agent: 'Diana Atuhaire', photos: 22, hue: 50, issued: '2026-08-20', timeline: [{ date: '2026-11-10', biz: 'Finance', title: 'Mortgage offers received', detail: 'Stanbic and Absa.' }] },
  ]
  props.forEach((p) => (db.properties[p.id] = p))

  // ---------- Units + tenants ----------
  let t = 1
  let u = 1
  const unitsPerEstate: Record<string, number> = { 'Posh Naguru Heights': 24, 'Posh Kololo Court': 12, 'Posh Ntinda Gardens': 16, 'Posh Kyanja Townhouses': 8, 'Posh Muyenga View': 14, 'Posh Bukoto Flats': 18 }
  for (const estate of ESTATES) {
    const n = unitsPerEstate[estate]
    for (let i = 0; i < n; i++) {
      const block = String.fromCharCode(65 + Math.floor(i / 8))
      const name = estate === 'Posh Kyanja Townhouses' ? `TH${i + 1}` : `${block}${(i % 8) + 1}`
      const id = `U-${idx(u++)}`
      const landlordId = estate === 'Posh Ntinda Gardens' && i < 6 ? 'L-01' : estate === 'Posh Kololo Court' ? 'L-02' : estate === 'Posh Kyanja Townhouses' ? 'L-04' : 'L-03'
      const base = ESTATE_RENT[estate]
      const beds = base > 2500000 ? (i % 3 === 0 ? 4 : 3) : i % 2 ? 2 : 3
      const rent = Math.round((base * (0.8 + (beds - 2) * 0.15)) / 50000) * 50000
      const isDemoUnit = estate === 'Posh Naguru Heights' && name === 'B4'
      const vacant = !isDemoUnit && rnd() < 0.06
      const unit: Unit = { id, name, estate, propertyId: estate === 'Posh Naguru Heights' ? 'PP-KLA-0388' : estate === 'Posh Kololo Court' ? 'PP-KLA-0517' : undefined, beds, rent: isDemoUnit ? 2800000 : rent, service: estate === 'Posh Bukoto Flats' ? 80000 : 150000, landlordId }
      if (vacant) unit.vacantSince = `2026-${pick(['09', '10', '11'])}-${pick(['02', '09', '14', '21'])}`
      else {
        const tid = isDemoUnit ? DEMO_TENANT : `T-${idx(++t)}`
        const name2 = isDemoUnit ? 'Nakato Sarah' : `${pick(FIRST)} ${pick(GIVEN)}`
        const style = rnd()
        const history = MONTHS.map(() => (style < 0.6 ? 0 : style < 0.8 ? Math.floor(rnd() * 5) : Math.floor(rnd() * 18)))
        const tenant: Tenant = {
          id: tid, name: name2, phone: isDemoUnit ? '+256 772 300 412' : phone(), unitId: id,
          leaseStart: isDemoUnit ? '2025-09-01' : `202${pick(['4', '5'])}-0${pick(['1', '3', '6', '9'])}-01`, leaseEnd: isDemoUnit ? '2027-08-31' : `202${pick(['7', '7', '8'])}-0${pick(['2', '5', '8'])}-31`,
          wallet: isDemoUnit ? 120000 : Math.floor(rnd() * 5) * 25000, pin: '1234', history: isDemoUnit ? [0, 0, 1, 0, 0, 0] : history, diaspora: rnd() < 0.08,
        }
        unit.tenantId = tid
        db.tenants[tid] = tenant
      }
      db.units[id] = unit
    }
  }

  // Ntinda landlord L-01 should own exactly 6 units
  // ---------- Payments history ----------
  const methods: Payment['method'][] = ['MTN MoMo', 'MTN MoMo', 'MTN MoMo', 'MTN MoMo', 'Airtel Money', 'Airtel Money', 'Bank transfer', 'Bank transfer', 'Visa', 'Cash']
  let r = 88000
  for (const ten of Object.values(db.tenants)) {
    const unit = db.units[ten.unitId]
    MONTHS.forEach((m, mi) => {
      const late = ten.history[mi]
      const isNov = m === '2026-11'
      // November: some tenants haven't paid yet (makes overdue real)
      if (isNov && late > 8 && ten.id !== DEMO_TENANT) return
      const day = 1 + late
      const at = `${m}-${String(Math.min(day, 28)).padStart(2, '0')}T${String(7 + Math.floor(rnd() * 12)).padStart(2, '0')}:${String(Math.floor(rnd() * 59)).padStart(2, '0')}:00+03:00`
      const method = ten.id === DEMO_TENANT ? 'MTN MoMo' : ten.diaspora ? 'Visa' : pick(methods)
      const id = `P-${++r}`
      db.payments[id] = {
        id, receipt: `RC-${r}`, tenantId: ten.id, unitId: unit.id, month: m, amount: unit.rent + unit.service,
        lines: [{ label: 'Rent', amount: unit.rent }, { label: 'Service charge', amount: unit.service }], method,
        ref: method.includes('MoMo') ? `MP${261100 + r}` : method.includes('Airtel') ? `AM${r}X` : `TX${r}`,
        status: 'Paid', via: rnd() < 0.4 ? 'Card tap' : rnd() < 0.8 ? 'App' : 'Office', at,
      }
    })
  }

  // December rent: on-time payers often pay early (before the 1st)
  for (const ten of Object.values(db.tenants)) {
    if (ten.id === DEMO_TENANT || ten.history.some((d) => d > 1) || rnd() < 0.45) continue
    const unit = db.units[ten.unitId]
    const id = `P-${++r}`
    const day = 14 + Math.floor(rnd() * 7)
    const method = ten.diaspora ? 'Visa' : pick(methods)
    db.payments[id] = { id, receipt: `RC-${r}`, tenantId: ten.id, unitId: unit.id, month: '2026-12', amount: unit.rent + unit.service, lines: [{ label: 'Rent', amount: unit.rent }, { label: 'Service charge', amount: unit.service }], method, ref: `MP${261100 + r}`, status: 'Paid', via: rnd() < 0.45 ? 'Card tap' : 'App', at: `2026-11-${day}T${String(8 + Math.floor(rnd() * 11)).padStart(2, '0')}:${String(Math.floor(rnd() * 59)).padStart(2, '0')}:00+03:00` }
  }

  // ---------- Technicians + repairs ----------
  const techs: Technician[] = [
    { id: 'X-1', name: 'Sam Wasswa', trade: 'Plumber', phone: '+256 772 551 902', rating: 4.8, jobs: 214 },
    { id: 'X-2', name: 'Peter Opio', trade: 'Electrician', phone: '+256 701 220 118', rating: 4.7, jobs: 168 },
    { id: 'X-3', name: 'Allan Lubega', trade: 'Carpenter', phone: '+256 753 909 330', rating: 4.5, jobs: 97 },
    { id: 'X-4', name: 'Ronald Ssali', trade: 'Painter', phone: '+256 782 441 610', rating: 4.6, jobs: 120 },
    { id: 'X-5', name: 'Isaac Kiggundu', trade: 'Gate & access', phone: '+256 706 330 771', rating: 4.9, jobs: 88 },
    { id: 'X-6', name: 'Hassan Mukasa', trade: 'Plumber', phone: '+256 703 118 402', rating: 4.4, jobs: 61 },
  ]
  techs.forEach((x) => (db.technicians[x.id] = x))
  const demoUnit = Object.values(db.units).find((x) => x.tenantId === DEMO_TENANT)!
  const repairs: Repair[] = [
    { id: 'R-1041', tenantId: DEMO_TENANT, unitId: demoUnit.id, estate: demoUnit.estate, title: 'Kitchen sink leaking', category: 'Plumbing', description: 'Water dripping under the sink, cupboard getting wet.', photos: [], status: 'Booked', technicianId: 'X-1', slot: 'Thu 26 Nov, 10:00', urgent: false, createdAt: '2026-11-19T08:12:00+03:00', log: [{ at: '2026-11-19T08:12:00+03:00', text: 'Reported in the app with a photo' }, { at: '2026-11-19T09:40:00+03:00', text: 'Assigned to Sam Wasswa (plumber)' }, { at: '2026-11-19T09:41:00+03:00', text: 'Booked Thu 26 Nov, 10:00 · tenant told on WhatsApp' }] },
    { id: 'R-1032', tenantId: DEMO_TENANT, unitId: demoUnit.id, estate: demoUnit.estate, title: 'Gate remote replaced', category: 'Gate & access', description: 'Remote stopped working.', photos: [], status: 'Done', technicianId: 'X-5', urgent: false, createdAt: '2026-11-10T17:00:00+03:00', doneAt: '2026-11-12T11:00:00+03:00', cost: 45000, log: [{ at: '2026-11-12T11:00:00+03:00', text: 'Fixed, tenant confirmed' }] },
  ]
  const issues = [
    ['Power trip in corridor', 'Electrical', true], ['Blocked shower drain', 'Plumbing', false], ['Wardrobe door off hinge', 'Carpentry', false], ['Water heater not working', 'Plumbing', true], ['Damp patch on ceiling', 'Painting', false], ['Lift making noise', 'Electrical', true], ['Burst pipe at tank', 'Plumbing', true], ['Window latch broken', 'Carpentry', false], ['Socket sparking', 'Electrical', true], ['Toilet cistern running', 'Plumbing', false], ['Kitchen cabinet loose', 'Carpentry', false], ['Peeling paint, balcony', 'Painting', false], ['Gate card reader offline', 'Gate & access', true], ['Bathroom tap dripping', 'Plumbing', false], ['Security light out', 'Electrical', false],
  ] as const
  const statuses: Repair['status'][] = ['Reported', 'Reported', 'Assigned', 'Booked', 'In progress', 'Done', 'Done']
  issues.forEach(([title, cat, urgent], i) => {
    const ten = pick(Object.values(db.tenants))
    const st = statuses[i % statuses.length]
    const tech = techs.find((x) => cat.startsWith(x.trade.slice(0, 5)) || x.trade === cat || (cat === 'Painting' && x.trade === 'Painter') || (cat === 'Carpentry' && x.trade === 'Carpenter') || (cat === 'Electrical' && x.trade === 'Electrician'))
    const id = `R-${1042 + i}`
    repairs.push({ id, tenantId: ten.id, unitId: ten.unitId, estate: db.units[ten.unitId].estate, title, category: cat, description: title + '.', photos: [], status: st, technicianId: st === 'Reported' ? undefined : tech?.id, slot: st === 'Booked' ? pick(['Mon 23 Nov, 09:00', 'Tue 24 Nov, 14:00', 'Wed 25 Nov, 11:00']) : undefined, urgent, createdAt: `2026-11-${String(10 + (i % 10)).padStart(2, '0')}T10:${String(i * 3).padStart(2, '0')}:00+03:00`, doneAt: st === 'Done' ? '2026-11-18T15:00:00+03:00' : undefined, cost: st === 'Done' ? 60000 + i * 5000 : undefined, log: [{ at: `2026-11-${String(10 + (i % 10)).padStart(2, '0')}T10:00:00+03:00`, text: 'Reported in the app' }] })
  })
  repairs.forEach((x) => (db.repairs[x.id] = x))

  // ---------- Listings ----------
  const L = (l: Omit<Listing, 'agent' | 'description'> & { description?: string }): Listing => ({ agent: 'Diana Atuhaire', description: l.description ?? `${l.title} in ${l.area}. Managed and verified by Posh Properties.`, ...l })
  const listings: Listing[] = [
    L({ id: 'LS-101', title: '3-bed apartment', kind: 'Rent', area: 'Ntinda', beds: 3, baths: 2, price: 2600000, per: 'mo', features: ['Fully furnished', 'Parking', 'Generator'], verified: true, propertyId: 'PP-KLA-0820', hue: 145, tag: 'New', nearSchools: true, parking: true, generator: true }),
    L({ id: 'LS-102', title: '4-bed townhouse', kind: 'Rent', area: 'Kyanja', beds: 4, baths: 3, price: 3000000, per: 'mo', features: ['Gated', 'Garden', '2 parking'], verified: true, hue: 100, tag: 'Viewing Sat', nearSchools: true, parking: true, generator: true }),
    L({ id: 'LS-103', title: '2-bed apartment', kind: 'Rent', area: 'Naguru', beds: 2, baths: 2, price: 2200000, per: 'mo', features: ['Lift', 'Gym', 'Backup water'], verified: true, propertyId: 'PP-KLA-0388', hue: 160, parking: true, generator: true }),
    L({ id: 'LS-104', title: '3-bed apartment', kind: 'Rent', area: 'Kololo', beds: 3, baths: 3, price: 4200000, per: 'mo', features: ['Pool', 'City view', 'Staff quarters'], verified: true, propertyId: 'PP-KLA-0517', hue: 170, parking: true, generator: true }),
    L({ id: 'LS-105', title: '1-bed studio', kind: 'Rent', area: 'Bukoto', beds: 1, baths: 1, price: 1200000, per: 'mo', features: ['Near Kabira', 'Water included'], verified: true, hue: 120, parking: false }),
    L({ id: 'LS-106', title: '3-bed bungalow', kind: 'Rent', area: 'Kira', beds: 3, baths: 2, price: 1800000, per: 'mo', features: ['Compound', 'Parking'], verified: false, hue: 60, nearSchools: true, parking: true }),
    L({ id: 'LS-107', title: '3-bed duplex', kind: 'Rent', area: 'Ntinda', beds: 3, baths: 3, price: 2900000, per: 'mo', features: ['Gated', 'Generator', 'Near schools'], verified: true, hue: 135, nearSchools: true, parking: true, generator: true }),
    L({ id: 'LS-108', title: '4-bed house', kind: 'Rent', area: 'Kyanja', beds: 4, baths: 4, price: 2800000, per: 'mo', features: ['Garden', 'Borehole', 'Generator'], verified: true, hue: 90, nearSchools: true, parking: true, generator: true }),
    L({ id: 'LS-201', title: '4-bed bungalow', kind: 'Buy', area: 'Najjera II', beds: 4, baths: 3, price: 780000000, features: ['Title checked', 'Valued', 'Mortgage OK'], verified: true, propertyId: 'PP-KLA-0631', hue: 95, tag: 'Mortgage OK' }),
    L({ id: 'LS-202', title: '5-bed house', kind: 'Buy', area: 'Muyenga', beds: 5, baths: 5, price: 2300000000, features: ['Lake view', '0.3 acre', 'Pool'], verified: true, propertyId: 'PP-KLA-0950', hue: 50 }),
    L({ id: 'LS-203', title: '4-bed villa', kind: 'Buy', area: 'Munyonyo', beds: 4, baths: 4, price: 1650000000, features: ['Off-plan', 'Lakeside', 'Completion 2027'], verified: true, propertyId: 'PP-MUK-0204', hue: 200, tag: 'Off-plan' }),
    L({ id: 'LS-204', title: '3-bed apartment', kind: 'Buy', area: 'Ntinda', beds: 3, baths: 2, price: 520000000, features: ['Condo title', 'Lift'], verified: true, propertyId: 'PP-KLA-0820', hue: 130 }),
    L({ id: 'LS-301', title: 'Residential plot', kind: 'Land', area: 'Gayaza', price: 95000000, features: ['50 x 100 ft', 'Mailo title', 'Survey done'], verified: true, propertyId: 'PP-KLA-0905', hue: 80 }),
    L({ id: 'LS-302', title: '1-acre plot', kind: 'Land', area: 'Matugga', price: 260000000, features: ['Freehold', 'Road access'], verified: true, hue: 70 }),
    L({ id: 'LS-303', title: 'Plot near Entebbe Rd', kind: 'Land', area: 'Kajjansi', price: 140000000, features: ['50 x 100 ft', 'Title pending'], verified: false, hue: 75 }),
    L({ id: 'LS-401', title: 'Ground-floor shop', kind: 'Commercial', area: 'Kasangati', price: 1500000, per: 'mo', features: ['Gayaza Rd frontage', 'Parking'], verified: true, propertyId: 'PP-KLA-0712', hue: 20 }),
    L({ id: 'LS-402', title: 'Office floor, 220 m²', kind: 'Commercial', area: 'Bukoto', price: 8800000, per: 'mo', features: ['Kira Rd', 'Lift', 'Fibre'], verified: true, hue: 210 }),
    L({ id: 'LS-501', title: 'Furnished 2-bed', kind: 'Short stay', area: 'Kololo', beds: 2, baths: 2, price: 280000, per: 'night', features: ['Wi-Fi', 'Cleaner', 'Airport pickup'], verified: true, hue: 175 }),
    L({ id: 'LS-502', title: 'Lake-view studio', kind: 'Short stay', area: 'Munyonyo', beds: 1, baths: 1, price: 190000, per: 'night', features: ['Pool', 'Wi-Fi'], verified: true, hue: 195 }),
  ]
  listings.forEach((x) => (db.listings[x.id] = x))

  const viewings: Viewing[] = [
    { id: 'V-301', listingId: 'LS-102', name: 'Juliet Nantongo', phone: '+256 774 220 901', date: 'Sat 21 Nov', time: '10:00', status: 'Confirmed', createdAt: '2026-11-18T12:00:00+03:00', agent: 'Diana Atuhaire' },
    { id: 'V-302', listingId: 'LS-201', name: 'Edward Asiimwe', phone: '+256 701 909 112', date: 'Sat 21 Nov', time: '11:30', status: 'Confirmed', createdAt: '2026-11-19T09:00:00+03:00', agent: 'Diana Atuhaire' },
    { id: 'V-303', listingId: 'LS-104', name: 'Sharon Auma', phone: '+256 782 300 554', date: 'Mon 23 Nov', time: '16:00', status: 'Requested', createdAt: '2026-11-20T08:30:00+03:00', agent: 'Diana Atuhaire' },
  ]
  viewings.forEach((x) => (db.viewings[x.id] = x))

  // ---------- Cards ----------
  const cards: Card[] = [
    { id: 'PC-0412-B4-7781', uid: DEMO_UID, type: 'Tenant', holder: 'Nakato Sarah', holderId: DEMO_TENANT, unitId: demoUnit.id, access: ['Main gate', 'Lift', 'Gym', 'Pay rent'], status: 'Active', issued: '2025-09-01', lastTap: '2026-11-20T07:41:00+03:00' },
    { id: 'PL-KLA-0412', uid: undefined, type: 'Plaque', holder: 'Gate plaque · Kiwatule villa', propertyId: 'PP-KLA-0412', access: ['Verify'], status: 'Genuine', issued: '2025-03-03', lastTap: '2026-11-20T11:02:00+03:00' },
    { id: 'PL-KLA-0388', type: 'Plaque', holder: 'Gate plaque · Naguru Heights', propertyId: 'PP-KLA-0388', access: ['Verify'], status: 'Genuine', issued: '2023-01-10' },
    { id: 'PL-KLA-0631', type: 'Plaque', holder: 'Gate plaque · Najjera bungalow', propertyId: 'PP-KLA-0631', access: ['Verify'], status: 'Genuine', issued: '2026-09-01' },
    { id: 'ST-0003-OKELLO', type: 'Staff', holder: 'Eng. Paul Okello', access: ['All sites'], status: 'Active', issued: '2024-01-04' },
    { id: 'ST-0004-KIZZA', type: 'Staff', holder: 'Moses Kizza', access: ['Naguru Heights', 'Checkpoints'], status: 'Active', issued: '2024-02-12' },
  ]
  let cn = 7782
  Object.values(db.tenants).filter((x) => x.id !== DEMO_TENANT).forEach((ten, i) => {
    const unit = db.units[ten.unitId]
    const id = `PC-${String(400 + i).padStart(4, '0')}-${unit.name}-${cn++}`
    const lateNov = ten.history[5] > 8
    cards.push({ id, type: 'Tenant', holder: ten.name, holderId: ten.id, unitId: unit.id, access: ['Main gate', 'Pay rent'], status: i % 37 === 5 ? 'Blocked' : lateNov ? 'Grace period' : 'Active', issued: ten.leaseStart })
    ten.cardId = id
  })
  db.tenants[DEMO_TENANT].cardId = 'PC-0412-B4-7781'
  cards.forEach((c) => (db.cards[c.id] = c))

  // ---------- Taps ----------
  const places = ['Naguru Heights · main gate', 'Kololo Court · gate', 'Ntinda Gardens · gate', 'Bukoto Flats · gate', 'Naguru Heights · lift', 'Kyanja · gate']
  const taps: Tap[] = []
  for (let i = 0; i < 26; i++) {
    const c = pick(cards.filter((x) => x.type === 'Tenant'))
    taps.push({ id: `TP-${5000 + i}`, cardId: c.id, kind: 'Gate', place: pick(places), at: `2026-11-20T${String(6 + Math.floor(i / 3)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00+03:00`, result: c.status === 'Blocked' ? 'Refused' : 'OK', who: c.holder })
  }
  taps.push({ id: 'TP-6001', cardId: 'PL-KLA-0412', kind: 'Plaque', place: 'Kiwatule villa gate', at: '2026-11-20T11:02:00+03:00', result: 'OK', who: 'Visitor phone (Android)' })
  taps.push({ id: 'TP-6002', cardId: 'PL-KLA-0631', kind: 'Plaque', place: 'Najjera bungalow', at: '2026-11-20T09:15:00+03:00', result: 'OK', who: 'Buyer phone (iPhone)' })
  taps.forEach((x) => (db.taps[x.id] = x))

  // ---------- Construction sites ----------
  const sites: Site[] = [
    { id: 'SITE-77', name: 'Kira-Mulawa 77', client: 'Joan Atuhaire', clientPhone: '+44 7700 900 118', propertyId: 'PP-WAK-0077', manager: 'Eng. Paul Okello', progress: 62, started: '2026-03-10', handover: '2027-06-30', daysLate: 0, budget: 640000000, paid: 384000000, photos: 212,
      stages: [
        { name: 'Foundation', amount: 96000000, status: 'Paid', paidOn: '2026-04-02', method: 'UK card' },
        { name: 'Ring beam and walls', amount: 160000000, status: 'Paid', paidOn: '2026-10-02', method: 'UK card · GBP 18,400' },
        { name: 'Roofing', amount: 128000000, status: 'Due', paidOn: undefined },
        { name: 'Finishes', amount: 160000000, status: 'Upcoming' },
        { name: 'Handover', amount: 96000000, status: 'Upcoming' },
      ],
      materials: [{ item: 'Cement (Hima)', qty: '120 bags', status: 'Delivered' }, { item: 'Steel Y12', qty: '2.4 tonnes', status: 'En route' }, { item: 'Roofing sheets', qty: '180 pcs', status: 'Ordered' }, { item: 'Sand', qty: '3 trips', status: 'Low' }],
      tasks: [{ id: 't1', text: 'Cast roof slab, east wing', done: false }, { id: 't2', text: 'Curing, west wing slab', done: true }, { id: 't3', text: 'Electrical conduits, first floor', done: false }, { id: 't4', text: 'Plumbing sleeves before slab', done: true }],
      issues: [{ id: 'i1', text: 'Steel delivery delayed by 1 day (Jinja Rd traffic)', at: '2026-11-20T08:20:00+03:00', open: true }],
      updates: [{ at: '2026-11-19T17:00:00+03:00', text: 'Roof slab formwork 80% done. Pour planned Monday.' }, { at: '2026-11-15T16:30:00+03:00', text: 'First floor walls complete.' }] },
    { id: 'SITE-MV', name: 'Munyonyo Villas B', client: 'Posh Properties Ltd', clientPhone: '+256 414 662954', propertyId: 'PP-MUK-0204', manager: 'Eng. Paul Okello', progress: 41, started: '2026-01-15', handover: '2027-09-30', daysLate: 0, budget: 3100000000, paid: 1200000000, photos: 330, stages: [], materials: [{ item: 'Blocks', qty: '9,000', status: 'Delivered' }], tasks: [], issues: [], updates: [] },
    { id: 'SITE-GR', name: 'Gayaza Rd shops', client: 'Mukasa Holdings', clientPhone: '+256 772 001 223', propertyId: 'PP-KLA-0712', manager: 'Ivan Byaruhanga', progress: 55, started: '2026-02-01', handover: '2026-12-20', daysLate: 9, budget: 1400000000, paid: 760000000, photos: 120, stages: [], materials: [], tasks: [], issues: [{ id: 'i2', text: 'Caveat on title: boundary dispute', at: '2026-06-02T10:00:00+03:00', open: true }], updates: [] },
    { id: 'SITE-EK', name: 'Entebbe Kitoro 3', client: 'Posh Properties Ltd', clientPhone: '+256 414 662954', propertyId: 'PP-ENT-0103', manager: 'Brenda Kyomugisha', progress: 28, started: '2026-05-04', handover: '2027-03-31', daysLate: 3, budget: 900000000, paid: 260000000, photos: 61, stages: [], materials: [], tasks: [], issues: [], updates: [] },
  ]
  const extraSites = ['Kyanja TH phase 2', 'Bukoto Flats annex', 'Lubowa villa 12', 'Kiwatule Close 9', 'Naalya bungalow', 'Gulu Rd warehouse', 'Matugga estate roads', 'Namugongo villa', 'Seeta duplex', 'Mukono apartments']
  extraSites.forEach((n, i) => sites.push({ id: `SITE-${i + 10}`, name: n, client: `${pick(FIRST)} ${pick(GIVEN)}`, clientPhone: phone(), manager: pick(['Eng. Paul Okello', 'Ivan Byaruhanga', 'Brenda Kyomugisha']), progress: 10 + Math.floor(rnd() * 80), started: '2026-0' + (1 + (i % 8)) + '-01', handover: '2027-0' + (1 + (i % 8)) + '-28', daysLate: 0, budget: 300000000 + Math.floor(rnd() * 900) * 1000000, paid: 0, photos: 20 + Math.floor(rnd() * 100), stages: [], materials: [], tasks: [], issues: [], updates: [] }))
  sites.forEach((x) => (db.sites[x.id] = x))

  const trades = ['Mason', 'Mason', 'Mason', 'Porter', 'Porter', 'Steel fixer', 'Carpenter', 'Electrician', 'Plumber']
  for (let i = 0; i < 16; i++) {
    const w: Worker = { id: `W-${100 + i}`, siteId: 'SITE-77', name: `${pick(FIRST)} ${pick(GIVEN)}`, trade: trades[i % trades.length], wage: [35000, 40000, 50000, 60000][i % 4], phone: phone() }
    if (i < 14) { w.in = `2026-11-20T0${7 + (i === 3 ? 1 : 0)}:${String(5 + i * 2).padStart(2, '0')}:00+03:00`; if (i === 3) w.late = true }
    db.workers[w.id] = w
  }

  // ---------- Valuations ----------
  const vals: Valuation[] = [
    { id: 'VAL-118', propertyId: 'PP-KLA-0412', client: 'Henry Mukasa', purpose: 'Mortgage', bank: 'Stanbic', value: 1450000000, status: 'Done', due: '2026-11-04', valuer: 'Posh Valuers' },
    { id: 'VAL-121', propertyId: 'PP-KLA-0820', client: 'Kato Ssekandi', purpose: 'Mortgage', bank: 'dfcu', status: 'Inspection', due: '2026-11-21', valuer: 'Posh Valuers' },
    { id: 'VAL-122', propertyId: 'PP-KLA-0950', client: 'Patience Nabirye', purpose: 'Sale', bank: 'Absa', value: 2300000000, status: 'Report', due: '2026-11-24', valuer: 'Posh Valuers' },
    { id: 'VAL-123', propertyId: 'PP-KLA-0905', client: 'Posh Properties Ltd', purpose: 'Listing', status: 'Requested', due: '2026-11-27', valuer: 'Posh Valuers' },
  ]
  for (let i = 0; i < 19; i++) vals.push({ id: `VAL-${130 + i}`, propertyId: pick(props).id, client: `${pick(FIRST)} ${pick(GIVEN)}`, purpose: pick(['Mortgage', 'Mortgage', 'Sale', 'Insurance', 'Probate']), bank: pick(['Stanbic', 'Absa', 'dfcu', 'Centenary', undefined as unknown as string]), status: pick(['Requested', 'Inspection', 'Report', 'Done']), due: `2026-11-${String(21 + (i % 9)).padStart(2, '0')}`, valuer: 'Posh Valuers' })
  vals.forEach((x) => (db.valuations[x.id] = x))

  const mort: Mortgage = { id: 'PHF-2291', applicant: 'Edward Asiimwe', phone: '+256 701 909 112', propertyId: 'PP-KLA-0631', price: 780000000, amount: 546000000, years: 15, step: 3,
    offers: [{ bank: 'Stanbic', rate: 15.5, monthly: 7820000 }, { bank: 'Absa', rate: 16.25, monthly: 8060000 }, { bank: 'dfcu', rate: 16.5, monthly: 8140000 }],
    docs: [{ name: 'National ID', done: true }, { name: '6 months bank statements', done: true }, { name: 'Employment letter', done: true }, { name: 'Title search', done: true }, { name: 'Valuation report', done: true }, { name: 'Signed offer', done: false }] }
  db.mortgages[mort.id] = mort
  db.mortgages['PHF-2288'] = { id: 'PHF-2288', applicant: 'Patience Nabirye', phone: '+256 772 640 811', propertyId: 'PP-KLA-0950', price: 2300000000, amount: 1380000000, years: 20, step: 4, offers: [{ bank: 'Absa', rate: 15.75, monthly: 18200000, chosen: true }], docs: [{ name: 'National ID', done: true }, { name: 'Signed offer', done: true }] }

  // ---------- Deals (sales pipeline) ----------
  const stages: Deal['stage'][] = ['Enquiry', 'Enquiry', 'Enquiry', 'Viewing', 'Viewing', 'Offer', 'Closed']
  for (let i = 0; i < 42; i++) {
    const l = pick(listings.filter((x) => x.kind === 'Buy' || x.kind === 'Land' || x.kind === 'Rent'))
    db.deals[`D-${700 + i}`] = { id: `D-${700 + i}`, client: `${pick(FIRST)} ${pick(GIVEN)}`, phone: phone(), listingId: l.id, title: `${l.title} · ${l.area}`, stage: stages[i % stages.length], value: l.per ? l.price * 12 * 0.1 : l.price * 0.05, agent: pick(['Diana Atuhaire', 'Grace Namubiru']), updated: `2026-11-${String(1 + (i % 19)).padStart(2, '0')}T12:00:00+03:00`, source: pick(['WhatsApp', 'App', 'Walk-in', 'Facebook', 'Plaque tap']) }
  }

  // ---------- Caretaker checkpoints ----------
  const cps = ['Main gate', 'Generator room', 'Water tank', 'Lift motor room', 'Parking B', 'Rooftop', 'Waste area']
  cps.forEach((n, i) => (db.checkpoints[`CP-${i + 1}`] = { id: `CP-${i + 1}`, estate: 'Posh Naguru Heights', name: n, done: i < 5, at: i < 5 ? `2026-11-20T0${6 + i}:${10 + i * 7}:00+03:00` : undefined, reading: n === 'Generator room' ? 'Fuel 31%' : n === 'Water tank' ? 'Tank 82%' : undefined }))

  // ---------- Messages ----------
  const msgs: Message[] = [
    { id: 'M-1', to: 'Nakato Sarah', phone: '+256 772 300 412', channel: 'WhatsApp', text: 'Posh: Your plumber Sam is booked for Thu 26 Nov, 10:00 for "Kitchen sink leaking".', at: '2026-11-19T09:41:00+03:00', kind: 'repair' },
  ]
  msgs.forEach((x) => (db.messages[x.id] = x))

  // ---------- Suppliers ----------
  const sups = [
    ['SUP-1', 'Hima Cement depot, Kireka', 'Building materials', '+256 772 400 120', 'Ronald'],
    ['SUP-2', 'Roofings Ltd, Namanve', 'Steel & roofing', '+256 414 288 900', 'Sales desk'],
    ['SUP-3', 'Shell Bukoto', 'Fuel', '+256 701 330 455', 'Station manager'],
    ['SUP-4', 'Kampala Sand & Aggregates', 'Building materials', '+256 782 900 311', 'Moses'],
    ['SUP-5', 'Umeme / Yaka', 'Utilities', '0800 285 285', 'Customer care'],
    ['SUP-6', 'NWSC', 'Utilities', '0800 200 977', 'Customer care'],
    ['SUP-7', 'Game Stores Lugogo', 'Office supplies', '+256 312 200 700', 'Business desk'],
    ['SUP-8', 'Sam Wasswa Plumbing', 'Repairs contractor', '+256 772 551 902', 'Sam'],
  ]
  sups.forEach(([id, name, category, ph, contact]) => (db.suppliers[id] = { id, name, category, phone: ph, contact, terms: category === 'Utilities' ? 'Prepaid' : '30 days' }))

  // ---------- Finance: receipts (money in) and vouchers (money out) ----------
  let rn = 5100, vn = 2200
  const T = (t: Omit<Txn, 'id' | 'no' | 'paid' | 'status' | 'total'> & { paid?: number }) => {
    const total = t.lines.reduce((a, l) => a + l.qty * l.price, 0)
    const no = t.dir === 'in' ? `SR-${++rn}` : `PV-${++vn}`
    db.txns[no] = { id: no, no, total, paid: t.paid ?? total, status: (t.paid ?? total) < total ? 'Part' : 'Paid', ...t }
  }
  T({ dir: 'in', category: 'Property sale deposit', business: 'Sales', party: 'Edward Asiimwe', phone: '+256 701 909 112', lines: [{ desc: '10% deposit · 4-bed bungalow, Najjera II (PP-KLA-0631)', qty: 1, price: 78000000 }], method: 'Bank transfer', ref: 'STB-778120', at: '2026-11-12T11:20:00+03:00', by: 'Diana Atuhaire', propertyId: 'PP-KLA-0631' })
  T({ dir: 'in', category: 'Plot sale', business: 'Sales', party: 'Faith Nalwoga', phone: '+256 774 118 902', lines: [{ desc: 'Residential plot, Gayaza Hills 50x100 · full payment', qty: 1, price: 95000000 }], method: 'Bank transfer', ref: 'CEN-44102', at: '2026-11-06T15:05:00+03:00', by: 'Diana Atuhaire', propertyId: 'PP-KLA-0905' })
  T({ dir: 'in', category: 'Sales commission', business: 'Sales', party: 'Patience Nabirye', phone: '+256 772 640 811', lines: [{ desc: 'Agency commission 3% · Muyenga house', qty: 1, price: 69000000 }], paid: 34500000, method: 'Bank transfer', ref: 'ABS-99012', at: '2026-11-15T10:00:00+03:00', by: 'Hajji Issa Bukenya' })
  T({ dir: 'in', category: 'Construction stage', business: 'Construction', party: 'Joan Atuhaire', phone: '+44 7700 900 118', lines: [{ desc: 'Ring beam and walls stage · Kira-Mulawa 77', qty: 1, price: 160000000 }], method: 'Visa', ref: 'VISA-3DS-55120', at: '2026-10-02T09:10:00+03:00', by: 'Eng. Paul Okello' })
  T({ dir: 'in', category: 'Valuation fee', business: 'Valuation', party: 'Henry Mukasa', phone: '+44 7700 900 412', lines: [{ desc: 'Valuation report for Stanbic · PP-KLA-0412', qty: 1, price: 2900000 }], method: 'MTN MoMo', ref: 'MP2611048812', at: '2026-11-04T16:40:00+03:00', by: 'Grace Namubiru' })
  T({ dir: 'in', category: 'Survey fee', business: 'Survey', party: 'Mukasa Holdings', phone: '+256 772 001 223', lines: [{ desc: 'Boundary opening, Gayaza Rd plot', qty: 1, price: 1800000 }], method: 'Cash', ref: 'CASH', at: '2026-11-18T12:30:00+03:00', by: 'Grace Namubiru' })
  T({ dir: 'in', category: 'Mortgage advisory fee', business: 'Finance', party: 'Edward Asiimwe', phone: '+256 701 909 112', lines: [{ desc: 'Posh Home Finance arrangement fee (PHF-2291)', qty: 1, price: 2500000 }], method: 'Airtel Money', ref: 'AM26110871X', at: '2026-11-17T14:15:00+03:00', by: 'Grace Namubiru' })
  T({ dir: 'in', category: 'Short stay', business: 'Management', party: 'Michael Ochieng', phone: '+254 722 300 118', lines: [{ desc: 'Furnished 2-bed Kololo · nights', qty: 4, price: 280000 }], method: 'Mastercard', ref: 'MC-88121', at: '2026-11-19T19:30:00+03:00', by: 'Grace Namubiru' })
  T({ dir: 'out', category: 'Building materials', business: 'Construction', party: 'Hima Cement depot, Kireka', supplierId: 'SUP-1', lines: [{ desc: 'Hima cement 50kg', qty: 120, price: 34000 }], method: 'Bank transfer', ref: 'STB-OUT-1182', at: '2026-11-19T08:30:00+03:00', by: 'Eng. Paul Okello', note: 'Kira-Mulawa 77 roof slab' })
  T({ dir: 'out', category: 'Building materials', business: 'Construction', party: 'Roofings Ltd, Namanve', supplierId: 'SUP-2', lines: [{ desc: 'Steel Y12 bars (tonne)', qty: 2.4, price: 4200000 }], method: 'Bank transfer', ref: 'STB-OUT-1185', at: '2026-11-20T09:00:00+03:00', by: 'Eng. Paul Okello' })
  T({ dir: 'out', category: 'Fuel', business: 'Management', party: 'Shell Bukoto', supplierId: 'SUP-3', lines: [{ desc: 'Diesel for Naguru Heights generator (litres)', qty: 200, price: 5150 }], method: 'MTN MoMo', ref: 'MP2611190033', at: '2026-11-19T10:20:00+03:00', by: 'Moses Kizza' })
  T({ dir: 'out', category: 'Utilities', business: 'Management', party: 'Umeme / Yaka', supplierId: 'SUP-5', lines: [{ desc: 'Yaka units, common areas Naguru Heights', qty: 1, price: 300000 }], method: 'MTN MoMo', ref: 'YK-55120988', at: '2026-11-16T07:45:00+03:00', by: 'Moses Kizza' })
  T({ dir: 'out', category: 'Repairs', business: 'Management', party: 'Sam Wasswa Plumbing', supplierId: 'SUP-8', lines: [{ desc: 'Plumbing jobs (Nov week 2)', qty: 3, price: 85000 }], method: 'MTN MoMo', ref: 'MP2611150912', at: '2026-11-15T17:00:00+03:00', by: 'Grace Namubiru' })
  T({ dir: 'out', category: 'Wages', business: 'Construction', party: 'Site crew · Kira-Mulawa 77', lines: [{ desc: 'Daily wages (workers x days)', qty: 14 * 5, price: 45000 }], method: 'MTN MoMo', ref: 'BULK-2611-14', at: '2026-11-14T17:30:00+03:00', by: 'Eng. Paul Okello' })
  T({ dir: 'out', category: 'Office supplies', business: 'Office', party: 'Game Stores Lugogo', supplierId: 'SUP-7', lines: [{ desc: 'Printer paper (reams)', qty: 10, price: 28000 }, { desc: 'Thermal receipt rolls', qty: 20, price: 6500 }, { desc: 'Toner cartridge', qty: 1, price: 380000 }], method: 'Cash', ref: 'CASH', at: '2026-11-11T13:00:00+03:00', by: 'Grace Namubiru' })
  T({ dir: 'out', category: 'Blank NFC cards', business: 'Office', party: 'Card supplier (NTAG213)', lines: [{ desc: 'NTAG213 PVC cards', qty: 500, price: 3500 }, { desc: 'Metal plaques with NFC', qty: 50, price: 45000 }], method: 'Bank transfer', ref: 'STB-OUT-1170', at: '2026-11-08T11:00:00+03:00', by: 'Hajji Issa Bukenya' })
  T({ dir: 'out', category: 'Salaries', business: 'Office', party: 'Posh staff payroll · October', lines: [{ desc: 'Net salaries', qty: 1, price: 38500000 }, { desc: 'PAYE and NSSF', qty: 1, price: 9200000 }], method: 'Bank transfer', ref: 'PAYROLL-2610', at: '2026-10-28T10:00:00+03:00', by: 'Hajji Issa Bukenya' })

  // ---------- Invoices ----------
  const inv = (i: Omit<Invoice, 'total' | 'status'>) => { const total = i.lines.reduce((a, l) => a + l.qty * l.price, 0); db.invoices[i.id] = { ...i, total, status: i.paid >= total ? 'Paid' : i.paid > 0 ? 'Part' : 'Unpaid' } }
  inv({ id: 'INV-3101', no: 'INV-3101', party: 'Joan Atuhaire', phone: '+44 7700 900 118', business: 'Construction', lines: [{ desc: 'Roofing stage · Kira-Mulawa 77', qty: 1, price: 128000000 }], paid: 0, due: '2026-11-30', createdAt: '2026-11-16T10:00:00+03:00', by: 'Eng. Paul Okello', propertyId: 'PP-WAK-0077' })
  inv({ id: 'INV-3102', no: 'INV-3102', party: 'Kato Ssekandi', phone: '+256 772 118 440', business: 'Valuation', lines: [{ desc: 'Valuation for dfcu Bank · Ntinda apartment', qty: 1, price: 2400000 }], paid: 0, due: '2026-11-28', createdAt: '2026-11-18T09:00:00+03:00', by: 'Grace Namubiru', propertyId: 'PP-KLA-0820' })
  inv({ id: 'INV-3103', no: 'INV-3103', party: 'Patience Nabirye', phone: '+256 772 640 811', business: 'Sales', lines: [{ desc: 'Agency commission 3% · Muyenga house', qty: 1, price: 69000000 }], paid: 34500000, due: '2026-12-15', createdAt: '2026-11-10T09:00:00+03:00', by: 'Hajji Issa Bukenya' })
  inv({ id: 'INV-3104', no: 'INV-3104', party: 'Mukasa Holdings', phone: '+256 772 001 223', business: 'Construction', lines: [{ desc: 'Shell completion · Gayaza Rd shops', qty: 1, price: 210000000 }, { desc: 'Variation: extra parking slab', qty: 1, price: 18500000 }], paid: 0, due: '2026-11-20', createdAt: '2026-10-20T09:00:00+03:00', by: 'Eng. Paul Okello' })

  db.audit['A-1'] = { id: 'A-1', at: '2026-11-20T08:02:00+03:00', who: 'Grace Namubiru', action: 'Signed in to Posh Office', area: 'Login' }
  return db
}

export const ESTATE_LIST = ESTATES
export const ESTATE_AREA = AREA
