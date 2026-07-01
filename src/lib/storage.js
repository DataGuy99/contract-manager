// Local-first storage: IndexedDB with the same load/save API v2 used against Supabase.
// Adds: automatic session snapshots (last 10) + JSON export/import for off-device backup.
// Later: point these same functions at the home-server API; nothing else changes.

const DB = 'cm3', STORE = 'kv', SNAPS = 'snapshots', VER = 1
let _db = null

function open() {
  if (_db) return Promise.resolve(_db)
  return new Promise((res, rej) => {
    const rq = indexedDB.open(DB, VER)
    rq.onupgradeneeded = () => {
      const d = rq.result
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE)
      if (!d.objectStoreNames.contains(SNAPS)) d.createObjectStore(SNAPS)
    }
    rq.onsuccess = () => { _db = rq.result; res(_db) }
    rq.onerror = () => rej(rq.error)
  })
}

function tx(store, mode, fn) {
  return open().then(d => new Promise((res, rej) => {
    const t = d.transaction(store, mode), s = t.objectStore(store), out = fn(s)
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : undefined)
    t.onerror = () => rej(t.error)
  }))
}

export async function load(key, fallback) {
  try {
    const v = await tx(STORE, 'readonly', s => s.get(key))
    return v === undefined ? fallback : v
  } catch { return fallback }
}

export async function save(key, value) {
  return tx(STORE, 'readwrite', s => s.put(value, key))
}

export async function allData() {
  const d = await open()
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, 'readonly'), s = t.objectStore(STORE)
    const keys = s.getAllKeys(), vals = s.getAll()
    t.oncomplete = () => {
      const out = {}
      keys.result.forEach((k, i) => { out[k] = vals.result[i] })
      res(out)
    }
    t.onerror = () => rej(t.error)
  })
}

// ---- Snapshots: call snapshot() on app start / visibilitychange; keeps last 10 ----
export async function snapshot() {
  const data = await allData()
  if (!Object.keys(data).length) return
  const stamp = new Date().toISOString()
  await tx(SNAPS, 'readwrite', s => s.put({ stamp, data }, stamp))
  const d = await open()
  return new Promise(res => {
    const t = d.transaction(SNAPS, 'readwrite'), s = t.objectStore(SNAPS)
    s.getAllKeys().onsuccess = e => {
      const keys = e.target.result.sort()
      keys.slice(0, Math.max(0, keys.length - 10)).forEach(k => s.delete(k))
    }
    t.oncomplete = res
  })
}

export async function listSnapshots() {
  return tx(SNAPS, 'readonly', s => s.getAllKeys()).then(k => (k || []).sort().reverse())
}

export async function restoreSnapshot(stamp) {
  const snap = await tx(SNAPS, 'readonly', s => s.get(stamp))
  if (!snap) throw new Error('snapshot not found')
  for (const [k, v] of Object.entries(snap.data)) await save(k, v)
  return Object.keys(snap.data).length
}

// ---- Export / Import: the backup that survives clearing browser data ----
export async function exportJSON() {
  const data = await allData()
  const blob = new Blob([JSON.stringify({ app: 'contractor-manager', v: 3, exported: new Date().toISOString(), data }, null, 1)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'cm-backup-' + new Date().toISOString().slice(0, 10) + '.json'
  a.click(); URL.revokeObjectURL(a.href)
}

export async function importJSON(file) {
  const parsed = JSON.parse(await file.text())
  const data = parsed.data || parsed // tolerate raw dumps (incl. reshaped Supabase exports)
  let n = 0
  for (const [k, v] of Object.entries(data)) { await save(k, v); n++ }
  return n
}
