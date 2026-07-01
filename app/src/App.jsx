import { useState, useEffect, useRef } from 'react'
import { load, save, snapshot, exportJSON, importJSON, listSnapshots, restoreSnapshot } from './lib/storage'

// Storage keys — same shape as v2 so old exports map straight in
const SK = { p: 'projects', t: 'team', th: 'theme', s: 'settings', n: 'notes', v: 'vendors', lb: 'labels' }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const money = n => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const TABS = ['dashboard', 'plate', 'materials', 'schedule', 'takeoff', 'labels', 'backup']
const TAB_LABELS = { dashboard: 'Dashboard', plate: 'My Plate', materials: 'Materials', schedule: 'Schedule', takeoff: 'Takeoff', labels: 'Labels', backup: 'Backup' }

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [projects, setProjects] = useState([])
  const [team, setTeam] = useState([])
  const [notes, setNotes] = useState([])
  const [vendors, setVendors] = useState([])
  const [labels, setLabels] = useState([])
  const ready = useRef(false)

  useEffect(() => {
    (async () => {
      const [p, t, n, v, lb] = await Promise.all([load(SK.p, []), load(SK.t, []), load(SK.n, []), load(SK.v, []), load(SK.lb, [])])
      setProjects(p); setTeam(t); setNotes(n); setVendors(v); setLabels(lb)
      ready.current = true; setLoaded(true)
      snapshot() // session-start snapshot
    })()
    const onHide = () => { if (document.visibilityState === 'hidden') snapshot() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [])

  useEffect(() => { if (ready.current) save(SK.p, projects) }, [projects])
  useEffect(() => { if (ready.current) save(SK.t, team) }, [team])
  useEffect(() => { if (ready.current) save(SK.n, notes) }, [notes])
  useEffect(() => { if (ready.current) save(SK.v, vendors) }, [vendors])
  useEffect(() => { if (ready.current) save(SK.lb, labels) }, [labels])

  if (!loaded) return <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><style>{CSS}</style>Loading…</div>

  return <div className="app"><style>{CSS}</style>
    <div className="top">
      <h1>Contractor Manager <span className="v3">v3 · local</span></h1>
    </div>
    <div className="tabs">
      {TABS.map(t => <div key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{TAB_LABELS[t]}</div>)}
    </div>
    <div className="body">
      {tab === 'dashboard' && <Dashboard projects={projects} setProjects={setProjects} />}
      {tab === 'backup' && <Backup />}
      {tab !== 'dashboard' && tab !== 'backup' && <div className="empty">'{TAB_LABELS[tab]}' — spec'd in SPEC.md, build next.</div>}
    </div>
  </div>
}

function Dashboard({ projects, setProjects }) {
  const [name, setName] = useState('')
  const add = () => { if (!name.trim()) return; setProjects([...projects, { id: uid(), name: name.trim(), status: 'open', createdAt: new Date().toISOString(), invoices: [], materials: [], labor: [] }]); setName('') }
  const open = projects.filter(p => p.status === 'open')
  return <div className="pad">
    <div className="stats">
      <div className="sc"><div className="sl">Open Projects</div><div className="sv">{open.length}</div></div>
      <div className="sc"><div className="sl">Total Projects</div><div className="sv">{projects.length}</div></div>
    </div>
    <div className="row">
      <input className="fi" placeholder="New project name…" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
      <button className="b ba" onClick={add}>Add</button>
    </div>
    {projects.length === 0 ? <div className="empty">No projects yet.</div> :
      projects.map(p => <div key={p.id} className="card row">
        <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
        <span className="pill" style={{ color: p.status === 'open' ? 'var(--gn)' : 'var(--t3)' }}>{p.status}</span>
        <button className="b" onClick={() => setProjects(projects.map(x => x.id === p.id ? { ...x, status: x.status === 'open' ? 'closed' : 'open' } : x))}>{p.status === 'open' ? 'Close' : 'Reopen'}</button>
        <button className="b" style={{ color: 'var(--rd)' }} onClick={() => window.confirm('Delete ' + p.name + '?') && setProjects(projects.filter(x => x.id !== p.id))}>&times;</button>
      </div>)}
  </div>
}

function Backup() {
  const [snaps, setSnaps] = useState([])
  const [msg, setMsg] = useState('')
  const fileRef = useRef()
  useEffect(() => { listSnapshots().then(setSnaps) }, [msg])
  return <div className="pad" style={{ maxWidth: 520 }}>
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Off-device backup</div>
      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Data lives in this browser. Export a file regularly — it's the only thing that survives clearing browser data.</div>
      <div className="row">
        <button className="b ba" onClick={exportJSON}>Export backup file</button>
        <button className="b" onClick={() => fileRef.current.click()}>Import backup</button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={async e => { if (e.target.files[0]) { const n = await importJSON(e.target.files[0]); setMsg(n + ' keys imported — reload to see data'); } }} />
      </div>
      {msg && <div style={{ fontSize: 11, color: 'var(--gn)', marginTop: 6 }}>{msg}</div>}
    </div>
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Session snapshots (on-device, last 10)</div>
      {snaps.length === 0 ? <div style={{ fontSize: 11, color: 'var(--t3)' }}>None yet — created automatically each session.</div> :
        snaps.map(s => <div key={s} className="row" style={{ fontSize: 11, padding: '3px 0' }}>
          <span style={{ flex: 1, fontFamily: 'monospace' }}>{s.slice(0, 19).replace('T', ' ')}</span>
          <button className="b" onClick={async () => { if (window.confirm('Restore this snapshot? Current data will be overwritten.')) { await restoreSnapshot(s); location.reload() } }}>Restore</button>
        </div>)}
    </div>
  </div>
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg1:#0F1115;--bg2:#171A21;--bg3:#1F232C;--bd:#2A2F3A;--t1:#E8EAED;--t2:#B8BCC4;--t3:#8B8F9A;--ac:#E8A838;--acd:#E8A8381F;--sc:#3B9AE1;--gn:#4DC978;--rd:#E05252}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg1);color:var(--t1);font-family:'DM Sans',sans-serif}
.app{min-height:100vh}
.top{display:flex;align-items:center;padding:12px 20px;border-bottom:1px solid var(--bd)}
.top h1{font-size:15px;font-weight:700}
.v3{font-size:9px;color:var(--t3);font-weight:400;margin-left:6px}
.tabs{display:flex;gap:2px;padding:0 12px;border-bottom:1px solid var(--bd);overflow-x:auto}
.tab{padding:9px 13px;font-size:11px;color:var(--t3);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
.tab.active{color:var(--ac);border-bottom-color:var(--ac)}
.body{padding:0}
.pad{padding:14px 20px}
.row{display:flex;gap:6px;align-items:center;margin-bottom:8px}
.card{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:12px;margin-bottom:8px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:12px}
.sc{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:10px 12px}
.sl{font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px}
.sv{font-size:20px;font-weight:700;font-family:'JetBrains Mono',monospace}
.fi{background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--t1);padding:7px 10px;font-size:12px;font-family:inherit;flex:1}
.b{background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--t2);padding:6px 12px;font-size:11px;cursor:pointer;font-family:inherit}
.b.ba{background:var(--acd);border-color:var(--ac);color:var(--ac);font-weight:600}
.pill{font-size:9px;padding:2px 8px;border-radius:10px;background:var(--bg3)}
.empty{padding:30px;text-align:center;color:var(--t3);font-size:12px}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px}
`
