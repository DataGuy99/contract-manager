import { useState, useMemo } from 'react'
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const money = n => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const UNITS = ['ea', 'ft', 'roll', 'box', 'bag', 'spool', 'case']

export function Materials({ projects, setProjects, vendors, setVendors }) {
  const [view, setView] = useState('purchases')
  const [search, setSearch] = useState('')
  const catalog = useMemo(() => {
    const items = {}
    vendors.forEach(v => (v.items || []).forEach(it => {
      const k = it.name.toLowerCase().trim()
      items[k] = items[k] || { name: it.name, vendors: [] }
      items[k].vendors.push({ vid: v.id, vname: v.name, price: it.price, unit: it.unit, itemId: it.id })
    }))
    Object.values(items).forEach(i => i.vendors.sort((a, b) => a.price - b.price))
    return Object.values(items).sort((a, b) => a.name.localeCompare(b.name))
  }, [vendors])
  const bestPrice = name => catalog.find(c => c.name.toLowerCase().trim() === (name || '').toLowerCase().trim())?.vendors[0]

  const purchases = projects.flatMap(p => (p.materials || []).map(m => ({ ...m, proj: p.name, pid: p.id })))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return <div className="pad">
    <div className="row">{['purchases', 'vendors', 'pricebook'].map(v => <button key={v} className={'b' + (view === v ? ' ba' : '')} onClick={() => setView(v)}>{v === 'pricebook' ? 'Price Book' : v[0].toUpperCase() + v.slice(1)}</button>)}</div>
    {view === 'purchases' && <>
      {purchases.length === 0 ? <div className="empty">No material purchases logged. Add them from a project on the Dashboard.</div> :
        <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
          <thead><tr style={{ color: 'var(--t3)', textAlign: 'left' }}><th style={{ padding: 4 }}>Date</th><th>Item</th><th>Project</th><th>Cost</th><th>Best Price</th></tr></thead>
          <tbody>{purchases.map((m, i) => { const bp = bestPrice(m.item); const save = bp && m.cost > bp.price ? m.cost - bp.price : 0; return <tr key={i} style={{ borderTop: '1px solid var(--bd)' }}>
            <td style={{ padding: 4 }} className="m">{m.date}</td><td>{m.item}</td><td style={{ color: 'var(--t3)' }}>{m.proj}</td><td className="m">{money(m.cost)}</td>
            <td style={{ fontSize: 9 }}>{bp ? <span style={{ color: save > 0 ? 'var(--gn)' : 'var(--t3)' }}>{money(bp.price)} @ {bp.vname}{save > 0 ? ` (save ${money(save)})` : ''}</span> : '—'}</td></tr> })}</tbody>
        </table>}
    </>}
    {view === 'vendors' && <VendorView vendors={vendors} setVendors={setVendors} />}
    {view === 'pricebook' && <>
      <div className="row"><input className="fi" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} /><AddPrice vendors={vendors} setVendors={setVendors} /></div>
      {catalog.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => <div key={c.name} className="card">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.name}{c.vendors.length > 1 && <span style={{ fontSize: 9, color: 'var(--t3)', marginLeft: 8 }}>spread {money(c.vendors[c.vendors.length - 1].price - c.vendors[0].price)}</span>}</div>
        {c.vendors.map((v, i) => <div key={i} className="row" style={{ marginBottom: 2, fontSize: 10 }}>
          {i === 0 && <span className="pill" style={{ color: 'var(--gn)', borderColor: 'var(--gn)' }}>BEST</span>}
          <span style={{ flex: 1, color: 'var(--t2)' }}>{v.vname}</span><span className="m">{money(v.price)}/{v.unit}</span>
          <button className="b" style={{ padding: '1px 6px' }} onClick={() => setVendors(vendors.map(vd => vd.id === v.vid ? { ...vd, items: vd.items.filter(it => it.id !== v.itemId) } : vd))}>&times;</button>
        </div>)}
      </div>)}
      {catalog.length === 0 && <div className="empty">Add vendors, then log prices here to build your price book.</div>}
    </>}
  </div>
}
function VendorView({ vendors, setVendors }) {
  const [f, setF] = useState({})
  return <>
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <input className="fi" style={{ minWidth: 120 }} placeholder="Vendor name" value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} />
      <input className="fi" style={{ minWidth: 100 }} placeholder="Phone" value={f.phone || ''} onChange={e => setF({ ...f, phone: e.target.value })} />
      <input className="fi" style={{ minWidth: 120 }} placeholder="Address" value={f.address || ''} onChange={e => setF({ ...f, address: e.target.value })} />
      <button className="b ba" onClick={() => { if (!f.name?.trim()) return; setVendors([...vendors, { id: uid(), ...f, items: [] }]); setF({}) }}>Add Vendor</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 8 }}>
      {vendors.map(v => <div key={v.id} className="card">
        <div className="row"><span style={{ flex: 1, fontWeight: 600 }}>{v.name}</span><button className="b" style={{ padding: '1px 6px', color: 'var(--rd)' }} onClick={() => window.confirm('Delete ' + v.name + '?') && setVendors(vendors.filter(x => x.id !== v.id))}>&times;</button></div>
        <div style={{ fontSize: 9, color: 'var(--t3)' }}>{v.phone} {v.address}</div>
        <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 4 }}>{(v.items || []).length} priced items</div>
        {(v.items || []).slice(0, 5).map(it => <div key={it.id} className="row" style={{ marginBottom: 1, fontSize: 9 }}><span style={{ flex: 1, color: 'var(--t2)' }}>{it.name}</span><span className="m">{money(it.price)}/{it.unit}</span></div>)}
      </div>)}
    </div>
  </>
}
function AddPrice({ vendors, setVendors }) {
  const [f, setF] = useState({ unit: 'ea' })
  if (!vendors.length) return null
  return <div className="row" style={{ flexWrap: 'wrap', marginBottom: 0 }}>
    <input className="fi" style={{ minWidth: 110 }} placeholder="Item name" value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} />
    <select className="fi" style={{ maxWidth: 110 }} value={f.vid || ''} onChange={e => setF({ ...f, vid: e.target.value })}><option value="">Vendor…</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
    <input className="fi" style={{ maxWidth: 75 }} type="number" step=".01" placeholder="$" value={f.price || ''} onChange={e => setF({ ...f, price: e.target.value })} />
    <select className="fi" style={{ maxWidth: 65 }} value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>
    <button className="b ba" onClick={() => { if (!f.name || !f.vid || !f.price) return; setVendors(vendors.map(v => v.id === f.vid ? { ...v, items: [...(v.items || []), { id: uid(), name: f.name.trim(), price: Number(f.price), unit: f.unit, date: new Date().toISOString().slice(0, 10) }] } : v)); setF({ unit: 'ea', vid: f.vid }) }}>Add Price</button>
  </div>
}

