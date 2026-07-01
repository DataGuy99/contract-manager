import { useState, useEffect, useRef } from 'react'
import { load, save, snapshot, exportJSON, importJSON, listSnapshots, restoreSnapshot } from './lib/storage'
import Takeoff from './components/Takeoff'
import { Materials, Plate } from './components/Tabs'
import { Labels, LabelScanView } from './components/Labels'

const SK = { p: 'projects', t: 'team', n: 'notes', v: 'vendors', lb: 'labels' }
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const money = n => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const today = () => new Date().toISOString().slice(0, 10)
const TABS = ['dashboard', 'plate', 'materials', 'schedule', 'takeoff', 'labels', 'backup']
const TL = { dashboard: 'Dashboard', plate: 'My Plate', materials: 'Materials', schedule: 'Schedule', takeoff: 'Takeoff', labels: 'Labels', backup: 'Backup' }

function projTotals(p) {
  const billed = (p.invoices || []).reduce((s, i) => s + (i.lines || []).reduce((a, l) => a + Number(l.amt || 0), 0), 0)
  const paid = (p.invoices || []).filter(i => i.paid).reduce((s, i) => s + (i.lines || []).reduce((a, l) => a + Number(l.amt || 0), 0), 0)
  const mat = (p.materials || []).reduce((s, m) => s + Number(m.cost || 0), 0)
  const lab = (p.labor || []).reduce((s, l) => s + Number(l.hours || 0) * Number(l.rate || 0), 0)
  return { billed, paid, open: billed - paid, mat, lab, pl: billed - mat - lab }
}

export default function App() {
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [route, setRoute] = useState(location.hash)
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
      ready.current = true; setLoaded(true); snapshot()
    })()
    const onHash = () => setRoute(location.hash)
    const onHide = () => { if (document.visibilityState === 'hidden') snapshot() }
    window.addEventListener('hashchange', onHash)
    document.addEventListener('visibilitychange', onHide)
    return () => { window.removeEventListener('hashchange', onHash); document.removeEventListener('visibilitychange', onHide) }
  }, [])
  useEffect(() => { if (ready.current) save(SK.p, projects) }, [projects])
  useEffect(() => { if (ready.current) save(SK.t, team) }, [team])
  useEffect(() => { if (ready.current) save(SK.n, notes) }, [notes])
  useEffect(() => { if (ready.current) save(SK.v, vendors) }, [vendors])
  useEffect(() => { if (ready.current) save(SK.lb, labels) }, [labels])

  if (!loaded) return <div className="app" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}><style>{CSS}</style>Loading…</div>
  if (route.startsWith('#label/')) return <div className="app"><style>{CSS}</style>
    <div className="top"><h1>Contractor Manager</h1><a className="b" style={{ textDecoration: 'none' }} href="#" onClick={() => setRoute('')}>← App</a></div>
    <LabelScanView labelId={route.slice(7)} labels={labels} /></div>

  return <div className="app"><style>{CSS}</style>
    <div className="top"><h1>Contractor Manager <span className="v3">v3 · local</span></h1></div>
    <div className="tabs">{TABS.map(t => <div key={t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>{TL[t]}</div>)}</div>
    <div>
      {tab === 'dashboard' && <Dashboard projects={projects} setProjects={setProjects} team={team} setTeam={setTeam} notes={notes} />}
      {tab === 'plate' && <Plate notes={notes} setNotes={setNotes} projects={projects} setProjects={setProjects} />}
      {tab === 'materials' && <Materials projects={projects} setProjects={setProjects} vendors={vendors} setVendors={setVendors} />}
      {tab === 'schedule' && <Schedule projects={projects} setProjects={setProjects} team={team} />}
      {tab === 'takeoff' && <Takeoff projects={projects} setProjects={setProjects} />}
      {tab === 'labels' && <Labels labels={labels} setLabels={setLabels} projects={projects} />}
      {tab === 'backup' && <Backup />}
    </div>
  </div>
}

