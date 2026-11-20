export type Biz = 'Sales' | 'Construction' | 'Management' | 'Valuation' | 'Finance' | 'Survey'

export interface TimelineItem { date: string; biz: Biz; title: string; detail: string }

export interface Property {
  id: string // passport code e.g. PP-KLA-0412
  title: string
  kind: string
  estate: string
  area: string
  beds?: number
  baths?: number
  size: string
  built?: string
  value: number
  valueChange: number
  stage: Biz
  titleStatus: 'Clean' | 'Caveat' | 'Pending'
  titleNo: string
  owner: string
  agent: string
  plaqueUid?: string
  photos: number
  hue: number
  issued: string
  timeline: TimelineItem[]
  tenancy?: string
}

export interface Landlord { id: string; name: string; phone: string; area: string; payoutDay: number }

export interface Unit {
  id: string
  name: string
  estate: string
  propertyId?: string
  beds: number
  rent: number
  service: number
  tenantId?: string
  landlordId: string
  vacantSince?: string
}

export interface Tenant {
  id: string
  name: string
  phone: string
  unitId: string
  leaseStart: string
  leaseEnd: string
  cardId?: string
  wallet: number
  pin: string
  history: number[] // days late for past months, oldest first
  diaspora?: boolean
  family?: string
}

export type PayMethod = 'MTN MoMo' | 'Airtel Money' | 'Visa' | 'Mastercard' | 'Bank transfer' | 'Posh Wallet' | 'Cash'

export interface Payment {
  id: string
  receipt: string
  tenantId: string
  unitId: string
  month: string // e.g. 2026-12
  amount: number
  lines: { label: string; amount: number }[]
  method: PayMethod
  ref: string
  status: 'Paid' | 'Part' | 'Pending' | 'Failed'
  via: 'Card tap' | 'App' | 'Office' | 'USSD'
  at: string
  part?: string
}

export interface Technician { id: string; name: string; trade: string; phone: string; rating: number; jobs: number }

export interface Repair {
  id: string
  tenantId?: string
  unitId?: string
  estate: string
  title: string
  category: string
  description: string
  photos: string[]
  status: 'Reported' | 'Assigned' | 'Booked' | 'In progress' | 'Done'
  technicianId?: string
  slot?: string
  urgent: boolean
  createdAt: string
  doneAt?: string
  cost?: number
  log: { at: string; text: string }[]
}

export interface Listing {
  id: string
  title: string
  kind: 'Rent' | 'Buy' | 'Land' | 'Commercial' | 'Short stay'
  area: string
  beds?: number
  baths?: number
  price: number
  per?: 'mo' | 'night'
  features: string[]
  verified: boolean
  propertyId?: string
  hue: number
  tag?: string
  agent: string
  description: string
  nearSchools?: boolean
  parking?: boolean
  generator?: boolean
}

export interface Viewing {
  id: string
  listingId: string
  name: string
  phone: string
  date: string
  time: string
  status: 'Requested' | 'Confirmed' | 'Done' | 'Cancelled'
  createdAt: string
  agent: string
  note?: string
}

export interface Card {
  id: string // printed number e.g. PC-0412-B4-7781
  uid?: string // NFC serial
  type: 'Tenant' | 'Staff' | 'Plaque' | 'Worker'
  holder: string
  holderId?: string
  unitId?: string
  propertyId?: string
  access: string[]
  status: 'Active' | 'Blocked' | 'Grace period' | 'New' | 'Genuine'
  issued: string
  lastTap?: string
}

export interface Tap {
  id: string
  cardId?: string
  uid?: string
  kind: 'Gate' | 'Plaque' | 'Pay' | 'Clock-in' | 'Clock-out' | 'Checkpoint'
  place: string
  at: string
  result: 'OK' | 'Refused' | 'Unknown card'
  who?: string
}

