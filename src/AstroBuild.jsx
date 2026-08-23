import { useState } from 'react'

const SLIDERS = [
  { id: 'size',        label: 'Planet Size',         unit: 'x Earth',  min: 0.1, max: 15,   step: 0.1, default: 1,    icon: '🪐', desc: 'Relative to Earth' },
  { id: 'distance',    label: 'Distance from Star',  unit: 'AU',        min: 0.1, max: 10,   step: 0.1, default: 1,    icon: '☀️', desc: 'Astronomical Units' },
  { id: 'water',       label: 'Water Coverage',      unit: '%',         min: 0,   max: 100,  step: 1,   default: 71,   icon: '🌊', desc: 'Surface liquid water' },
  { id: 'atmosphere',  label: 'Atmosphere Density',  unit: 'x Earth',  min: 0,   max: 100,  step: 0.1, default: 1,    icon: '🌫️', desc: 'Relative thickness' },
  { id: 'temperature', label: 'Surface Temperature', unit: '°C',        min: -200,max: 500,  step: 1,   default: 15,   icon: '🌡️', desc: 'Average surface temp' },
  { id: 'magnetic',    label: 'Magnetic Field',       unit: 'x Earth',  min: 0,   max: 20,   step: 0.1, default: 1,    icon: '🧲', desc: 'Protects from radiation' },
  { id: 'gravity',     label: 'Surface Gravity',      unit: 'x Earth',  min: 0.1, max: 10,   step: 0.1, default: 1,    icon: '⬇️', desc: 'Relative to Earth' },
  { id: 'starType',    label: 'Star Luminosity',      unit: 'x Sun',    min: 0.01,max: 10,   step: 0.01,default: 1,    icon: '⭐', desc: 'Energy output' },
]

function analyze(vals) {
  const factors = []
  let score = 100

  // Habitable zone check
  const hz = Math.sqrt(vals.starType)
  const innerHz = hz * 0.95
  const outerHz = hz * 1.37
  if (vals.distance < innerHz || vals.distance > outerHz) {
    const severity = vals.distance < innerHz ? 'too close to the star — water would evaporate' : 'too far from the star — water would freeze'
    factors.push({ label: 'Outside Habitable Zone', detail: `At ${vals.distance} AU, this planet is ${severity}.`, color: '#ff4444', impact: -40 })
    score -= 40
  } else {
    factors.push({ label: 'Inside Habitable Zone', detail: `At ${vals.distance} AU, liquid water could exist on the surface.`, color: '#22cc88', impact: 0 })
  }

  // Temperature
  if (vals.temperature < -50) { factors.push({ label: 'Too Cold', detail: `At ${vals.temperature}°C, most biochemical reactions would freeze.`, color: '#4488ff', impact: -25 }); score -= 25 }
  else if (vals.temperature > 150) { factors.push({ label: 'Too Hot', detail: `At ${vals.temperature}°C, complex molecules would break down.`, color: '#ff4444', impact: -25 }); score -= 25 }
  else if (vals.temperature >= -15 && vals.temperature <= 50) { factors.push({ label: 'Ideal Temperature', detail: `${vals.temperature}°C is within the range for liquid water and complex chemistry.`, color: '#22cc88', impact: 0 }) }
  else { factors.push({ label: 'Marginal Temperature', detail: `${vals.temperature}°C is survivable but extreme for most known life.`, color: '#ffaa22', impact: -10 }); score -= 10 }

  // Water
  if (vals.water === 0) { factors.push({ label: 'No Liquid Water', detail: 'Water is essential for all known life. None detected.', color: '#ff4444', impact: -30 }); score -= 30 }
  else if (vals.water > 95) { factors.push({ label: 'Water World', detail: 'Entirely covered in water — no land for complex ecosystems.', color: '#ffaa22', impact: -10 }); score -= 10 }
  else { factors.push({ label: 'Water Present', detail: `${vals.water}% water coverage — excellent for supporting life.`, color: '#22cc88', impact: 0 }) }

  // Atmosphere
  if (vals.atmosphere === 0) { factors.push({ label: 'No Atmosphere', detail: 'Without an atmosphere, there is no pressure, no protection from radiation.', color: '#ff4444', impact: -30 }); score -= 30 }
  else if (vals.atmosphere > 50) { factors.push({ label: 'Crushing Atmosphere', detail: `${vals.atmosphere}x Earth's atmosphere would create unbearable pressure.`, color: '#ff4444', impact: -20 }); score -= 20 }
  else if (vals.atmosphere >= 0.5 && vals.atmosphere <= 5) { factors.push({ label: 'Suitable Atmosphere', detail: `${vals.atmosphere}x Earth density — breathable pressure range.`, color: '#22cc88', impact: 0 }) }
  else { factors.push({ label: 'Thin Atmosphere', detail: 'Low pressure makes it difficult to retain heat and liquid water.', color: '#ffaa22', impact: -15 }); score -= 15 }

  // Magnetic field
  if (vals.magnetic < 0.1) { factors.push({ label: 'No Magnetic Field', detail: 'Without protection, stellar radiation would strip the atmosphere and sterilize the surface.', color: '#ff4444', impact: -20 }); score -= 20 }
  else { factors.push({ label: 'Magnetic Field Present', detail: `${vals.magnetic}x Earth — shields from harmful radiation.`, color: '#22cc88', impact: 0 }) }

  // Gravity
  if (vals.gravity < 0.3) { factors.push({ label: 'Too Little Gravity', detail: 'Insufficient gravity to retain an atmosphere long-term.', color: '#ff4444', impact: -15 }); score -= 15 }
  else if (vals.gravity > 5) { factors.push({ label: 'Crushing Gravity', detail: `${vals.gravity}x Earth gravity would prevent complex life from evolving.`, color: '#ff4444', impact: -15 }); score -= 15 }
  else { factors.push({ label: 'Suitable Gravity', detail: `${vals.gravity}x Earth — organisms could move and develop normally.`, color: '#22cc88', impact: 0 }) }

  // Size
  if (vals.size > 10) { factors.push({ label: 'Gas Giant Territory', detail: 'At this size, the planet would likely be a gas giant with no solid surface.', color: '#ffaa22', impact: -20 }); score -= 20 }

  score = Math.max(0, Math.min(100, score))

  let verdict, verdictColor, verdictIcon
  if (score >= 80) { verdict = 'Highly Habitable'; verdictColor = '#22cc88'; verdictIcon = '🌍' }
  else if (score >= 60) { verdict = 'Possibly Habitable'; verdictColor = '#88dd44'; verdictIcon = '🌱' }
  else if (score >= 40) { verdict = 'Marginally Habitable'; verdictColor = '#ffaa22'; verdictIcon = '⚠️' }
  else if (score >= 20) { verdict = 'Hostile to Life'; verdictColor = '#ff6644'; verdictIcon = '☠️' }
  else { verdict = 'Completely Uninhabitable'; verdictColor = '#ff4444'; verdictIcon = '💀' }

  return { score, factors, verdict, verdictColor, verdictIcon }
}