function Dashboard({ projects, setProjects, team, setTeam, notes }) {
  const [name, setName] = useState(''), [open, setOpen] = useState(null), [showTeam, setShowTeam] = useState(false)
  const openP = projects.filter(p => p.status === 'open')
  const agg = projects.reduce((a, p) => { const t = projTotals(p); a.open += t.open; a.paid += t.paid; a.pl += t.pl; return a }, { open: 0, paid: 0, pl: 0 })
  const due = notes.filter(n => !n.done && n.due && n.due <= today())
  const proj = projects.find(p => p.id === open)
  return <div className="pad">
    <div className="stats">
      <div className="sc"><div className="sl">Open Projects</div><div className="sv">{openP.length}</div></div>
      <div className="sc"><div className="sl">Open Invoices</div><div className="sv" style={{ color: 'var(--ac)' }}>{money(agg.open)}</div></div>
      <div className="sc"><div className="sl">Paid</div><div className="sv" style={{ color: 'var(--gn)' }}>{money(agg.paid)}</div></div>
      <div className="sc"><div className="sl">Total P&L</div><div className="sv" style={{ color: agg.pl >= 0 ? 'var(--gn)' : 'var(--rd)' }}>{money(agg.pl)}</div></div>
    </div>
    {due.length > 0 && <div className="card" style={{ borderColor: 'rgba(232,168,56,.4)' }}><div className="sl" style={{ color: 'var(--ac)' }}>My Plate — due</div>{due.slice(0, 5).map(n => <div key={n.id} style={{ fontSize: 11, padding: '2px 0' }}>{n.text} <span className="m" style={{ fontSize: 9, color: 'var(--t3)' }}>{n.due}</span></div>)}</div>}
    <div className="row">
      <input className="fi" placeholder="New project…" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && (setProjects([...projects, { id: uid(), name: name.trim(), status: 'open', createdAt: new Date().toISOString(), invoices: [], materials: [], labor: [], schedule: [] }]), setName(''))} />
      <button className="b" onClick={() => setShowTeam(!showTeam)}>Team ({team.length})</button>
    </div>
    {showTeam && <TeamEditor team={team} setTeam={setTeam} />}
    {projects.map(p => { const t = projTotals(p); return <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === p.id ? null : p.id)}>
      <div className="row" style={{ marginBottom: 0 }}>
        <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
        <span className="pill" style={{ color: p.status === 'open' ? 'var(--gn)' : 'var(--t3)' }}>{p.status}</span>
        <span className="m" style={{ fontSize: 10, color: t.pl >= 0 ? 'var(--gn)' : 'var(--rd)' }}>{money(t.pl)}</span>
      </div>
      {open === p.id && <ProjectDetail proj={p} team={team} update={np => setProjects(projects.map(x => x.id === p.id ? np : x))} remove={() => window.confirm('Delete ' + p.name + '?') && setProjects(projects.filter(x => x.id !== p.id))} />}
    </div> })}
  </div>
}

function TeamEditor({ team, setTeam }) {
  const [f, setF] = useState({})
  return <div className="card">
    <div className="row"><input className="fi" placeholder="Name" value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} /><input className="fi" style={{ maxWidth: 90 }} type="number" placeholder="$/hr" value={f.rate || ''} onChange={e => setF({ ...f, rate: e.target.value })} /><button className="b ba" onClick={() => { if (!f.name?.trim()) return; setTeam([...team, { id: uid(), name: f.name.trim(), rate: Number(f.rate || 0) }]); setF({}) }}>Add</button></div>
    {team.map(m => <div key={m.id} className="row" style={{ marginBottom: 2, fontSize: 11 }}><span style={{ flex: 1 }}>{m.name}</span><span className="m">{money(m.rate)}/hr</span><button className="b" style={{ padding: '1px 6px', color: 'var(--rd)' }} onClick={() => setTeam(team.filter(x => x.id !== m.id))}>&times;</button></div>)}
  </div>
}

