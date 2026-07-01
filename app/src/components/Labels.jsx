import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const BREAKER_TYPES = ['standard', 'gfci', 'afci', 'dual']
const AMPS = [15, 20, 25, 30, 40, 50, 60, 100, 200]
const TYPE_COLORS = { panel: '#B06AE0', run: '#E8A838', box: '#3B9AE1' }

export function LabelScanView({ labelId, labels }) {
  const l = labels.find(x => x.id === labelId)
  if (!l) return <div className="empty">Label not found on this device. Labels live in the owner's browser data.</div>
  const panel = l.panelId ? labels.find(x => x.id === l.panelId) : null
  const runs = labels.filter(x => x.labelType === 'run' && x.panelId === l.id)
  return <div className="pad" style={{ maxWidth: 460, margin: '0 auto' }}>
    <div className="card" style={{ padding: 16 }}>
      <div style={{ textAlign: 'center', borderBottom: '1px solid var(--bd)', paddingBottom: 10, marginBottom: 10 }}>
        <span className="pill" style={{ color: TYPE_COLORS[l.labelType] }}>{l.labelType.toUpperCase()}</span>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{l.name}</div>
        {l.description && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{l.description}</div>}
      </div>
      {l.labelType === 'panel' && <>
        <div className="row" style={{ fontSize: 11, color: 'var(--t2)' }}><span>Main: <b>{l.mainBreaker}A</b></span><span>Phase: <b>{l.phase || 1}</b></span><span>Circuits: <b>{(l.slots || []).filter(s => s.description).length}</b></span></div>
        {(l.slots || []).filter(s => s.description).map(s => <div key={s.num} className="row" style={{ borderTop: '1px solid var(--bd)', padding: '4px 0', marginBottom: 0, fontSize: 11 }}>
          <span className="m" style={{ width: 22, fontWeight: 700 }}>{s.num}</span><span className="m" style={{ width: 34, color: 'var(--ac)' }}>{s.amps}A</span>
          <span className="pill" style={{ fontSize: 8 }}>{s.breakerType}</span><span style={{ flex: 1, color: 'var(--t2)' }}>{s.description}</span>
        </div>)}
        {runs.length > 0 && <><div className="sl" style={{ marginTop: 8 }}>Connected Runs</div>{runs.map(r => <div key={r.id} style={{ fontSize: 10, padding: '3px 0', borderTop: '1px solid var(--bd)' }}><b style={{ color: '#E8A838' }}>{r.name}</b> {r.conduitSize} {r.conduitType} · {r.footage}ft</div>)}</>}
      </>}
      {l.labelType === 'run' && <div style={{ fontSize: 11, color: 'var(--t2)' }}>
        <div className="row"><span>{l.conduitSize} {l.conduitType}</span><span>#{l.wireGauge} x{l.conductors}</span><span>{l.footage}ft</span></div>
        {(l.from || l.to) && <div className="card" style={{ textAlign: 'center', padding: 8 }}>{l.from} → {l.to}</div>}
        {panel && <div style={{ fontSize: 10, color: 'var(--t3)' }}>Panel: {panel.name}{l.slotNum ? ' · slot #' + l.slotNum : ''}</div>}
      </div>}
      {l.labelType === 'box' && <div style={{ fontSize: 11, color: 'var(--t2)' }}>
        <div>{l.deviceType}</div>
        {panel && <div style={{ color: 'var(--t3)', fontSize: 10 }}>Fed by {panel.name} #{l.slotNum} — {l.breakerAmps}A {l.breakerType}</div>}
        {l.controls && <div className="card" style={{ padding: 6, fontSize: 10 }}>Controls: {l.controls}</div>}
        {l.spliceNotes && <div className="card" style={{ padding: 6, fontSize: 10 }}>Splices: {l.spliceNotes}</div>}
      </div>}
      <div style={{ textAlign: 'center', fontSize: 8, color: 'var(--t3)', marginTop: 10, borderTop: '1px solid var(--bd)', paddingTop: 6 }}>ID {l.id}</div>
    </div>
  </div>
}

function QR({ id, size = 52 }) {
  const [url, setUrl] = useState(null)
  useEffect(() => { QRCode.toDataURL(location.origin + location.pathname + '#label/' + id, { width: 160, margin: 1 }).then(setUrl).catch(() => {}) }, [id])
  return url ? <img src={url} alt="QR" style={{ width: size, height: size, background: '#fff', borderRadius: 4, padding: 2 }} /> : null
}

export function Labels({ labels, setLabels, projects }) {
  const [view, setView] = useState('all')
  const [creating, setCreating] = useState(null), [f, setF] = useState({})
  const [printing, setPrinting] = useState(null)
  const panels = labels.filter(l => l.labelType === 'panel')
  const shown = labels.filter(l => view === 'all' || l.labelType === view)

  const start = t => { setCreating(t); setF(t === 'panel' ? { mainBreaker: 200, phase: '1', slots: Array.from({ length: 42 }, (_, i) => ({ num: i + 1, amps: 20, breakerType: 'standard', description: '' })) } : t === 'run' ? { conduitType: 'EMT', conduitSize: '3/4"', wireGauge: '12', conductors: 2 } : { deviceType: 'junction' }) }
  const create = () => { if (!f.name?.trim()) return; setLabels([...labels, { id: uid(), labelType: creating, createdAt: new Date().toISOString(), ...f }]); setCreating(null); setF({}) }
  const importTakeoff = () => {
    const p = projects.find(x => x.takeoff?.conduits?.length || x.takeoff?.devices?.some(d => d.type === 'panel'))
    if (!p) return alert('No takeoff data found')
    const nl = []
    ;(p.takeoff.devices || []).filter(d => d.type === 'panel').forEach((_, i) => nl.push({ id: uid(), labelType: 'panel', name: p.name + ' Panel ' + (i + 1), mainBreaker: 200, phase: '1', slots: Array.from({ length: 42 }, (_, j) => ({ num: j + 1, amps: 20, breakerType: 'standard', description: '' })), createdAt: new Date().toISOString() }))
    ;(p.takeoff.conduits || []).forEach((c, i) => nl.push({ id: uid(), labelType: 'run', name: 'Run ' + (i + 1), conduitType: c.type, conduitSize: c.size, wireGauge: c.circuits?.[0]?.gauge || '12', conductors: c.circuits?.[0]?.conductors || 2, footage: c.totalFt, createdAt: new Date().toISOString() }))
    setLabels([...labels, ...nl])
  }

  return <div className="pad">
    <div className="row" style={{ flexWrap: 'wrap' }}>
      {['all', 'panel', 'run', 'box'].map(v => <button key={v} className={'b' + (view === v ? ' ba' : '')} onClick={() => setView(v)}>{v}</button>)}
      <span style={{ flex: 1 }} />
      <button className="b" onClick={importTakeoff}>Import from Takeoff</button>
      <button className="b" onClick={() => setPrinting(shown)}>Print All</button>
      {['panel', 'run', 'box'].map(t => <button key={t} className="b ba" onClick={() => start(t)}>+ {t}</button>)}
    </div>
    {shown.length === 0 ? <div className="empty">No labels. Create panel, run, or box labels — each gets a scannable QR.</div> :
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 8 }}>
        {shown.map(l => <div key={l.id} className="card">
          <div className="row"><span className="pill" style={{ color: TYPE_COLORS[l.labelType] }}>{l.labelType}</span><span style={{ flex: 1, fontWeight: 600 }}>{l.name}</span>
            <button className="b" style={{ padding: '1px 6px', color: 'var(--rd)' }} onClick={() => setLabels(labels.filter(x => x.id !== l.id))}>&times;</button></div>
          {l.labelType === 'panel' && <div style={{ fontSize: 9, color: 'var(--t3)' }}>Main {l.mainBreaker}A · {(l.slots || []).filter(s => s.description).length} circuits</div>}
          {l.labelType === 'run' && <div style={{ fontSize: 9, color: 'var(--t3)' }}>{l.conduitSize} {l.conduitType} · #{l.wireGauge}x{l.conductors} · {l.footage || '?'}ft{l.from ? ` · ${l.from}→${l.to}` : ''}</div>}
          {l.labelType === 'box' && <div style={{ fontSize: 9, color: 'var(--t3)' }}>{l.deviceType}{l.breakerAmps ? ` · ${l.breakerAmps}A ${l.breakerType}` : ''}{l.controls ? ` · ${l.controls}` : ''}</div>}
          <div className="row" style={{ marginTop: 6, marginBottom: 0 }}>
            <QR id={l.id} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 7, color: 'var(--t3)', fontFamily: 'monospace' }}>{l.id}</div>
              <div className="row" style={{ marginTop: 3, marginBottom: 0 }}>
                <button className="b" style={{ fontSize: 8 }} onClick={() => setPrinting([l])}>Print</button>
                <a className="b" style={{ fontSize: 8, textDecoration: 'none' }} href={'#label/' + l.id}>View</a>
              </div>
            </div>
          </div>
          {l.labelType === 'panel' && <PanelSlots label={l} labels={labels} setLabels={setLabels} />}
        </div>)}
      </div>}
    {creating && <div className="mo" onClick={() => setCreating(null)}><div className="mc" onClick={e => e.stopPropagation()} style={{ maxWidth: creating === 'panel' ? 520 : 400 }}>
      <div className="row"><h2 style={{ flex: 1, fontSize: 13 }}>New {creating} label</h2><button className="b" onClick={() => setCreating(null)}>&times;</button></div>
      <input className="fi" style={{ width: '100%', marginBottom: 6 }} placeholder="Name*" value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} />
      <input className="fi" style={{ width: '100%', marginBottom: 6 }} placeholder="Description" value={f.description || ''} onChange={e => setF({ ...f, description: e.target.value })} />
      {creating === 'panel' && <div className="row"><input className="fi" type="number" placeholder="Main A" value={f.mainBreaker || ''} onChange={e => setF({ ...f, mainBreaker: Number(e.target.value) })} /><select className="fi" style={{ maxWidth: 70 }} value={f.phase} onChange={e => setF({ ...f, phase: e.target.value })}><option>1</option><option>3</option></select></div>}
      {creating === 'run' && <>
        <div className="row"><select className="fi" value={f.conduitType} onChange={e => setF({ ...f, conduitType: e.target.value })}>{['EMT', 'Rigid', 'PVC', 'MC Cable', 'Flex'].map(t => <option key={t}>{t}</option>)}</select>
          <select className="fi" style={{ maxWidth: 75 }} value={f.conduitSize} onChange={e => setF({ ...f, conduitSize: e.target.value })}>{['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"'].map(s => <option key={s}>{s}</option>)}</select>
          <input className="fi" style={{ maxWidth: 70 }} type="number" placeholder="ft" value={f.footage || ''} onChange={e => setF({ ...f, footage: e.target.value })} /></div>
        <div className="row"><select className="fi" style={{ maxWidth: 70 }} value={f.wireGauge} onChange={e => setF({ ...f, wireGauge: e.target.value })}>{['14', '12', '10', '8', '6', '4'].map(g => <option key={g} value={g}>#{g}</option>)}</select>
          <input className="fi" style={{ maxWidth: 55 }} type="number" min="1" value={f.conductors} onChange={e => setF({ ...f, conductors: Number(e.target.value) })} />
          <select className="fi" value={f.panelId || ''} onChange={e => setF({ ...f, panelId: e.target.value })}><option value="">panel…</option>{panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          {f.panelId && <input className="fi" style={{ maxWidth: 60 }} type="number" placeholder="slot" value={f.slotNum || ''} onChange={e => setF({ ...f, slotNum: e.target.value })} />}</div>
        <div className="row"><input className="fi" placeholder="From" value={f.from || ''} onChange={e => setF({ ...f, from: e.target.value })} /><input className="fi" placeholder="To" value={f.to || ''} onChange={e => setF({ ...f, to: e.target.value })} /></div>
      </>}
      {creating === 'box' && <>
        <div className="row"><select className="fi" value={f.deviceType} onChange={e => setF({ ...f, deviceType: e.target.value })}>{['junction', 'receptacle', 'gfci', 'switch', '3-way', 'light', 'smoke', 'other'].map(d => <option key={d}>{d}</option>)}</select>
          <select className="fi" value={f.panelId || ''} onChange={e => setF({ ...f, panelId: e.target.value })}><option value="">panel…</option>{panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        {f.panelId && <div className="row"><input className="fi" style={{ maxWidth: 60 }} type="number" placeholder="slot" value={f.slotNum || ''} onChange={e => setF({ ...f, slotNum: e.target.value })} />
          <select className="fi" style={{ maxWidth: 75 }} value={f.breakerAmps || ''} onChange={e => setF({ ...f, breakerAmps: e.target.value })}><option value="">A…</option>{AMPS.map(a => <option key={a}>{a}</option>)}</select>
          <select className="fi" value={f.breakerType || ''} onChange={e => setF({ ...f, breakerType: e.target.value })}><option value="">type…</option>{BREAKER_TYPES.map(b => <option key={b}>{b}</option>)}</select></div>}
        <input className="fi" style={{ width: '100%', marginBottom: 6 }} placeholder="Controls (what this switches/feeds)" value={f.controls || ''} onChange={e => setF({ ...f, controls: e.target.value })} />
        <input className="fi" style={{ width: '100%', marginBottom: 6 }} placeholder="Splice notes" value={f.spliceNotes || ''} onChange={e => setF({ ...f, spliceNotes: e.target.value })} />
      </>}
      <button className="b ba" style={{ width: '100%', marginTop: 6 }} onClick={create} disabled={!f.name?.trim()}>Create</button>
    </div></div>}
    {printing && <div className="mo" onClick={() => setPrinting(null)}><div className="mc" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
      <div className="row no-print"><h2 style={{ flex: 1, fontSize: 13 }}>Print Labels</h2><button className="b ba" onClick={() => window.print()}>Print</button><button className="b" onClick={() => setPrinting(null)}>&times;</button></div>
      <div id="print-area" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {printing.map(l => <div key={l.id} style={{ border: '2px solid #333', borderRadius: 6, padding: 8, background: '#fff', color: '#000', display: 'flex', gap: 8, pageBreakInside: 'avoid' }}>
          <QR id={l.id} size={60} />
          <div style={{ fontSize: 9 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#666' }}>{l.labelType.toUpperCase()}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{l.name}</div>
            {l.labelType === 'run' && <div>{l.conduitSize} {l.conduitType} · #{l.wireGauge}x{l.conductors} · {l.footage}ft{l.from ? <><br />{l.from} → {l.to}</> : null}</div>}
            {l.labelType === 'panel' && <div>Main {l.mainBreaker}A · {(l.slots || []).filter(s => s.description).length} ckts</div>}
            {l.labelType === 'box' && <div>{l.deviceType}{l.breakerAmps ? ` · ${l.breakerAmps}A ${l.breakerType}` : ''}</div>}
            <div style={{ fontSize: 6, color: '#999', fontFamily: 'monospace' }}>{l.id}</div>
          </div>
        </div>)}
      </div>
    </div></div>}
  </div>
}
function PanelSlots({ label, labels, setLabels }) {
  const [open, setOpen] = useState(false)
  const slots = label.slots || []
  const upd = (num, k, v) => setLabels(labels.map(l => {
    if (l.id !== label.id) return l
    let ns = l.slots.map(s => s.num === num ? { ...s, [k]: v } : s)
    if (k === 'poles') { // 2-pole consumes same-side next slot (num+2)
      const twin = num + 2
      ns = ns.map(s => s.num === twin ? { ...s, linkedTo: v === 2 ? num : undefined, description: v === 2 ? '' : s.description } : s)
    }
    return { ...l, slots: ns }
  }))
  const filled = slots.filter(s => s.description && !s.linkedTo)
  return <div style={{ marginTop: 6 }}>
    <div className="row" style={{ marginBottom: 0 }}>
      <button className="b" style={{ fontSize: 8, flex: 1 }} onClick={() => setOpen(!open)}>{open ? 'Hide' : 'Edit'} schedule ({filled.length})</button>
      <button className="b" style={{ fontSize: 8, color: 'var(--gn)' }} onClick={() => printPanel(label)}>A5 Print</button>
    </div>
    {open && <div style={{ maxHeight: 300, overflowY: 'auto', marginTop: 4 }}>
      {slots.map(s => s.linkedTo ? <div key={s.num} className="row" style={{ marginBottom: 2, opacity: .35, fontSize: 9 }}><span className="m" style={{ width: 18 }}>{s.num}</span><span style={{ flex: 1, fontStyle: 'italic' }}>↳ 2-pole w/ #{s.linkedTo}</span></div> :
      <div key={s.num} className="row" style={{ marginBottom: 3 }}>
        <span className="m" style={{ width: 18, fontSize: 10, fontWeight: 700, color: s.num % 2 ? 'var(--sc)' : 'var(--ac)' }}>{s.num}</span>
        <select className="fi" style={{ maxWidth: 52, fontSize: 10, padding: '5px 2px' }} value={s.amps} onChange={e => upd(s.num, 'amps', Number(e.target.value))}>{AMPS.map(a => <option key={a}>{a}</option>)}</select>
        <button className="b" style={{ fontSize: 9, padding: '4px 7px', minWidth: 34, color: s.poles === 2 ? 'var(--ac)' : 'var(--t3)' }} onClick={() => upd(s.num, 'poles', s.poles === 2 ? 1 : 2)}>{s.poles === 2 ? '2P' : '1P'}</button>
        <select className="fi" style={{ maxWidth: 62, fontSize: 9, padding: '5px 2px' }} value={s.breakerType} onChange={e => upd(s.num, 'breakerType', e.target.value)}>{BREAKER_TYPES.map(b => <option key={b} value={b}>{b === 'standard' ? 'std' : b}</option>)}</select>
        <input className="fi" style={{ fontSize: 11, padding: '5px 6px' }} placeholder="feeds…" value={s.description} onChange={e => upd(s.num, 'description', e.target.value)} />
      </div>)}
    </div>}
  </div>
}

// A5 laminate-ready panel schedule: odd column left, even right, like the physical panel
function printPanel(l) {
  const slots = l.slots || []
  const cell = s => {
    if (!s) return '<div class="cell empty"></div>'
    if (s.linkedTo) return ''
    const h = s.poles === 2 ? ' tall' : ''
    const bt = s.breakerType && s.breakerType !== 'standard' ? `<span class="bt ${s.breakerType}">${s.breakerType.toUpperCase()}</span>` : ''
    return `<div class="cell${h}${s.description ? '' : ' empty'}"><span class="n">${s.num}${s.poles === 2 ? '·' + (s.num + 2) : ''}</span><span class="a">${s.amps}A${s.poles === 2 ? ' 2P' : ''}</span>${bt}<span class="d">${s.description || ''}</span></div>`
  }
  const col = odd => slots.filter(s => (s.num % 2 === 1) === odd).map(cell).join('')
  const w = window.open('', '_blank')
  w.document.write(`<!DOCTYPE html><html><head><title>${l.name}</title><style>
@page{size:A5 portrait;margin:8mm}
*{margin:0;padding:0;box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
body{padding:4mm;color:#111}
.hdr{text-align:center;border:2.5px solid #111;border-radius:4px;padding:5px 8px;margin-bottom:5px}
.hdr h1{font-size:15px;letter-spacing:.5px}
.hdr .sub{font-size:9px;color:#444;margin-top:2px;display:flex;justify-content:center;gap:14px}
.hdr .sub b{font-size:11px;color:#111}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 5px}
.cell{display:flex;align-items:center;gap:5px;border:1px solid #333;border-radius:3px;padding:3px 5px;margin-bottom:2.5px;min-height:8mm;background:#fff}
.cell.tall{min-height:17mm;background:#f5f5f5}
.cell.empty{background:#fafafa;border-style:dashed;border-color:#bbb}
.n{font-weight:800;font-size:9px;min-width:16px;color:#111}
.a{font-size:9px;font-weight:700;color:#111;min-width:26px}
.bt{font-size:6.5px;font-weight:800;padding:1px 3px;border-radius:2px;border:1px solid #111}
.bt.gfci{background:#111;color:#fff}.bt.afci{background:#555;color:#fff}.bt.dual{background:#000;color:#fff}
.d{font-size:9.5px;flex:1;line-height:1.15}
.ft{margin-top:5px;font-size:7.5px;color:#666;text-align:center;display:flex;justify-content:space-between}
</style></head><body>
<div class="hdr"><h1>${l.name.toUpperCase()}</h1><div class="sub"><span>MAIN <b>${l.mainBreaker || '—'}A</b></span><span>PHASE <b>${l.phase || 1}</b></span>${l.description ? `<span>${l.description}</span>` : ''}</div></div>
<div class="grid"><div>${col(true)}</div><div>${col(false)}</div></div>
<div class="ft"><span>${new Date().toLocaleDateString()}</span><span>ID ${l.id}</span></div>
<script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
}
