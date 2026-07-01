import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
const money = n => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const pathLen = pts => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0)
function ptInPoly(p, poly) { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { if ((poly[i].y > p.y) !== (poly[j].y > p.y) && p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) ins = !ins } return ins }
function polyArea(pts) { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y); return Math.abs(a / 2) }
function ptToSeg(p, a, b) { const l2 = dist(a, b) ** 2; if (!l2) return dist(p, a); let t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2)); return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }) }

export const DEF_DEVICES = [
  { type: 'receptacle', label: 'Receptacle', symbol: 'R', color: '#4DC978', cost: 3 },
  { type: 'gfci', label: 'GFCI', symbol: 'GF', color: '#4DC978', cost: 22 },
  { type: 'afci', label: 'AFCI Recep', symbol: 'AF', color: '#47B5A0', cost: 35 },
  { type: 'afcigfci', label: 'AFCI/GFCI', symbol: 'AG', color: '#47B5A0', cost: 45 },
  { type: 'switch', label: 'Switch', symbol: 'S', color: '#3B9AE1', cost: 4 },
  { type: '3way', label: '3-Way', symbol: 'S3', color: '#3B9AE1', cost: 8 },
  { type: 'dimmer', label: 'Dimmer', symbol: 'D', color: '#3B9AE1', cost: 18 },
  { type: 'light', label: 'Light', symbol: 'L', color: '#E8A838', cost: 25 },
  { type: 'recessed', label: 'Recessed', symbol: 'RC', color: '#E8A838', cost: 30 },
  { type: 'fan', label: 'Fan', symbol: 'F', color: '#E8A838', cost: 80 },
  { type: 'smoke', label: 'Smoke Det', symbol: 'SD', color: '#E05252', cost: 25 },
  { type: 'co', label: 'CO Det', symbol: 'CO', color: '#E05252', cost: 28 },
  { type: 'jbox', label: 'Junction Box', symbol: 'JB', color: '#8B8F9A', cost: 4 },
  { type: 'panel', label: 'Panel', symbol: 'P', color: '#B06AE0', cost: 250 },
  { type: 'disconnect', label: 'Disconnect', symbol: 'DC', color: '#B06AE0', cost: 45 },
  { type: 'data', label: 'Data/CAT6', symbol: 'DT', color: '#47B5A0', cost: 12 },
  { type: 'tv', label: 'TV/Coax', symbol: 'TV', color: '#47B5A0', cost: 8 },
  { type: 'exterior', label: 'Ext WP Recep', symbol: 'WP', color: '#4DC978', cost: 30 },
  { type: 'range', label: '240V Recep', symbol: '240', color: '#E05252', cost: 25 },
]
const ROOM_TYPES = ['bedroom', 'bathroom', 'kitchen', 'living', 'dining', 'hallway', 'laundry', 'garage', 'basement', 'closet', 'outdoor', 'office', 'commercial', 'untyped']
const NEC_RULES = {
  bedroom: { spacing: 6, gfci: false, afci: true, smoke: true, co: true, light: true, minReceps: 2 },
  bathroom: { spacing: 0, gfci: true, afci: false, smoke: false, co: false, light: true, minReceps: 1 },
  kitchen: { spacing: 4, gfci: true, afci: true, smoke: false, co: false, light: true, minReceps: 2 },
  living: { spacing: 6, gfci: false, afci: true, smoke: true, co: false, light: true, minReceps: 2 },
  dining: { spacing: 6, gfci: false, afci: true, smoke: false, co: false, light: true, minReceps: 2 },
  hallway: { spacing: 10, gfci: false, afci: true, smoke: true, co: true, light: true, minReceps: 1 },
  laundry: { spacing: 0, gfci: true, afci: true, smoke: false, co: false, light: true, minReceps: 1 },
  garage: { spacing: 0, gfci: true, afci: false, smoke: false, co: false, light: true, minReceps: 1 },
  basement: { spacing: 6, gfci: true, afci: false, smoke: true, co: true, light: true, minReceps: 1 },
  closet: { spacing: 0, gfci: false, afci: false, smoke: false, co: false, light: true, minReceps: 0 },
  outdoor: { spacing: 0, gfci: true, afci: false, smoke: false, co: false, light: false, minReceps: 1 },
  office: { spacing: 6, gfci: false, afci: true, smoke: true, co: false, light: true, minReceps: 2 },
  commercial: { spacing: 12, gfci: false, afci: false, smoke: false, co: false, light: true, minReceps: 1 },
}
const CONDUIT_TYPES = ['EMT', 'Rigid', 'PVC', 'MC Cable', 'Flex']
const CONDUIT_SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"']
const WIRE_GAUGES = ['14', '12', '10', '8', '6', '4', '2', '1/0', '2/0']
const BEND_RADII_IN = { '1/2"': 4, '3/4"': 4.5, '1"': 5.75, '1-1/4"': 7.25, '1-1/2"': 8.25, '2"': 9.5 }
const bendRadiusFt = s => (BEND_RADII_IN[s] || 6) / 12
const WIRE_VOLUME = { '14': 2.0, '12': 2.25, '10': 2.5, '8': 3.0, '6': 5.0, '4': 7.0, '2': 8.0, '1/0': 12.0, '2/0': 14.0 }
const BOX_SIZES = [
  { name: '4" sq x 1-1/4"', cuIn: 18 }, { name: '4" sq x 1-1/2"', cuIn: 21 }, { name: '4" sq x 2-1/8"', cuIn: 30.3 },
  { name: '4-11/16" x 1-1/2"', cuIn: 25.5 }, { name: '4-11/16" x 2-1/8"', cuIn: 42 },
  { name: 'Single gang', cuIn: 18 }, { name: 'Single gang deep', cuIn: 22.5 }, { name: '2-gang', cuIn: 34 }, { name: '3-gang', cuIn: 52.5 },
]
const DEVICE_BOX_TYPES = ['receptacle', 'gfci', 'afci', 'afcigfci', 'switch', '3way', 'dimmer']

