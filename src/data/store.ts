import { create } from 'zustand'
import { createClient, type SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js'
import type { DB, Kind } from './types'
import { KINDS } from './types'
import { makeSeed } from './seed'
import { CONFIG } from '../config'

type Status = 'loading' | 'live' | 'local' | 'offline'

interface Store {
  db: DB
  status: Status
  ready: boolean
  lastChange?: { kind: Kind; id: string; at: number }
  put: <K extends Kind>(kind: K, rec: DB[K][string]) => void
  patch: <K extends Kind>(kind: K, id: string, p: Partial<DB[K][string]>) => void
  remove: (kind: Kind, id: string) => void
  reset: () => Promise<void>
}

const LS_KEY = 'posh.db.v1'
const empty = (): DB => Object.fromEntries(KINDS.map((k) => [k, {}])) as unknown as DB

let sb: SupabaseClient | null = null
let channel: RealtimeChannel | null = null
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('posh-sync') : null

function saveLocal(db: DB) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(db)) } catch { /* quota / private mode */ }
}
function loadLocal(): DB | null {
  try { const s = localStorage.getItem(LS_KEY); return s ? (JSON.parse(s) as DB) : null } catch { return null }
}

export const useStore = create<Store>((set, get) => {
  const apply = (kind: Kind, id: string, data: unknown | null, remote = false) => {
    const db = { ...get().db }
    const coll = { ...(db[kind] as Record<string, unknown>) }
    if (data === null) delete coll[id]
    else coll[id] = data
    ;(db as unknown as Record<string, unknown>)[kind] = coll
    set({ db, lastChange: { kind, id, at: Date.now() } })
    saveLocal(db)
    if (!remote) {
      bc?.postMessage({ kind, id, data })
      if (sb && get().status === 'live') {
        const q = data === null
          ? sb.from('posh_records').delete().match({ kind, id })
          : sb.from('posh_records').upsert({ kind, id, data, updated_at: new Date().toISOString() })
        q.then(({ error }) => { if (error) console.warn('[posh] sync failed', error.message) })
      }
    }
  }

  return {
    db: loadLocal() ?? makeSeed(),
    status: 'loading',
    ready: false,
    put: (kind, rec) => apply(kind, (rec as { id: string }).id, rec),
    patch: (kind, id, p) => {
      const cur = (get().db[kind] as Record<string, object>)[id]
      if (!cur) return
      apply(kind, id, { ...cur, ...p })
    },
    remove: (kind, id) => apply(kind, id, null),
    reset: async () => {
      const seed = makeSeed()
      set({ db: seed })
      saveLocal(seed)
      bc?.postMessage({ reset: true })
      if (sb && get().status === 'live') {
        await sb.from('posh_records').delete().neq('kind', '__none__')
        await pushAll(sb, seed)
      }
    },
  }
})

async function pushAll(client: SupabaseClient, db: DB) {
  const rows = KINDS.flatMap((k) => Object.values(db[k] as Record<string, { id: string }>).map((r) => ({ kind: k, id: r.id, data: r })))
  for (let i = 0; i < rows.length; i += 400) {
    const { error } = await client.from('posh_records').upsert(rows.slice(i, i + 400))
    if (error) throw error
  }
}

let started = false
export async function startSync() {
  if (started) return
  started = true
  bc?.addEventListener('message', (e) => {
    const m = e.data
    if (m?.reset) { useStore.setState({ db: loadLocal() ?? makeSeed() }); return }
    if (m?.kind) useStoreApplyRemote(m.kind, m.id, m.data)
  })
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) { useStore.setState({ status: 'local', ready: true }); return }
  // Show the app straight away from this device's copy; switch to live data when the server answers.
  setTimeout(() => useStore.setState({ ready: true }), 350)
  const timeout = setTimeout(() => { if (useStore.getState().status === 'loading') useStore.setState({ status: 'offline' }) }, 9000)
  try {
    sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 20 } } })
    const all: { kind: Kind; id: string; data: unknown }[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from('posh_records').select('kind,id,data').range(from, from + 999)
      if (error) throw error
      all.push(...(data as typeof all))
      if (!data || data.length < 1000) break
    }
    let db: DB
    if (all.length === 0) {
      db = makeSeed()
      await pushAll(sb, db)
    } else {
      db = empty()
      for (const r of all) if ((db as unknown as Record<string, unknown>)[r.kind]) (db[r.kind] as Record<string, unknown>)[r.id] = r.data
    }
    saveLocal(db)
    clearTimeout(timeout)
    useStore.setState({ db, status: 'live', ready: true })
    channel = sb.channel('posh-records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posh_records' }, (payload) => {
        const row = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as { kind: Kind; id: string; data: unknown }
        if (!row?.kind) return
        useStoreApplyRemote(row.kind, row.id, payload.eventType === 'DELETE' ? null : row.data)
      })
      .subscribe()
  } catch (e) {
    console.warn('[posh] live sync unavailable, using this device only', e)
    clearTimeout(timeout)
    useStore.setState({ status: 'offline', ready: true })
  }
}

function useStoreApplyRemote(kind: Kind, id: string, data: unknown | null) {
  const st = useStore.getState()
  const cur = (st.db[kind] as Record<string, unknown>)?.[id]
  if (data !== null && JSON.stringify(cur) === JSON.stringify(data)) return
  const db = { ...st.db }
  const coll = { ...(db[kind] as Record<string, unknown>) }
  if (data === null) delete coll[id]
  else coll[id] = data
  ;(db as unknown as Record<string, unknown>)[kind] = coll
  useStore.setState({ db, lastChange: { kind, id, at: Date.now() } })
  saveLocal(db)
}

export function isLive() { return !!channel }

// Convenience selectors
export const useDB = () => useStore((s) => s.db)
export const list = <K extends Kind>(db: DB, k: K) => Object.values(db[k]) as DB[K][string][]