function ProjectDetail({ proj, team, update, remove }) {
  const t = projTotals(proj)
  const [mi, setMi] = useState({}), [li, setLi] = useState({}), [inv, setInv] = useState({})
  const stop = e => e.stopPropagation()
  return <div onClick={stop} style={{ marginTop: 8, borderTop: '1px solid var(--bd)', paddingTop: 8 }}>
    <div className="row" style={{ fontSize: 10, color: 'var(--t3)' }}>
      <span>Billed {money(t.billed)}</span><span>Paid {money(t.paid)}</span><span>Mat {money(t.mat)}</span><span>Labor {money(t.lab)}</span>
      <span style={{ flex: 1 }} />
      <button className="b" onClick={() => update({ ...proj, status: proj.status === 'open' ? 'closed' : 'open' })}>{proj.status === 'open' ? 'Close' : 'Reopen'}</button>
      <button className="b" style={{ color: 'var(--rd)' }} onClick={remove}>Delete</button>
    </div>
    <div className="sl" style={{ marginTop: 6 }}>Invoices</div>
    {(proj.invoices || []).map(i => { const amt = (i.lines || []).reduce((s, l) => s + Number(l.amt || 0), 0); return <div key={i.id} className="row" style={{ fontSize: 11, marginBottom: 2 }}>
      <span style={{ flex: 1 }}>{i.label}</span><span className="m">{money(amt)}</span>
      <button className="b" style={{ fontSize: 9, color: i.paid ? 'var(--gn)' : 'var(--ac)' }} onClick={() => update({ ...proj, invoices: proj.invoices.map(x => x.id === i.id ? { ...x, paid: !x.paid } : x) })}>{i.paid ? 'PAID' : 'mark paid'}</button>
      <button className="b" style={{ padding: '1px 6px' }} onClick={() => update({ ...proj, invoices: proj.invoices.filter(x => x.id !== i.id) })}>&times;</button>
    </div> })}
    <div className="row"><input className="fi" placeholder="Invoice label" value={inv.label || ''} onChange={e => setInv({ ...inv, label: e.target.value })} /><input className="fi" style={{ maxWidth: 90 }} type="number" placeholder="$" value={inv.amt || ''} onChange={e => setInv({ ...inv, amt: e.target.value })} /><button className="b ba" onClick={() => { if (!inv.label || !inv.amt) return; update({ ...proj, invoices: [...(proj.invoices || []), { id: uid(), label: inv.label, paid: false, lines: [{ desc: inv.label, amt: Number(inv.amt) }] }] }); setInv({}) }}>+ Invoice</button></div>
    <div className="sl">Materials</div>
    {(proj.materials || []).map(m => <div key={m.id} className="row" style={{ fontSize: 11, marginBottom: 2 }}><span className="m" style={{ fontSize: 9, color: 'var(--t3)' }}>{m.date}</span><span style={{ flex: 1 }}>{m.item}</span><span className="m">{money(m.cost)}</span><button className="b" style={{ padding: '1px 6px' }} onClick={() => update({ ...proj, materials: proj.materials.filter(x => x.id !== m.id) })}>&times;</button></div>)}
    <div className="row"><input className="fi" placeholder="Material item" value={mi.item || ''} onChange={e => setMi({ ...mi, item: e.target.value })} /><input className="fi" style={{ maxWidth: 90 }} type="number" placeholder="$" value={mi.cost || ''} onChange={e => setMi({ ...mi, cost: e.target.value })} /><button className="b ba" onClick={() => { if (!mi.item) return; update({ ...proj, materials: [...(proj.materials || []), { id: uid(), item: mi.item, cost: Number(mi.cost || 0), date: today() }] }); setMi({}) }}>+ Mat</button></div>
    <div className="sl">Labor</div>
    {(proj.labor || []).map(l => <div key={l.id} className="row" style={{ fontSize: 11, marginBottom: 2 }}><span className="m" style={{ fontSize: 9, color: 'var(--t3)' }}>{l.date}</span><span style={{ flex: 1 }}>{l.who}</span><span className="m">{l.hours}h × {money(l.rate)}</span><button className="b" style={{ padding: '1px 6px' }} onClick={() => update({ ...proj, labor: proj.labor.filter(x => x.id !== l.id) })}>&times;</button></div>)}
    <div className="row"><select className="fi" value={li.mid || ''} onChange={e => setLi({ ...li, mid: e.target.value })}><option value="">who…</option>{team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><input className="fi" style={{ maxWidth: 70 }} type="number" placeholder="hrs" value={li.hours || ''} onChange={e => setLi({ ...li, hours: e.target.value })} /><button className="b ba" onClick={() => { const m = team.find(x => x.id === li.mid); if (!m || !li.hours) return; update({ ...proj, labor: [...(proj.labor || []), { id: uid(), who: m.name, hours: Number(li.hours), rate: m.rate, date: today() }] }); setLi({}) }}>+ Labor</button></div>
  </div>
}

function Schedule({ projects, setProjects, team }) {
  const [f, setF] = useState({ date: today() })
  const items = projects.flatMap(p => (p.schedule || []).map(s => ({ ...s, proj: p.name, pid: p.id }))).sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = items.filter(i => i.date >= today())
  return <div className="pad" style={{ maxWidth: 560 }}>
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <select className="fi" value={f.pid || ''} onChange={e => setF({ ...f, pid: e.target.value })}><option value="">project…</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <input className="fi" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
      <input className="fi" placeholder="What / who" value={f.what || ''} onChange={e => setF({ ...f, what: e.target.value })} />
      <button className="b ba" onClick={() => { if (!f.pid || !f.what) return; setProjects(projects.map(p => p.id === f.pid ? { ...p, schedule: [...(p.schedule || []), { id: uid(), date: f.date, what: f.what }] } : p)); setF({ date: f.date, pid: f.pid }) }}>Add</button>
    </div>
    {upcoming.length === 0 ? <div className="empty">Nothing scheduled.</div> : upcoming.map(i => <div key={i.id} className="card row" style={{ padding: '8px 10px' }}>
      <span className="m" style={{ fontSize: 10, color: i.date === today() ? 'var(--ac)' : 'var(--t3)' }}>{i.date}</span>
      <span style={{ flex: 1, fontSize: 12 }}>{i.what}</span><span className="pill" style={{ color: 'var(--sc)' }}>{i.proj}</span>
      <button className="b" style={{ padding: '1px 6px' }} onClick={() => setProjects(projects.map(p => p.id === i.pid ? { ...p, schedule: p.schedule.filter(s => s.id !== i.id) } : p))}>&times;</button>
    </div>)}
  </div>
}

function Backup() {
  const [snaps, setSnaps] = useState([]), [msg, setMsg] = useState('')
  const fileRef = useRef()
  useEffect(() => { listSnapshots().then(setSnaps) }, [msg])
  return <div className="pad" style={{ maxWidth: 520 }}>
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Off-device backup</div>
      <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Data lives in this browser. Export a file regularly — it's the only backup that survives clearing browser data.</div>
      <div className="row"><button className="b ba" onClick={exportJSON}>Export backup file</button><button className="b" onClick={() => fileRef.current.click()}>Import</button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={async e => { if (e.target.files[0]) setMsg((await importJSON(e.target.files[0])) + ' keys imported — reload') }} /></div>
      {msg && <div style={{ fontSize: 11, color: 'var(--gn)', marginTop: 6 }}>{msg}</div>}
    </div>
    <div className="card">
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Session snapshots (auto, last 10)</div>
      {snaps.map(s => <div key={s} className="row" style={{ fontSize: 11 }}><span className="m" style={{ flex: 1 }}>{s.slice(0, 19).replace('T', ' ')}</span><button className="b" onClick={async () => { if (window.confirm('Restore? Current data will be overwritten.')) { await restoreSnapshot(s); location.reload() } }}>Restore</button></div>)}
      {!snaps.length && <div style={{ fontSize: 11, color: 'var(--t3)' }}>Created automatically each session.</div>}
    </div>
  </div>
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
:root{--bg1:#0F1115;--bg2:#171A21;--bg3:#1F232C;--bd:#2A2F3A;--t1:#E8EAED;--t2:#B8BCC4;--t3:#8B8F9A;--ac:#E8A838;--acd:#E8A8381F;--sc:#3B9AE1;--gn:#4DC978;--rd:#E05252}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg1);color:var(--t1);font-family:'DM Sans',sans-serif}
.app{min-height:100vh}
.top{display:flex;align-items:center;padding:12px 20px;border-bottom:1px solid var(--bd);gap:8px}
.top h1{font-size:15px;font-weight:700;flex:1}
.v3{font-size:9px;color:var(--t3);font-weight:400;margin-left:6px}
.tabs{display:flex;gap:2px;padding:0 12px;border-bottom:1px solid var(--bd);overflow-x:auto}
.tab{padding:9px 13px;font-size:11px;color:var(--t3);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
.tab.active{color:var(--ac);border-bottom-color:var(--ac)}
.pad{padding:14px 20px}
.row{display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
.card{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:12px;margin-bottom:8px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px}
.sc{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:10px 12px}
.sl{font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.5px}
.sv{font-size:18px;font-weight:700;font-family:'JetBrains Mono',monospace}
.m{font-family:'JetBrains Mono',monospace}
.fi{background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--t1);padding:7px 10px;font-size:12px;font-family:inherit;flex:1;min-width:0}
.b{background:var(--bg3);border:1px solid var(--bd);border-radius:6px;color:var(--t2);padding:6px 12px;font-size:11px;cursor:pointer;font-family:inherit}
.b.ba{background:var(--acd);border-color:var(--ac);color:var(--ac);font-weight:600}
.pill{font-size:9px;padding:2px 8px;border-radius:10px;background:var(--bg3);border:1px solid var(--bd)}
.empty{padding:30px;text-align:center;color:var(--t3);font-size:12px}
.mo{position:fixed;inset:0;background:rgba(0,0,0,.6);display:grid;place-items:center;z-index:10;padding:16px}
.mc{background:var(--bg1);border:1px solid var(--bd);border-radius:10px;padding:14px;width:100%;max-height:88vh;overflow-y:auto}
h2{color:var(--t1)}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:2px}
@media print{.top,.tabs,.no-print{display:none!important}body,.app{background:#fff!important}.mo{position:static;background:none}.mc{border:none;max-height:none}}
`