function cornerAngle(a, b, c) { const ba = { x: a.x - b.x, y: a.y - b.y }, bc = { x: c.x - b.x, y: c.y - b.y }; return Math.atan2(Math.abs(ba.x * bc.y - ba.y * bc.x), ba.x * bc.x + ba.y * bc.y) }
function splinePathLen(pts, r) {
  if (pts.length < 2) return 0
  let t = 0; for (let i = 0; i < pts.length - 1; i++) t += dist(pts[i], pts[i + 1])
  for (let i = 1; i < pts.length - 1; i++) {
    const a = cornerAngle(pts[i - 1], pts[i], pts[i + 1]), turn = Math.PI - a
    if (turn < 0.01) continue
    const rr = Math.min(r, dist(pts[i - 1], pts[i]) * .4, dist(pts[i], pts[i + 1]) * .4)
    t += rr * turn - 2 * (rr / Math.tan(a / 2))
  }
  return t
}
function countBends(pts) { const b = { total: 0, n90: 0, n45: 0 }; for (let i = 1; i < pts.length - 1; i++) { const d = (Math.PI - cornerAngle(pts[i - 1], pts[i], pts[i + 1])) * 180 / Math.PI; if (d < 5) continue; b.total++; if (Math.abs(d - 90) < 10) b.n90++; else if (Math.abs(d - 45) < 10) b.n45++ } return b }
function drawSpline(ctx, pts, r) {
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
  if (pts.length === 2) ctx.lineTo(pts[1].x, pts[1].y)
  else { for (let i = 1; i < pts.length - 1; i++) { const rr = Math.min(r, dist(pts[i - 1], pts[i]) * .4, dist(pts[i], pts[i + 1]) * .4); ctx.arcTo(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, Math.max(rr, 1)) } ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y) }
}
function perimeterPlacements(area, spacing, pxft) {
  const sp = spacing * pxft, out = []; let acc = sp / 2
  for (let i = 0; i < area.points.length; i++) {
    const a = area.points[i], b = area.points[(i + 1) % area.points.length], L = dist(a, b)
    let pos = acc > L ? L + 1 : acc
    while (pos <= L) { const t = pos / L; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); pos += sp }
    acc = pos - L
  }
  return out
}
function checkCompliance(areas, devs, pxft) {
  const issues = []
  ;(areas || []).forEach(area => {
    const rules = NEC_RULES[area.roomType]; if (!rules) return
    const inA = devs.filter(d => ptInPoly(d, area.points))
    const receps = inA.filter(d => ['receptacle', 'gfci', 'afci', 'afcigfci', 'exterior'].includes(d.type))
    const cx = area.points.reduce((s, p) => s + p.x, 0) / area.points.length, cy = area.points.reduce((s, p) => s + p.y, 0) / area.points.length
    if (rules.spacing > 0 && pxft > 0) {
      const perim = pathLen([...area.points, area.points[0]]) / pxft
      const need = Math.max(rules.minReceps, Math.ceil(perim / (rules.spacing * 2)))
      if (receps.length < need) {
        const sugg = perimeterPlacements(area, rules.spacing * 2, pxft).slice(0, need - receps.length).map(p => ({ type: rules.afci ? 'afci' : 'receptacle', ...p }))
        issues.push({ areaId: area.id, sev: 'error', msg: `${area.label}: needs ${need} receptacles (has ${receps.length}) — NEC 210.52`, suggest: sugg })
      }
    } else if (rules.minReceps > 0 && receps.length < rules.minReceps) {
      issues.push({ areaId: area.id, sev: 'error', msg: `${area.label}: needs ${rules.minReceps} receptacle(s)`, suggest: [{ type: rules.gfci ? 'gfci' : 'receptacle', x: cx, y: cy }] })
    }
    if (rules.gfci && receps.length > 0 && !receps.some(d => ['gfci', 'afcigfci', 'exterior'].includes(d.type))) issues.push({ areaId: area.id, sev: 'error', msg: `${area.label}: GFCI protection required`, suggest: [] })
    if (rules.afci && receps.length > 0 && !receps.some(d => ['afci', 'afcigfci'].includes(d.type))) issues.push({ areaId: area.id, sev: 'warning', msg: `${area.label}: AFCI required (NEC 210.12)`, suggest: [] })
    if (rules.smoke && !inA.some(d => d.type === 'smoke')) issues.push({ areaId: area.id, sev: 'error', msg: `${area.label}: smoke detector required`, suggest: [{ type: 'smoke', x: cx, y: cy - 15 }] })
    if (rules.co && !inA.some(d => d.type === 'co')) issues.push({ areaId: area.id, sev: 'warning', msg: `${area.label}: CO detector recommended`, suggest: [{ type: 'co', x: cx, y: cy + 15 }] })
    if (rules.light && !inA.some(d => ['light', 'recessed', 'fan'].includes(d.type))) issues.push({ areaId: area.id, sev: 'info', msg: `${area.label}: no light fixture`, suggest: [{ type: 'light', x: cx, y: cy }] })
  })
  return issues
}
function calcBoxFill(dev, conduits, pxft) {
  const th = 1.5 * (pxft || 20)
  const near = (conduits || []).filter(c => c.points.some((p, i) => dist(dev, p) < th || (i > 0 && ptToSeg(dev, c.points[i - 1], p) < th)))
  const isDev = DEVICE_BOX_TYPES.includes(dev.type)
  let conds = [], lg = '14', rank = g => WIRE_GAUGES.indexOf(g)
  near.forEach(c => (c.circuits || []).forEach(ci => { conds.push({ g: ci.gauge || '12', n: ci.conductors || 2, r: ci.name || c.size + ' ' + c.type }); if (rank(ci.gauge) > rank(lg)) lg = ci.gauge }))
  if (!conds.length) return null
  const vol = g => WIRE_VOLUME[g] || 2.25
  let total = 0; const br = []
  conds.forEach(c => { const v = c.n * vol(c.g); total += v; br.push({ l: `${c.r} (#${c.g} x${c.n})`, v }) })
  total += vol(lg); br.push({ l: `EGC (1x #${lg})`, v: vol(lg) })
  total += vol(lg); br.push({ l: `Clamps (1x #${lg})`, v: vol(lg) })
  if (isDev) { total += 2 * vol(lg); br.push({ l: `Device (2x #${lg})`, v: 2 * vol(lg) }) }
  const minBox = BOX_SIZES.filter(b => b.cuIn >= total).sort((a, b) => a.cuIn - b.cuIn)[0]
  const assigned = dev.boxSize ? BOX_SIZES.find(b => b.name === dev.boxSize) : null
  const cap = assigned ? assigned.cuIn : minBox ? minBox.cuIn : total
  return { total: Math.round(total * 100) / 100, br, minBox, over: assigned ? total > assigned.cuIn : false, pct: Math.round(total / cap * 100) }
}