export interface Site {
  id: string
  name: string
  client: string
  clientPhone: string
  propertyId?: string
  manager: string
  progress: number
  started: string
  handover: string
  daysLate: number
  budget: number
  paid: number
  photos: number
  stages: { name: string; amount: number; status: 'Paid' | 'Due' | 'Upcoming'; paidOn?: string; method?: string }[]
  materials: { item: string; qty: string; status: 'Delivered' | 'En route' | 'Ordered' | 'Low' }[]
  tasks: { id: string; text: string; done: boolean }[]
  issues: { id: string; text: string; at: string; open: boolean; photo?: string }[]
  updates: { at: string; text: string; photo?: string }[]
}

export interface Worker { id: string; siteId: string; name: string; trade: string; wage: number; phone: string; in?: string; out?: string; late?: boolean }

export interface Valuation { id: string; propertyId: string; client: string; purpose: string; bank?: string; value?: number; status: 'Requested' | 'Inspection' | 'Report' | 'Done'; due: string; valuer: string }

export interface Mortgage {
  id: string
  applicant: string
  phone: string
  propertyId: string
  price: number
  amount: number
  years: number
  step: number
  offers: { bank: string; rate: number; monthly: number; chosen?: boolean }[]
  docs: { name: string; done: boolean }[]
}

export interface Deal { id: string; client: string; phone: string; listingId?: string; title: string; stage: 'Enquiry' | 'Viewing' | 'Offer' | 'Closed'; value: number; agent: string; updated: string; source: string }

export interface Checkpoint { id: string; estate: string; name: string; done: boolean; at?: string; note?: string; reading?: string; photo?: string }

export interface Message { id: string; to: string; phone?: string; channel: 'WhatsApp' | 'SMS' | 'Email'; text: string; at: string; kind: string }

export interface Staff { id: string; name: string; role: string; email: string; pin: string; phone: string }

export interface Line { desc: string; qty: number; price: number }
export type Money = 'MTN MoMo' | 'Airtel Money' | 'Visa' | 'Mastercard' | 'Bank transfer' | 'Cash' | 'Cheque' | 'Posh Wallet'

/** Any money in (receipt) or out (payment voucher) that is not tenant rent. */
export interface Txn {
  id: string
  no: string
  dir: 'in' | 'out'
  category: string
  business: string
  party: string
  phone?: string
  lines: Line[]
  total: number
  paid: number
  method: Money
  ref: string
  status: 'Paid' | 'Part'
  at: string
  by: string
  note?: string
  photo?: string
  invoiceId?: string
  propertyId?: string
  supplierId?: string
  tendered?: number
  change?: number
  payer?: string
}

export interface Invoice { id: string; no: string; party: string; phone: string; business: string; lines: Line[]; total: number; paid: number; due: string; status: 'Unpaid' | 'Part' | 'Paid'; createdAt: string; by: string; propertyId?: string }
export interface Supplier { id: string; name: string; category: string; phone: string; contact: string; terms: string }
export interface Audit { id: string; at: string; who: string; action: string; area: string }

export interface DB {
  properties: Record<string, Property>
  landlords: Record<string, Landlord>
  units: Record<string, Unit>
  tenants: Record<string, Tenant>
  payments: Record<string, Payment>
  technicians: Record<string, Technician>
  repairs: Record<string, Repair>
  listings: Record<string, Listing>
  viewings: Record<string, Viewing>
  cards: Record<string, Card>
  taps: Record<string, Tap>
  sites: Record<string, Site>
  workers: Record<string, Worker>
  valuations: Record<string, Valuation>
  mortgages: Record<string, Mortgage>
  deals: Record<string, Deal>
  checkpoints: Record<string, Checkpoint>
  messages: Record<string, Message>
  staff: Record<string, Staff>
  txns: Record<string, Txn>
  invoices: Record<string, Invoice>
  suppliers: Record<string, Supplier>
  audit: Record<string, Audit>
}

export type Kind = keyof DB
export const KINDS: Kind[] = ['properties', 'landlords', 'units', 'tenants', 'payments', 'technicians', 'repairs', 'listings', 'viewings', 'cards', 'taps', 'sites', 'workers', 'valuations', 'mortgages', 'deals', 'checkpoints', 'messages', 'staff', 'txns', 'invoices', 'suppliers', 'audit']