// ---------- My Plate ----------
const RECUR = ['none', 'daily', 'weekly', 'biweekly', 'monthly']
export function Plate({ notes, setNotes, projects, setProjects }) {
  const [txt, setTxt] = useState(''), [cat, setCat] = useState('personal'), [pid, setPid] = useState(''), [recur, setRecur] = useState('none'), [due, setDue] = useState('')
  const [filter, setFilter] = useState('all')
  const today = new Date().toISOString().slice(0, 10)

  const add = () => {
    if (!txt.trim()) return
    setNotes([{ id: uid(), text: txt.trim(), cat, projectId: pid || null, recur, due: due || null, done: false, createdAt: new Date().toISOString() }, ...notes])
    setTxt(''); setDue('')
  }
  const toggle = n => {
    if (!n.done && n.recur !== 'none') {
      const d = new Date(n.due || today)
      const add = { daily: 1, weekly: 7, biweekly: 14, monthly: 30 }[n.recur]
      d.setDate(d.getDate() + add)
      setNotes([{ ...n, id: uid(), due: d.toISOString().slice(0, 10), done: false, createdAt: new Date().toISOString() }, ...notes.map(x => x.id === n.id ? { ...x, done: true } : x)])
    } else setNotes(notes.map(x => x.id === n.id ? { ...x, done: !x.done } : x))
  }
  const makeActionable = n => {
    if (!n.projectId) { alert('Assign a project first (edit the note category)'); return }
    setProjects(projects.map(p => p.id === n.projectId ? { ...p, materials: [...(p.materials || []), { id: uid(), item: n.text, cost: 0, date: today }] } : p))
    setNotes(notes.map(x => x.id === n.id ? { ...x, done: true } : x))
  }
  const shown = notes.filter(n => filter === 'all' ? !n.done : filter === 'done' ? n.done : n.cat === filter && !n.done)
  const overdue = notes.filter(n => !n.done && n.due && n.due < today).length

  return <div className="pad" style={{ maxWidth: 640 }}>
    {overdue > 0 && <div className="card" style={{ borderColor: 'rgba(224,82,82,.4)', color: 'var(--rd)', fontSize: 11 }}>{overdue} overdue item{overdue > 1 ? 's' : ''}</div>}
    <div className="row" style={{ flexWrap: 'wrap' }}>
      <input className="fi" style={{ minWidth: 180 }} placeholder="Add to your plate…" value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
      <select className="fi" style={{ maxWidth: 105 }} value={cat} onChange={e => setCat(e.target.value)}><option>personal</option><option>project</option><option>management</option></select>
      {cat === 'project' && <select className="fi" style={{ maxWidth: 120 }} value={pid} onChange={e => setPid(e.target.value)}><option value="">project…</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>}
      <select className="fi" style={{ maxWidth: 95 }} value={recur} onChange={e => setRecur(e.target.value)}>{RECUR.map(r => <option key={r}>{r}</option>)}</select>
      <input className="fi" style={{ maxWidth: 130 }} type="date" value={due} onChange={e => setDue(e.target.value)} />
      <button className="b ba" onClick={add}>Add</button>
    </div>
    <div className="row">{['all', 'personal', 'project', 'management', 'done'].map(f => <button key={f} className={'b' + (filter === f ? ' ba' : '')} style={{ fontSize: 9 }} onClick={() => setFilter(f)}>{f}</button>)}</div>
    {shown.length === 0 ? <div className="empty">Plate's clean.</div> : shown.map(n => {
      const proj = projects.find(p => p.id === n.projectId)
      const late = !n.done && n.due && n.due < today
      return <div key={n.id} className="card row" style={{ padding: '8px 10px', borderColor: late ? 'rgba(224,82,82,.4)' : undefined }}>
        <input type="checkbox" checked={n.done} onChange={() => toggle(n)} style={{ accentColor: 'var(--ac)' }} />
        <span style={{ flex: 1, textDecoration: n.done ? 'line-through' : 'none', color: n.done ? 'var(--t3)' : 'var(--t1)', fontSize: 12 }}>{n.text}</span>
        {n.recur !== 'none' && <span className="pill" style={{ fontSize: 8 }}>{n.recur}</span>}
        {n.due && <span className="pill m" style={{ fontSize: 8, color: late ? 'var(--rd)' : 'var(--t3)' }}>{n.due}</span>}
        {proj && <span className="pill" style={{ fontSize: 8, color: 'var(--sc)' }}>{proj.name}</span>}
        {n.projectId && !n.done && <button className="b" style={{ fontSize: 8, padding: '2px 6px' }} title="Add as project material line" onClick={() => makeActionable(n)}>→ material</button>}
        <button className="b" style={{ padding: '1px 6px', color: 'var(--rd)' }} onClick={() => setNotes(notes.filter(x => x.id !== n.id))}>&times;</button>
      </div>
    })}
  </div>
}