export default function Takeoff({ projects, setProjects }) {
  const [pid, setPid] = useState(projects[0]?.id || '')
  const proj = projects.find(p => p.id === pid)
  const tk = proj?.takeoff || {}
  const setTk = patch => setProjects(projects.map(p => p.id === pid ? { ...p, takeoff: { ...(p.takeoff || {}), ...patch } } : p))
  const cvs = useRef(), wrap = useRef(), fileRef = useRef()
  const [img, setImg] = useState(null)
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 })
  const [tool, setTool] = useState('pan')
  const [devType, setDevType] = useState('receptacle')
  const [scalePts, setScalePts] = useState([]), [scaleFt, setScaleFt] = useState('')
  const [areaPts, setAreaPts] = useState([]), [areaLabel, setAreaLabel] = useState(''), [areaRoom, setAreaRoom] = useState('untyped')
  const [condPts, setCondPts] = useState([]), [condType, setCondType] = useState('EMT'), [condSize, setCondSize] = useState('3/4"'), [condDrop, setCondDrop] = useState('')
  const [sel, setSel] = useState(null), [mouse, setMouse] = useState(null)
  const [issues, setIssues] = useState([]), [showCode, setShowCode] = useState(false)
  const [fills, setFills] = useState({}), [showFill, setShowFill] = useState(false)
  const [showEst, setShowEst] = useState(false)
  const drag = useRef(null)
  const pxft = tk.scale || 0

  useEffect(() => { if (tk.planImg) { const i = new Image(); i.onload = () => setImg(i); i.src = tk.planImg } else setImg(null) }, [tk.planImg])

  const toWorld = e => { const r = cvs.current.getBoundingClientRect(); return { x: (e.clientX - r.left - pan.x) / zoom, y: (e.clientY - r.top - pan.y) / zoom } }

  const totalSqft = Math.round((tk.areas || []).reduce((s, a) => s + (a.sqft || 0), 0))
  const totalDevs = (tk.devices || []).length
  const totalCond = (tk.conduits || []).reduce((s, c) => s + (c.totalFt || 0), 0)
  const devCost = (tk.devices || []).reduce((s, d) => s + (DEF_DEVICES.find(x => x.type === d.type)?.cost || 0), 0)
  const condBOM = useMemo(() => { const b = {}; (tk.conduits || []).forEach(c => { const k = c.size + ' ' + c.type; b[k] = b[k] || { ft: 0, sticks: 0, straps: 0, coup: 0, bends: 0 }; b[k].ft += c.totalFt; b[k].sticks += c.sticks; b[k].straps += c.straps; b[k].coup += c.couplings; b[k].bends += c.bends || 0 }); return b }, [tk.conduits])
  const wireTotals = useMemo(() => { const w = {}; (tk.conduits || []).forEach(c => (c.circuits || []).forEach(ci => { const k = '#' + ci.gauge + ' x' + ci.conductors; w[k] = (w[k] || 0) + c.totalFt + 10 })); return w }, [tk.conduits])
  const devCounts = useMemo(() => { const c = {}; (tk.devices || []).forEach(d => c[d.type] = (c[d.type] || 0) + 1); return c }, [tk.devices])

  const hist = useMemo(() => projects.filter(p => p.takeoff && p.id !== pid).map(p => {
    const t = p.takeoff, sq = (t.areas || []).reduce((s, a) => s + (a.sqft || 0), 0), dv = (t.devices || []).length
    const cf = (t.conduits || []).reduce((s, c) => s + (c.totalFt || 0), 0)
    const dc = (t.devices || []).reduce((s, d) => s + (DEF_DEVICES.find(x => x.type === d.type)?.cost || 0), 0)
    return { name: p.name, sq, dv, cf, dc, dps: sq ? dv / sq : 0, cps: sq ? dc / sq : 0, cfs: sq ? cf / sq : 0 }
  }).filter(d => d.sq > 0 && d.dv > 2), [projects, pid])
  const est = useMemo(() => {
    if (!hist.length) return null
    const avg = k => hist.reduce((s, d) => s + d[k], 0) / hist.length
    return { n: hist.length, dps: avg('dps'), cps: avg('cps'), cfs: avg('cfs'), conf: hist.length >= 5 ? 'high' : hist.length >= 3 ? 'medium' : 'low' }
  }, [hist])

  const finishArea = () => {
    if (areaPts.length < 3) return
    const sqft = pxft > 0 ? Math.round(polyArea(areaPts) / pxft / pxft) : 0
    setTk({ areas: [...(tk.areas || []), { id: uid(), label: areaLabel || 'Area ' + ((tk.areas || []).length + 1), points: areaPts, sqft, roomType: areaRoom }] })
    setAreaPts([]); setAreaLabel('')
  }
  const finishConduit = () => {
    if (condPts.length < 2) return
    const rPx = pxft > 0 ? bendRadiusFt(condSize) * pxft : 0
    const len = pxft > 0 ? splinePathLen(condPts, rPx) / pxft : 0
    const drop = Number(condDrop) || 0, total = Math.round((len + drop) * 10) / 10
    const b = countBends(condPts)
    setTk({ conduits: [...(tk.conduits || []), { id: uid(), points: [...condPts], type: condType, size: condSize, totalFt: total, dropFt: drop, sticks: Math.ceil(total / 10), straps: Math.ceil(total / 10), couplings: Math.max(Math.ceil(total / 10) - 1, 0), bends: b.total, bends90: b.n90, circuits: [] }] })
    setCondPts([]); setCondDrop('')
  }
  const runCode = () => { setIssues(checkCompliance(tk.areas, tk.devices || [], pxft)); setShowCode(true) }
  const runFill = () => { const r = {}; (tk.devices || []).filter(d => ['jbox', ...DEVICE_BOX_TYPES].includes(d.type)).forEach(d => { const f = calcBoxFill(d, tk.conduits, pxft); if (f) r[d.id] = f }); setFills(r); setShowFill(true) }
  const placeSugg = s => setTk({ devices: [...(tk.devices || []), { id: uid(), type: s.type, x: s.x, y: s.y }] })
  const placeAll = () => { const all = issues.flatMap(i => i.suggest); if (!all.length || !window.confirm('Place ' + all.length + ' devices?')) return; setTk({ devices: [...(tk.devices || []), ...all.map(s => ({ id: uid(), type: s.type, x: s.x, y: s.y }))] }); setTimeout(runCode, 50) }

  const onDown = e => {
    if (!proj) return
    const w = toWorld(e)
    if (tool === 'pan') {
      const hit = (tk.devices || []).find(d => dist(w, d) < 12 / zoom)
      if (hit) { setSel({ type: 'device', id: hit.id }); drag.current = { id: hit.id, off: { x: hit.x - w.x, y: hit.y - w.y } }; return }
      const hitC = (tk.conduits || []).find(c => c.points.some((p, i) => i > 0 && ptToSeg(w, c.points[i - 1], p) < 8 / zoom))
      if (hitC) { setSel({ type: 'conduit', id: hitC.id }); return }
      setSel(null); drag.current = { pan: true, sx: e.clientX - pan.x, sy: e.clientY - pan.y }
    }
    else if (tool === 'device') setTk({ devices: [...(tk.devices || []), { id: uid(), type: devType, x: w.x, y: w.y }] })
    else if (tool === 'scale') { const n = [...scalePts, w]; setScalePts(n.slice(-2)) }
    else if (tool === 'area') setAreaPts([...areaPts, w])
    else if (tool === 'conduit') setCondPts([...condPts, w])
    else if (tool === 'erase') {
      const hit = (tk.devices || []).find(d => dist(w, d) < 12 / zoom)
      if (hit) return setTk({ devices: tk.devices.filter(d => d.id !== hit.id) })
      const hitC = (tk.conduits || []).find(c => c.points.some((p, i) => i > 0 && ptToSeg(w, c.points[i - 1], p) < 8 / zoom))
      if (hitC) return setTk({ conduits: tk.conduits.filter(c => c.id !== hitC.id) })
      const hitA = (tk.areas || []).find(a => ptInPoly(w, a.points))
      if (hitA && window.confirm('Delete area ' + hitA.label + '?')) setTk({ areas: tk.areas.filter(a => a.id !== hitA.id) })
    }
  }
  const onMove = e => {
    const w = toWorld(e); setMouse(w)
    if (drag.current?.pan) setPan({ x: e.clientX - drag.current.sx, y: e.clientY - drag.current.sy })
    else if (drag.current?.id) setTk({ devices: tk.devices.map(d => d.id === drag.current.id ? { ...d, x: w.x + drag.current.off.x, y: w.y + drag.current.off.y } : d) })
  }
  const onUp = () => { drag.current = null }
  const onWheel = e => { e.preventDefault(); const f = e.deltaY < 0 ? 1.1 : 0.9; const r = cvs.current.getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; setPan(p => ({ x: mx - (mx - p.x) * f, y: my - (my - p.y) * f })); setZoom(z => Math.max(.1, Math.min(10, z * f))) }

  const setScale = () => { if (scalePts.length === 2 && Number(scaleFt) > 0) { setTk({ scale: dist(scalePts[0], scalePts[1]) / Number(scaleFt) }); setScalePts([]); setScaleFt(''); setTool('pan') } }
  const upload = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => setTk({ planImg: r.result }); r.readAsDataURL(f) }

  useEffect(() => {
    const c = cvs.current; if (!c || !wrap.current) return
    c.width = wrap.current.clientWidth; c.height = Math.max(420, window.innerHeight - 260)
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#0F1115'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom)
    if (img) { ctx.globalAlpha = .85; ctx.drawImage(img, 0, 0); ctx.globalAlpha = 1 }
    ;(tk.areas || []).forEach(a => {
      ctx.beginPath(); ctx.moveTo(a.points[0].x, a.points[0].y); a.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath()
      ctx.fillStyle = 'rgba(59,154,225,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(59,154,225,.5)'; ctx.lineWidth = 1.5 / zoom; ctx.stroke()
      const cx = a.points.reduce((s, p) => s + p.x, 0) / a.points.length, cy = a.points.reduce((s, p) => s + p.y, 0) / a.points.length
      ctx.fillStyle = '#3B9AE1'; ctx.font = `${Math.max(9, 11 / zoom)}px DM Sans`; ctx.textAlign = 'center'
      ctx.fillText(`${a.label} · ${a.sqft}sf${a.roomType !== 'untyped' ? ' · ' + a.roomType : ''}`, cx, cy)
    })
    ;(tk.conduits || []).forEach(cd => {
      const isSel = sel?.type === 'conduit' && sel.id === cd.id
      const rPx = pxft > 0 ? bendRadiusFt(cd.size) * pxft : 12 / zoom
      drawSpline(ctx, cd.points, rPx)
      ctx.strokeStyle = isSel ? '#E8A838' : 'rgba(232,168,56,.6)'; ctx.lineWidth = (isSel ? 3.5 : 2) / zoom; ctx.stroke()
      cd.points.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3 / zoom, 0, 7); ctx.fillStyle = '#E8A838'; ctx.fill() })
      const mp = cd.points[Math.floor(cd.points.length / 2)]
      ctx.fillStyle = 'rgba(15,17,21,.75)'; const txt = `${cd.size} ${cd.type} ${cd.totalFt}ft${cd.bends ? ' ' + cd.bends + 'b' : ''}`
      ctx.fillRect(mp.x - txt.length * 3 / zoom, mp.y - 15 / zoom, txt.length * 6 / zoom, 12 / zoom)
      ctx.fillStyle = '#E8A838'; ctx.font = `${Math.max(8, 10 / zoom)}px JetBrains Mono`; ctx.textAlign = 'center'; ctx.fillText(txt, mp.x, mp.y - 5 / zoom)
    })
    if (condPts.length) {
      const pv = mouse && tool === 'conduit' ? [...condPts, mouse] : condPts
      const rPx = pxft > 0 ? bendRadiusFt(condSize) * pxft : 12 / zoom
      drawSpline(ctx, pv, rPx); ctx.strokeStyle = '#E8A838'; ctx.lineWidth = 2 / zoom; ctx.setLineDash([4 / zoom, 4 / zoom]); ctx.stroke(); ctx.setLineDash([])
      if (pxft > 0 && mouse) { ctx.fillStyle = '#E8A838'; ctx.font = `${11 / zoom}px JetBrains Mono`; ctx.textAlign = 'left'; ctx.fillText((splinePathLen(pv, rPx) / pxft).toFixed(1) + 'ft', mouse.x + 10 / zoom, mouse.y - 5 / zoom) }
    }
    if (areaPts.length) {
      ctx.beginPath(); ctx.moveTo(areaPts[0].x, areaPts[0].y); areaPts.forEach(p => ctx.lineTo(p.x, p.y)); if (mouse && tool === 'area') ctx.lineTo(mouse.x, mouse.y)
      ctx.strokeStyle = '#3B9AE1'; ctx.lineWidth = 1.5 / zoom; ctx.setLineDash([4 / zoom, 4 / zoom]); ctx.stroke(); ctx.setLineDash([])
    }
    if (scalePts.length) {
      ctx.beginPath(); ctx.moveTo(scalePts[0].x, scalePts[0].y); ctx.lineTo((scalePts[1] || mouse || scalePts[0]).x, (scalePts[1] || mouse || scalePts[0]).y)
      ctx.strokeStyle = '#4DC978'; ctx.lineWidth = 2 / zoom; ctx.stroke()
      scalePts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 4 / zoom, 0, 7); ctx.fillStyle = '#4DC978'; ctx.fill() })
    }
    ;(tk.devices || []).forEach(d => {
      const def = DEF_DEVICES.find(x => x.type === d.type) || DEF_DEVICES[0]
      const r = 9 / zoom, isSel = sel?.type === 'device' && sel.id === d.id
      ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, 7); ctx.fillStyle = def.color; ctx.fill()
      if (isSel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 / zoom; ctx.stroke() }
      ctx.fillStyle = '#0F1115'; ctx.font = `bold ${Math.max(7, 8 / zoom)}px DM Sans`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(def.symbol, d.x, d.y); ctx.textBaseline = 'alphabetic'
      if (showFill && fills[d.id]) {
        const f = fills[d.id], col = f.over ? '#E05252' : f.pct > 80 ? '#E8A838' : '#4DC978'
        ctx.beginPath(); ctx.arc(d.x, d.y, r + 4 / zoom, -Math.PI / 2, -Math.PI / 2 + Math.min(f.pct, 100) / 100 * 7); ctx.strokeStyle = col; ctx.lineWidth = 3 / zoom; ctx.stroke()
        ctx.fillStyle = col; ctx.font = `${7 / zoom}px JetBrains Mono`; ctx.fillText(f.total + 'ci', d.x, d.y + r + 12 / zoom)
      }
    })
    if (showCode) issues.forEach(i => i.suggest.forEach(s => {
      const def = DEF_DEVICES.find(x => x.type === s.type) || DEF_DEVICES[0]
      ctx.beginPath(); ctx.arc(s.x, s.y, 9 / zoom, 0, 7); ctx.fillStyle = def.color + '55'; ctx.fill()
      ctx.setLineDash([3 / zoom, 3 / zoom]); ctx.strokeStyle = '#E05252'; ctx.lineWidth = 1.5 / zoom; ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = '#E05252'; ctx.font = `bold ${8 / zoom}px DM Sans`; ctx.textAlign = 'center'; ctx.fillText(def.symbol, s.x, s.y + 3 / zoom)
    }))
    ctx.restore()
    ctx.fillStyle = '#8B8F9A'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'left'
    ctx.fillText(pxft > 0 ? `scale: ${pxft.toFixed(1)}px/ft · zoom ${(zoom * 100).toFixed(0)}%` : 'NO SCALE SET — use Scale tool', 10, c.height - 10)
  })

  if (!projects.length) return <div className="empty">Create a project on the Dashboard first.</div>
  const selDev = sel?.type === 'device' ? (tk.devices || []).find(d => d.id === sel.id) : null
  const selFill = selDev ? calcBoxFill(selDev, tk.conduits, pxft) : null
  const selCond = sel?.type === 'conduit' ? (tk.conduits || []).find(c => c.id === sel.id) : null

  return <div>
    <div className="row" style={{ padding: '8px 12px', flexWrap: 'wrap', borderBottom: '1px solid var(--bd)', marginBottom: 0 }}>
      <select className="fi" style={{ flex: '0 0 150px' }} value={pid} onChange={e => setPid(e.target.value)}>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <button className="b" onClick={() => fileRef.current.click()}>Plan Image</button>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={upload} />
      {['pan', 'scale', 'device', 'area', 'conduit', 'erase'].map(t => <button key={t} className={'b' + (tool === t ? ' ba' : '')} onClick={() => setTool(t)}>{t}</button>)}
      {(tk.areas || []).some(a => a.roomType !== 'untyped') && <button className="b" style={{ color: issues.length ? 'var(--rd)' : 'var(--sc)' }} onClick={runCode}>Code{issues.length ? ` (${issues.length})` : ''}</button>}
      {(tk.conduits || []).some(c => c.circuits?.length) && <button className="b" style={{ color: '#B06AE0' }} onClick={runFill}>Box Fill</button>}
      {est && <button className="b" style={{ color: '#B06AE0' }} onClick={() => setShowEst(true)}>Estimate</button>}
    </div>
    {tool === 'scale' && <div className="row" style={{ padding: '6px 12px', background: 'var(--bg2)' }}><span style={{ fontSize: 11, color: 'var(--t3)' }}>Click 2 points of known distance:</span><input className="fi" style={{ maxWidth: 90 }} type="number" placeholder="feet" value={scaleFt} onChange={e => setScaleFt(e.target.value)} /><button className="b ba" onClick={setScale} disabled={scalePts.length < 2}>Set Scale</button></div>}
    {tool === 'device' && <div className="row" style={{ padding: '6px 12px', background: 'var(--bg2)', flexWrap: 'wrap' }}>{DEF_DEVICES.map(d => <button key={d.type} className={'b' + (devType === d.type ? ' ba' : '')} style={{ fontSize: 9, padding: '3px 7px', borderColor: devType === d.type ? d.color : undefined, color: devType === d.type ? d.color : undefined }} onClick={() => setDevType(d.type)}>{d.symbol} {d.label}</button>)}</div>}
    {tool === 'area' && <div className="row" style={{ padding: '6px 12px', background: 'var(--bg2)' }}><input className="fi" style={{ maxWidth: 160 }} placeholder="Area label" value={areaLabel} onChange={e => setAreaLabel(e.target.value)} /><select className="fi" style={{ maxWidth: 130 }} value={areaRoom} onChange={e => setAreaRoom(e.target.value)}>{ROOM_TYPES.map(r => <option key={r}>{r}</option>)}</select><button className="b ba" onClick={finishArea} disabled={areaPts.length < 3}>Finish ({areaPts.length} pts)</button><button className="b" onClick={() => setAreaPts([])}>Clear</button></div>}
    {tool === 'conduit' && <div className="row" style={{ padding: '6px 12px', background: 'var(--bg2)', flexWrap: 'wrap' }}><select className="fi" style={{ maxWidth: 100 }} value={condType} onChange={e => setCondType(e.target.value)}>{CONDUIT_TYPES.map(t => <option key={t}>{t}</option>)}</select><select className="fi" style={{ maxWidth: 80 }} value={condSize} onChange={e => setCondSize(e.target.value)}>{CONDUIT_SIZES.map(s => <option key={s}>{s}</option>)}</select><input className="fi" style={{ maxWidth: 90 }} type="number" placeholder="drop ft" value={condDrop} onChange={e => setCondDrop(e.target.value)} /><button className="b ba" onClick={finishConduit} disabled={condPts.length < 2}>Finish ({condPts.length})</button><button className="b" onClick={() => setCondPts([])}>Clear</button></div>}
    <div style={{ display: 'flex' }}>
      <div ref={wrap} style={{ flex: 1, overflow: 'hidden' }}>
        <canvas ref={cvs} style={{ display: 'block', cursor: tool === 'pan' ? 'grab' : 'crosshair', touchAction: 'none' }} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} onWheel={onWheel} />
      </div>
      <div style={{ width: 230, borderLeft: '1px solid var(--bd)', padding: 8, fontSize: 10, overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
        <div className="stats" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 8 }}>
          <div className="sc" style={{ padding: '6px 8px' }}><div className="sl">Devices</div><div className="sv" style={{ fontSize: 15 }}>{totalDevs}</div></div>
          <div className="sc" style={{ padding: '6px 8px' }}><div className="sl">Sqft</div><div className="sv" style={{ fontSize: 15 }}>{totalSqft}</div></div>
          <div className="sc" style={{ padding: '6px 8px' }}><div className="sl">Conduit</div><div className="sv" style={{ fontSize: 15 }}>{totalCond.toFixed(0)}ft</div></div>
          <div className="sc" style={{ padding: '6px 8px' }}><div className="sl">Dev Cost</div><div className="sv" style={{ fontSize: 15 }}>{money(devCost)}</div></div>
        </div>
        {Object.entries(devCounts).map(([t, n]) => { const d = DEF_DEVICES.find(x => x.type === t); return <div key={t} className="row" style={{ marginBottom: 2 }}><span style={{ color: d?.color, fontWeight: 700, width: 24 }}>{d?.symbol}</span><span style={{ flex: 1, color: 'var(--t2)' }}>{d?.label}</span><span className="m">{n}</span></div> })}
        {Object.keys(condBOM).length > 0 && <><div className="sl" style={{ margin: '8px 0 3px' }}>Conduit BOM</div>
          {Object.entries(condBOM).map(([k, v]) => <div key={k} className="card" style={{ padding: '5px 7px', marginBottom: 3 }}><div style={{ color: 'var(--ac)', fontWeight: 600 }}>{k}: {v.ft.toFixed(0)}ft</div><div style={{ color: 'var(--t3)', fontSize: 9 }}>sticks {v.sticks} · straps {v.straps} · coup {v.coup}{v.bends ? ' · bends ' + v.bends : ''}</div></div>)}</>}
        {Object.keys(wireTotals).length > 0 && <><div className="sl" style={{ margin: '8px 0 3px' }}>Wire</div>{Object.entries(wireTotals).map(([k, ft]) => <div key={k} className="row" style={{ marginBottom: 1 }}><span style={{ flex: 1, color: 'var(--t2)' }}>{k}</span><span className="m">{Math.ceil(ft)}ft</span></div>)}</>}
        {selCond && <div className="card" style={{ padding: 7, marginTop: 6 }}>
          <div style={{ fontWeight: 600, color: 'var(--ac)', marginBottom: 4 }}>{selCond.size} {selCond.type} · {selCond.totalFt}ft</div>
          <div className="sl">Circuits</div>
          {(selCond.circuits || []).map((ci, i) => <div key={i} className="row" style={{ marginBottom: 2 }}><span style={{ flex: 1 }}>{ci.name || 'ckt'} #{ci.gauge} x{ci.conductors}</span><button className="b" style={{ padding: '1px 6px' }} onClick={() => setTk({ conduits: tk.conduits.map(c => c.id === selCond.id ? { ...c, circuits: c.circuits.filter((_, j) => j !== i) } : c) })}>&times;</button></div>)}
          <AddCircuit onAdd={ci => setTk({ conduits: tk.conduits.map(c => c.id === selCond.id ? { ...c, circuits: [...(c.circuits || []), ci] } : c) })} />
        </div>}
        {selFill && <div className="card" style={{ padding: 7, marginTop: 6 }}>
          <div style={{ fontWeight: 600, color: '#B06AE0', marginBottom: 3 }}>Box Fill: {selFill.total} cu.in.</div>
          {selFill.minBox && <div style={{ color: 'var(--gn)', fontSize: 9, marginBottom: 3 }}>Min: {selFill.minBox.name}</div>}
          <select className="fi" style={{ fontSize: 9, padding: 3, width: '100%', marginBottom: 4 }} value={selDev.boxSize || ''} onChange={e => setTk({ devices: tk.devices.map(d => d.id === selDev.id ? { ...d, boxSize: e.target.value } : d) })}>
            <option value="">Auto (min)</option>{BOX_SIZES.map(b => <option key={b.name} value={b.name}>{b.name} ({b.cuIn}ci){b.cuIn < selFill.total ? ' UNDER!' : ''}</option>)}
          </select>
          {selFill.br.map((b, i) => <div key={i} className="row" style={{ marginBottom: 0, fontSize: 8 }}><span style={{ flex: 1, color: 'var(--t3)' }}>{b.l}</span><span className="m">{b.v.toFixed(2)}</span></div>)}
        </div>}
        {showCode && <div style={{ marginTop: 6 }}>
          <div className="row"><span className="sl" style={{ flex: 1 }}>Code Issues ({issues.length})</span><button className="b" style={{ padding: '1px 6px' }} onClick={() => setShowCode(false)}>&times;</button></div>
          {issues.length === 0 ? <div style={{ color: 'var(--gn)', fontSize: 9, padding: 4 }}>All rooms pass NEC checks ✓</div> : <>
            {issues.some(i => i.suggest.length) && <button className="b ba" style={{ width: '100%', marginBottom: 4 }} onClick={placeAll}>Auto-Place All</button>}
            {issues.map((i, k) => <div key={k} className="card" style={{ padding: '4px 6px', marginBottom: 2, borderColor: i.sev === 'error' ? 'rgba(224,82,82,.4)' : i.sev === 'warning' ? 'rgba(232,168,56,.4)' : 'var(--bd)' }}>
              <div style={{ fontSize: 9, color: i.sev === 'error' ? 'var(--rd)' : i.sev === 'warning' ? 'var(--ac)' : 'var(--sc)' }}>{i.msg}</div>
              {i.suggest.map((s, j) => <button key={j} className="b" style={{ fontSize: 8, padding: '1px 5px', marginTop: 2, marginRight: 2 }} onClick={() => placeSugg(s)}>+ {DEF_DEVICES.find(d => d.type === s.type)?.symbol}</button>)}
            </div>)}</>}
        </div>}
        {showFill && <div style={{ marginTop: 6 }}>
          <div className="row"><span className="sl" style={{ flex: 1 }}>Fill Check ({Object.keys(fills).length})</span><button className="b" style={{ padding: '1px 6px' }} onClick={() => setShowFill(false)}>&times;</button></div>
          {Object.entries(fills).sort((a, b) => b[1].pct - a[1].pct).map(([id, f]) => { const d = tk.devices.find(x => x.id === id); const def = DEF_DEVICES.find(x => x.type === d?.type); const col = f.over ? 'var(--rd)' : f.pct > 80 ? 'var(--ac)' : 'var(--gn)'; return <div key={id} className="row" style={{ marginBottom: 2, cursor: 'pointer' }} onClick={() => setSel({ type: 'device', id })}><span style={{ color: def?.color, fontWeight: 700, width: 22 }}>{def?.symbol}</span><div style={{ flex: 1, height: 3, background: 'var(--bg3)', borderRadius: 2 }}><div style={{ height: '100%', width: Math.min(f.pct, 100) + '%', background: col, borderRadius: 2 }} /></div><span className="m" style={{ color: col, fontSize: 8 }}>{f.total}ci</span></div> })}
        </div>}
      </div>
    </div>
    {showEst && <div className="mo" onClick={() => setShowEst(false)}><div className="mc" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
      <div className="row"><h2 style={{ flex: 1, fontSize: 13 }}>Historical Estimator</h2><button className="b" onClick={() => setShowEst(false)}>&times;</button></div>
      <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 8 }}>From {est.n} past takeoffs · {est.conf} confidence</div>
      {totalSqft > 0 && <div className="stats" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <div className="sc"><div className="sl">Expected Devices</div><div className="sv" style={{ fontSize: 16 }}>{Math.round(est.dps * totalSqft)}</div><div style={{ fontSize: 9, color: totalDevs >= est.dps * totalSqft ? 'var(--gn)' : 'var(--ac)' }}>have {totalDevs}</div></div>
        <div className="sc"><div className="sl">Expected Cost</div><div className="sv" style={{ fontSize: 16 }}>{money(est.cps * totalSqft)}</div><div style={{ fontSize: 9, color: 'var(--t3)' }}>actual {money(devCost)}</div></div>
        <div className="sc"><div className="sl">Expected Conduit</div><div className="sv" style={{ fontSize: 16 }}>{Math.round(est.cfs * totalSqft)}ft</div><div style={{ fontSize: 9, color: 'var(--t3)' }}>actual {totalCond.toFixed(0)}ft</div></div>
      </div>}
      <table style={{ width: '100%', fontSize: 9, borderCollapse: 'collapse', marginTop: 8 }}>
        <thead><tr style={{ color: 'var(--t3)', textAlign: 'left' }}><th>Project</th><th>Sqft</th><th>Devs</th><th>Dev/sf</th><th>$/sf</th></tr></thead>
        <tbody>{hist.map((h, i) => <tr key={i} style={{ borderTop: '1px solid var(--bd)' }}><td>{h.name}</td><td className="m">{h.sq}</td><td className="m">{h.dv}</td><td className="m">{h.dps.toFixed(3)}</td><td className="m">{money(h.cps)}</td></tr>)}</tbody>
      </table>
    </div></div>}
  </div>
}

function AddCircuit({ onAdd }) {
  const [name, setName] = useState(''), [g, setG] = useState('12'), [n, setN] = useState(2)
  return <div className="row" style={{ marginTop: 4, flexWrap: 'wrap' }}>
    <input className="fi" style={{ fontSize: 9, padding: 3, minWidth: 60 }} placeholder="name" value={name} onChange={e => setName(e.target.value)} />
    <select className="fi" style={{ fontSize: 9, padding: 3, maxWidth: 55 }} value={g} onChange={e => setG(e.target.value)}>{WIRE_GAUGES.map(x => <option key={x}>{x}</option>)}</select>
    <input className="fi" style={{ fontSize: 9, padding: 3, maxWidth: 40 }} type="number" min="1" value={n} onChange={e => setN(Number(e.target.value))} />
    <button className="b ba" style={{ fontSize: 9, padding: '2px 7px' }} onClick={() => { onAdd({ name, gauge: g, conductors: n }); setName('') }}>+</button>
  </div>
}