export default function AstroBuild({ onBack }) {
  const defaults = {}
  SLIDERS.forEach(s => { defaults[s.id] = s.default })
  const [vals, setVals] = useState(defaults)
  const [analyzed, setAnalyzed] = useState(false)
  const [result, setResult] = useState(null)
  const [planetName, setPlanetName] = useState('')

  function handleSlider(id, val) {
    setVals(v => ({ ...v, [id]: parseFloat(val) }))
    setAnalyzed(false)
    setResult(null)
  }

  function handleAnalyze() {
    setResult(analyze(vals))
    setAnalyzed(true)
  }

  function getPlanetColor() {
    if (vals.water > 60) return '#2244aa'
    if (vals.temperature > 200) return '#cc4400'
    if (vals.temperature < -100) return '#aaddff'
    return '#336633'
  }

  const planetRadius = Math.min(80, Math.max(20, vals.size * 25))

  return (
    <div style={s.root}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={onBack}>← Games</button>
        <h1 style={s.pageTitle}>Astro Build</h1>
        <div style={{ width: 100 }} />
      </div>
      <div style={s.layout}>
        <div style={s.leftPanel}>
          <div style={s.sectionLabel}>Planet Parameters</div>
          {SLIDERS.map(sl => (
            <div key={sl.id} style={s.sliderRow}>
              <div style={s.sliderHeader}>
                <span style={s.sliderIcon}>{sl.icon}</span>
                <span style={s.sliderLabel}>{sl.label}</span>
                <span style={s.sliderVal}>{vals[sl.id]} {sl.unit}</span>
              </div>
              <input type="range" min={sl.min} max={sl.max} step={sl.step} value={vals[sl.id]}
                onChange={e => handleSlider(sl.id, e.target.value)}
                style={{ width: '100%', accentColor: '#5577ff', cursor: 'pointer' }} />
              <div style={s.sliderDesc}>{sl.desc}</div>
            </div>
          ))}
          <div style={s.nameRow}>
            <input
              type="text"
              placeholder="Name your planet..."
              value={planetName}
              onChange={e => setPlanetName(e.target.value)}
              style={s.nameInput}
              maxLength={30}
            />
          </div>
          <button style={s.analyzeBtn} onClick={handleAnalyze}>Analyze Habitability →</button>
        </div>

        <div style={s.rightPanel}>
          <div style={s.planetPreview}>
            <div style={{ width: planetRadius * 2, height: planetRadius * 2, borderRadius: '50%', background: `radial-gradient(circle at 35% 35%, ${getPlanetColor()}dd, ${getPlanetColor()}66)`, boxShadow: `0 0 ${planetRadius}px ${getPlanetColor()}44, inset -${planetRadius * 0.3}px -${planetRadius * 0.3}px ${planetRadius * 0.5}px rgba(0,0,0,0.5)`, transition: 'all 0.4s', position: 'relative' }}>
              {vals.water > 20 && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle at 60% 40%, rgba(30,80,200,0.4) 0%, transparent 60%)' }} />}
              {vals.atmosphere > 0.3 && <div style={{ position: 'absolute', inset: -vals.atmosphere * 2, borderRadius: '50%', border: `${Math.min(12, vals.atmosphere * 2)}px solid rgba(150,200,255,0.08)`, pointerEvents: 'none' }} />}
            </div>
            {planetName && <div style={s.planetNameDisplay}>{planetName}</div>}
            <div style={s.previewStats}>
              <span style={s.previewStat}>Size: {vals.size}x Earth</span>
              <span style={s.previewStat}>Temp: {vals.temperature}°C</span>
              <span style={s.previewStat}>Water: {vals.water}%</span>
            </div>
          </div>

          {analyzed && result && (
            <div style={s.resultBox}>
              <div style={s.verdictRow}>
                <span style={{ fontSize: '2rem' }}>{result.verdictIcon}</span>
                <div>
                  <div style={{ ...s.verdict, color: result.verdictColor }}>{result.verdict}</div>
                  <div style={s.scoreBar}>
                    <div style={{ ...s.scoreFill, width: `${result.score}%`, background: result.verdictColor }} />
                  </div>
                  <div style={{ color: 'rgba(160,185,255,0.5)', fontSize: '0.75rem' }}>Habitability Score: {result.score}/100</div>
                </div>
              </div>
              <div style={s.factorsList}>
                {result.factors.map((f, i) => (
                  <div key={i} style={{ ...s.factorRow, borderColor: f.color + '44' }}>
                    <div style={{ ...s.factorDot, background: f.color }} />
                    <div>
                      <div style={{ color: f.color, fontSize: '0.82rem', fontWeight: 500, marginBottom: '3px' }}>{f.label}</div>
                      <div style={{ color: 'rgba(180,200,255,0.6)', fontSize: '0.78rem', lineHeight: 1.5 }}>{f.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#02030f', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', background: 'rgba(2,3,15,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(80,110,200,0.12)', position: 'sticky', top: 0, zIndex: 10 },
  backBtn: { background: 'transparent', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' },
  pageTitle: { color: '#fff', fontSize: '1.2rem', fontFamily: 'Georgia, serif', fontWeight: 300, letterSpacing: '0.15em', margin: 0 },
  layout: { display: 'grid', gridTemplateColumns: '380px 1fr', gap: '0', flex: 1 },
  leftPanel: { padding: '28px 24px', borderRight: '1px solid rgba(80,110,200,0.12)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' },
  sectionLabel: { color: 'rgba(120,160,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '4px' },
  sliderRow: { display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(8,12,40,0.5)', borderRadius: '10px', padding: '12px 14px', border: '1px solid rgba(80,110,200,0.1)' },
  sliderHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  sliderIcon: { fontSize: '0.9rem' },
  sliderLabel: { color: 'rgba(200,220,255,0.8)', fontSize: '0.82rem', flex: 1 },
  sliderVal: { color: '#aabbff', fontSize: '0.82rem', fontWeight: 500, fontFamily: 'monospace' },
  sliderDesc: { color: 'rgba(120,160,255,0.4)', fontSize: '0.7rem' },
  nameRow: { marginTop: '4px' },
  nameInput: { width: '100%', background: 'rgba(8,12,40,0.6)', border: '1px solid rgba(100,140,255,0.2)', borderRadius: '8px', padding: '10px 14px', color: '#ddeaff', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' },
  analyzeBtn: { background: 'rgba(34,204,136,0.2)', border: '1px solid rgba(34,204,136,0.4)', color: '#66ddaa', padding: '14px 24px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', letterSpacing: '0.05em', marginTop: '4px' },
  rightPanel: { padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' },
  planetPreview: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '40px', background: 'rgba(8,12,40,0.4)', borderRadius: '20px', border: '1px solid rgba(80,110,200,0.1)' },
  planetNameDisplay: { color: '#ddeaff', fontSize: '1.1rem', fontFamily: 'Georgia, serif', letterSpacing: '0.1em' },
  previewStats: { display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' },
  previewStat: { color: 'rgba(160,185,255,0.5)', fontSize: '0.78rem', background: 'rgba(80,110,200,0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(100,140,255,0.1)' },
  resultBox: { background: 'rgba(8,12,40,0.6)', border: '1px solid rgba(80,110,200,0.15)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  verdictRow: { display: 'flex', gap: '16px', alignItems: 'flex-start' },
  verdict: { fontSize: '1.2rem', fontFamily: 'Georgia, serif', fontWeight: 400, marginBottom: '8px' },
  scoreBar: { width: '200px', height: '4px', background: 'rgba(80,110,200,0.2)', borderRadius: '2px', marginBottom: '6px', overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: '2px', transition: 'width 0.6s ease' },
  factorsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  factorRow: { display: 'flex', gap: '12px', alignItems: 'flex-start', border: '1px solid', borderRadius: '10px', padding: '12px 14px' },
  factorDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '5px' },
}
