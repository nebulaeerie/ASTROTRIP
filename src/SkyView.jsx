import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { loadBrightStarCatalog } from './starData'
import SearchBar from './SearchBar'
import { CITIES } from './cities'
import * as Astronomy from 'astronomy-engine'
import * as satellite from 'satellite.js'

const AU_KM = 149597870.7
const RAD_TO_ARCSEC = 206264.806

const SS_BODIES = [
  { body: Astronomy.Body.Sun,     name: 'Sun',     kind: 'sun',    radius_km: 695700, tex: '/2k_sun.jpg' },
  { body: Astronomy.Body.Moon,    name: 'Moon',    kind: 'moon',   radius_km: 1737.4, tex: '/2k_moon.jpg' },
  { body: Astronomy.Body.Mercury, name: 'Mercury', kind: 'planet', radius_km: 2439.7, tex: '/2k_mercury.jpg' },
  { body: Astronomy.Body.Venus,   name: 'Venus',   kind: 'planet', radius_km: 6051.8, tex: '/2k_venus_surface.jpg' },
  { body: Astronomy.Body.Mars,    name: 'Mars',    kind: 'planet', radius_km: 3389.5, tex: '/2k_mars.jpg' },
  { body: Astronomy.Body.Jupiter, name: 'Jupiter', kind: 'planet', radius_km: 69911,  tex: '/2k_jupiter.jpg' },
  { body: Astronomy.Body.Saturn,  name: 'Saturn',  kind: 'planet', radius_km: 58232,  tex: '/2k_saturn.jpg' },
  { body: Astronomy.Body.Uranus,  name: 'Uranus',  kind: 'planet', radius_km: 25362,  tex: '/2k_uranus_new.jpg' },
  { body: Astronomy.Body.Neptune, name: 'Neptune', kind: 'planet', radius_km: 24622,  tex: '/2k_neptune.jpg' },
]

const LIVE_SATELLITES = [
  { name: 'ISS (ZARYA)', norad: 25544 },
  { name: 'Hubble Space Telescope', norad: 20580 },
  { name: 'Tiangong', norad: 48274 },
]

function makeSatelliteTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const halo = ctx.createRadialGradient(64, 64, 20, 64, 64, 62)
  halo.addColorStop(0, 'rgba(100,220,255,0.55)')
  halo.addColorStop(0.6, 'rgba(100,220,255,0.2)')
  halo.addColorStop(1, 'rgba(100,220,255,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = '#3d6fc4'
  ctx.fillRect(6, 50, 44, 28)
  ctx.fillRect(78, 50, 44, 28)
  ctx.strokeStyle = 'rgba(160,210,255,0.75)'
  ctx.lineWidth = 1
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(6 + i * 11, 50)
    ctx.lineTo(6 + i * 11, 78)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(78 + i * 11, 50)
    ctx.lineTo(78 + i * 11, 78)
    ctx.stroke()
  }
  ctx.strokeRect(6.5, 50.5, 43, 27)
  ctx.strokeRect(78.5, 50.5, 43, 27)
  ctx.fillStyle = '#eef4ff'
  ctx.fillRect(52, 36, 24, 56)
  ctx.fillStyle = 'rgba(140,180,230,0.85)'
  ctx.fillRect(56, 42, 16, 5)
  ctx.fillRect(56, 52, 16, 5)
  ctx.fillRect(56, 62, 16, 5)
  ctx.fillRect(56, 72, 16, 5)
  ctx.fillStyle = '#a0c8f0'
  ctx.fillRect(50, 62, 4, 4)
  ctx.fillRect(74, 62, 4, 4)
  ctx.strokeStyle = '#eef4ff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(64, 36)
  ctx.lineTo(64, 18)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(64, 16, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(6, 50)
  ctx.lineTo(50, 50)
  ctx.moveTo(78, 50)
  ctx.lineTo(122, 50)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

async function fetchSatTLE(norad) {
  const base = window.location.hostname === 'localhost'
    ? 'https://astro-trip-blond.vercel.app'
    : ''
  const r = await fetch(`${base}/api/tle?norad=${norad}`)
  if (!r.ok) throw new Error(`TLE ${r.status}`)
  const text = await r.text()
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 3) throw new Error('TLE bad format')
  return { line1: lines[1], line2: lines[2] }
}

async function loadLiveSatellites(lat, lon) {
  const now = new Date()
  const out = []
  for (const sat of LIVE_SATELLITES) {
    try {
      const tle = await fetchSatTLE(sat.norad)
      const satrec = satellite.twoline2satrec(tle.line1, tle.line2)
      const posVel = satellite.propagate(satrec, now)
      if (!posVel || !posVel.position) continue
      const gmst = satellite.gstime(now)
      const satEcf = satellite.eciToEcf(posVel.position, gmst)
      const observerGd = {
        latitude: (lat * Math.PI) / 180,
        longitude: (lon * Math.PI) / 180,
        height: 0.05,
      }
      const look = satellite.ecfToLookAngles(observerGd, satEcf)
      const altDeg = (look.elevation * 180) / Math.PI
      const obsEcf = satellite.geodeticToEcf(observerGd)
      const obsEci = satellite.ecfToEci(obsEcf, gmst)
      const dx = posVel.position.x - obsEci.x
      const dy = posVel.position.y - obsEci.y
      const dz = posVel.position.z - obsEci.z
      const range = Math.sqrt(dx * dx + dy * dy + dz * dz)
      const raRad = Math.atan2(dy, dx)
      const decRad = Math.asin(dz / range)
      out.push({
        name: sat.name,
        norad: sat.norad,
        kind: 'satellite',
        ra: ((raRad * 12) / Math.PI + 24) % 24,
        dec: (decRad * 180) / Math.PI,
        altitudeDeg: altDeg,
        rangeKm: range,
      })
    } catch (err) {
      console.warn('Satellite load failed:', sat.name, err)
    }
  }
  return out
}

const EXOPLANET_SYSTEMS = [
  { name: 'Proxima Centauri', ra: 14.495, dec: -62.679, dist: 4.24, mag: 11.13, spec: 'M5.5V',
    planets: [{ id: 'b', note: 'habitable zone' }, { id: 'd', note: 'candidate' }] },
  { name: 'TRAPPIST-1', ra: 23.108, dec: -5.041, dist: 40.7, mag: 18.8, spec: 'M8V',
    planets: [{ id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e', note: 'habitable zone' }, { id: 'f' }, { id: 'g' }, { id: 'h' }] },
  { name: '51 Pegasi', ra: 22.958, dec: 20.769, dist: 50.9, mag: 5.49, spec: 'G2.5IV',
    planets: [{ id: 'b', note: 'first exoplanet around a Sun-like star (1995)' }] },
  { name: 'Tau Ceti', ra: 1.734, dec: -15.938, dist: 11.9, mag: 3.50, spec: 'G8V',
    planets: [{ id: 'e' }, { id: 'f' }, { id: 'g' }, { id: 'h' }] },
  { name: 'GJ 1214', ra: 17.255, dec: 4.964, dist: 48.0, mag: 14.7, spec: 'M4.5V',
    planets: [{ id: 'b', note: 'water world candidate' }] },
  { name: 'HD 189733', ra: 20.012, dec: 22.711, dist: 64.5, mag: 7.67, spec: 'K1V',
    planets: [{ id: 'b', note: 'hot Jupiter, glass rain' }] },
  { name: 'WASP-12', ra: 6.509, dec: 29.672, dist: 1400, mag: 11.7, spec: 'G0V',
    planets: [{ id: 'b', note: 'being torn apart by its star' }] },
  { name: '55 Cancri', ra: 8.877, dec: 28.331, dist: 41, mag: 5.95, spec: 'G8V',
    planets: [{ id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e', note: 'lava world candidate' }, { id: 'f' }] },
  { name: 'Kepler-452', ra: 19.734, dec: 44.277, dist: 1800, mag: 13.4, spec: 'G2V',
    planets: [{ id: 'b', note: 'Earth cousin' }] },
  { name: 'Kepler-22', ra: 19.281, dec: 47.885, dist: 640, mag: 11.8, spec: 'G5V',
    planets: [{ id: 'b', note: 'first Kepler planet in habitable zone' }] },
  { name: 'K2-18', ra: 11.504, dec: 7.588, dist: 124, mag: 13.5, spec: 'M2.5V',
    planets: [{ id: 'b', note: 'water vapor detected' }] },
  { name: 'TOI-700', ra: 6.457, dec: -65.579, dist: 101.4, mag: 13.2, spec: 'M2V',
    planets: [{ id: 'b' }, { id: 'c' }, { id: 'd', note: 'habitable zone' }, { id: 'e' }] },
  { name: 'LHS 1140', ra: 0.750, dec: -15.271, dist: 48.8, mag: 14.2, spec: 'M4.5V',
    planets: [{ id: 'b', note: 'super-Earth, habitable zone' }] },
  { name: 'GJ 667C', ra: 17.316, dec: -34.990, dist: 23.6, mag: 10.2, spec: 'M1.5V',
    planets: [{ id: 'c', note: 'habitable zone candidate' }] },
  { name: "Luyten's Star", ra: 7.468, dec: 5.225, dist: 12.4, mag: 9.87, spec: 'M3.5V',
    planets: [{ id: 'b', note: 'super-Earth' }] },
  { name: 'Ross 128', ra: 11.798, dec: 0.806, dist: 11.0, mag: 11.1, spec: 'M4V',
    planets: [{ id: 'b', note: 'temperate, 11 light-years away' }] },
  { name: 'YZ Ceti', ra: 1.398, dec: -16.998, dist: 12.1, mag: 12.0, spec: 'M4.5V',
    planets: [{ id: 'b' }, { id: 'c' }, { id: 'd' }] },
  { name: 'Gliese 581', ra: 15.326, dec: -7.722, dist: 20.4, mag: 10.6, spec: 'M3V',
    planets: [{ id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e', note: 'habitable zone candidate' }] },
  { name: 'Elias 2-24', ra: 16.4400, dec: -24.2704, dist: 450, mag: 14.4, spec: 'K5.5',
    planets: [{ id: 'b', note: 'youngest known planet, still forming' }] },
]

function bodyColor(name) {
  switch (name) {
    case 'Sun':     return [1.00, 0.92, 0.65]
    case 'Moon':    return [0.95, 0.95, 1.00]
    case 'Mercury': return [0.78, 0.75, 0.70]
    case 'Venus':   return [1.00, 0.98, 0.85]
    case 'Mars':    return [1.00, 0.55, 0.35]
    case 'Jupiter': return [1.00, 0.88, 0.68]
    case 'Saturn':  return [0.95, 0.85, 0.60]
    case 'Uranus':  return [0.65, 0.92, 0.95]
    case 'Neptune': return [0.55, 0.70, 1.00]
    default:        return [1.00, 1.00, 1.00]
  }
}

function getSolarSystemBodies(date, lat, lon) {
  const observer = new Astronomy.Observer(lat, lon, 0)
  const results = []
  for (const p of SS_BODIES) {
    try {
      const eq = Astronomy.Equator(p.body, date, observer, true, true)
      const illum = Astronomy.Illumination(p.body, date)
      const angularSize = ((2 * p.radius_km) / (eq.dist * AU_KM)) * RAD_TO_ARCSEC
      const phaseFraction = (1 + Math.cos((illum.phase_angle * Math.PI) / 180)) / 2
      results.push({
        name: p.name,
        kind: p.kind,
        ra: eq.ra,
        dec: eq.dec,
        distanceAU: eq.dist,
        magnitude: illum.mag,
        phaseAngle: illum.phase_angle,
        phaseFraction,
        angularSize,
      })
    } catch (err) {
      console.warn(`Solar system: failed ${p.name}`, err)
    }
  }
  return results
}

const NAMED_STARS = [
  ['Sirius', 6.75, -16.72, -1.46, 'Canis Major', 'A1'],
  ['Canopus', 6.40, -52.70, -0.74, 'Carina', 'A9'],
  ['Alpha Centauri', 14.66, -60.83, -0.27, 'Centaurus', 'G2'],
  ['Arcturus', 14.26, 19.18, -0.05, 'Bootes', 'K1.5'],
  ['Vega', 18.62, 38.78, 0.03, 'Lyra', 'A0'],
  ['Capella', 5.28, 45.99, 0.08, 'Auriga', 'G8'],
  ['Rigel', 5.24, -8.20, 0.13, 'Orion', 'B8'],
  ['Procyon', 7.65, 5.22, 0.34, 'Canis Minor', 'F5'],
  ['Betelgeuse', 5.92, 7.41, 0.50, 'Orion', 'M2'],
  ['Achernar', 1.63, -57.24, 0.46, 'Eridanus', 'B6'],
  ['Hadar', 14.06, -60.37, 0.61, 'Centaurus', 'B1'],
  ['Altair', 19.85, 8.87, 0.76, 'Aquila', 'A7'],
  ['Acrux', 12.44, -63.10, 0.76, 'Crux', 'B0.5'],
  ['Aldebaran', 4.60, 16.51, 0.85, 'Taurus', 'K5'],
  ['Antares', 16.49, -26.43, 1.09, 'Scorpius', 'M1.5'],
  ['Spica', 13.42, -11.16, 0.97, 'Virgo', 'B1'],
  ['Pollux', 7.76, 28.03, 1.14, 'Gemini', 'K0'],
  ['Fomalhaut', 22.96, -29.62, 1.16, 'Piscis Austrinus', 'A3'],
  ['Deneb', 20.69, 45.28, 1.25, 'Cygnus', 'A2'],
  ['Regulus', 10.14, 11.97, 1.36, 'Leo', 'B8'],
  ['Castor', 7.58, 31.89, 1.58, 'Gemini', 'A1.5'],
  ['Bellatrix', 5.42, 6.35, 1.64, 'Orion', 'B2'],
  ['Elnath', 5.44, 28.61, 1.65, 'Taurus', 'B7'],
  ['Alnilam', 5.60, -1.20, 1.69, 'Orion', 'B0'],
  ['Alnitak', 5.68, -1.94, 1.74, 'Orion', 'O9.5'],
  ['Alnair', 22.14, -46.96, 1.74, 'Grus', 'B7'],
  ['Alioth', 12.90, 55.96, 1.77, 'Ursa Major', 'A1'],
  ['Dubhe', 11.06, 61.75, 1.79, 'Ursa Major', 'K0'],
  ['Mirfak', 3.41, 49.86, 1.79, 'Perseus', 'F5'],
  ['Wezen', 7.14, -26.39, 1.83, 'Canis Major', 'F8'],
  ['Kaus Australis', 18.40, -34.38, 1.85, 'Sagittarius', 'B9.5'],
  ['Alkaid', 13.79, 49.31, 1.86, 'Ursa Major', 'B3'],
  ['Menkalinan', 5.99, 44.95, 1.90, 'Auriga', 'A1'],
  ['Alhena', 6.63, 16.40, 1.93, 'Gemini', 'A1.5'],
  ['Peacock', 20.43, -56.74, 1.94, 'Pavo', 'B2'],
  ['Mirzam', 6.38, -17.96, 1.98, 'Canis Major', 'B1'],
  ['Alphard', 9.46, -8.66, 1.98, 'Hydra', 'K3'],
  ['Polaris', 2.53, 89.26, 1.98, 'Ursa Minor', 'F7'],
  ['Hamal', 2.12, 23.46, 2.01, 'Aries', 'K2'],
  ['Diphda', 0.73, -17.99, 2.04, 'Cetus', 'K0'],
  ['Saiph', 5.80, -9.67, 2.06, 'Orion', 'B0.5'],
  ['Kochab', 14.85, 74.16, 2.07, 'Ursa Minor', 'K4'],
  ['Rasalhague', 17.58, 12.56, 2.08, 'Ophiuchus', 'A5'],
  ['Algol', 3.14, 40.96, 2.12, 'Perseus', 'B8'],
  ['Denebola', 11.82, 14.57, 2.14, 'Leo', 'A3'],
  ['Mizar', 13.40, 54.93, 2.23, 'Ursa Major', 'A2'],
  ['Sadr', 20.37, 40.26, 2.23, 'Cygnus', 'F8'],
  ['Eltanin', 17.94, 51.49, 2.24, 'Draco', 'K5'],
  ['Scheat', 23.06, 28.08, 2.44, 'Pegasus', 'M2'],
  ['Markab', 23.08, 15.21, 2.50, 'Pegasus', 'B9'],
  ['Menkar', 3.04, 4.09, 2.54, 'Cetus', 'M1.5'],
  ['Zubenelgenubi', 14.85, -16.04, 2.75, 'Libra', 'A3'],
]

const GAZE_SEARCH_ITEMS = [
  ...LIVE_SATELLITES.map(s => ({ name: s.name, category: 'Satellite' })),
  ...NAMED_STARS.map(s => ({ name: s[0], category: 'Star' })),
  ...SS_BODIES.map(b => ({
    name: b.name,
    category: b.kind === 'planet' ? 'Planet' : b.kind === 'moon' ? 'Moon' : 'Sun',
  })),
  ...EXOPLANET_SYSTEMS.map(sys => ({ name: sys.name, category: 'Exoplanet system' })),
  ...EXOPLANET_SYSTEMS.flatMap(sys =>
    sys.planets.map(p => ({ name: `${sys.name} ${p.id}`, category: 'Exoplanet' }))
  ),
]

function computeLST(date, lon_deg) {
  const jd = date.getTime() / 86400000 + 2440587.5
  const T = (jd - 2451545.0) / 36525.0
  let gmst_deg = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T
    - T * T * T / 38710000.0
  gmst_deg = ((gmst_deg % 360) + 360) % 360
  return ((gmst_deg + lon_deg) % 360 + 360) % 360
}

function computeStarRotation(lat_deg, lst_deg) {
  const lat = lat_deg * Math.PI / 180
  const lst = lst_deg * Math.PI / 180
  const m = new THREE.Matrix4()
  m.set(
    -Math.sin(lst),                 Math.cos(lst),                 0,             0,
     Math.cos(lat) * Math.cos(lst), Math.cos(lat) * Math.sin(lst), Math.sin(lat), 0,
     Math.sin(lat) * Math.cos(lst), Math.sin(lat) * Math.sin(lst), -Math.cos(lat), 0,
    0, 0, 0, 1
  )
  return m
}

function spectralToRGB(cls) {
  const c = (cls || 'G').charAt(0).toUpperCase()
  switch (c) {
    case 'O': return [0.62, 0.72, 1.00]
    case 'B': return [0.72, 0.82, 1.00]
    case 'A': return [0.88, 0.92, 1.00]
    case 'F': return [1.00, 1.00, 0.98]
    case 'G': return [1.00, 0.96, 0.90]
    case 'K': return [1.00, 0.85, 0.65]
    case 'M': return [1.00, 0.72, 0.52]
    default:  return [1.00, 1.00, 1.00]
  }
}

function magToSize(mag) {
  return 2.4 + Math.max(0, 3.5 - mag) * 1.8
}

function raDecToXYZ(raHours, decDeg, radius) {
  const ra = (raHours / 24) * Math.PI * 2
  const dec = (decDeg * Math.PI) / 180
  return [
    radius * Math.cos(dec) * Math.cos(ra),
    radius * Math.sin(dec),
    radius * Math.cos(dec) * Math.sin(ra),
  ]
}

function makeLabelTexture(text) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0)'
  ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = 'rgba(140,180,255,1)'
  ctx.font = 'bold 200px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

function makeGlowTexture(rgb) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  const [r, gr, b] = rgb
  g.addColorStop(0, `rgba(${Math.round(r*255)},${Math.round(gr*255)},${Math.round(b*255)},1)`)
  g.addColorStop(0.25, `rgba(${Math.round(r*255)},${Math.round(gr*255)},${Math.round(b*255)},0.85)`)
  g.addColorStop(0.55, `rgba(${Math.round(r*255)},${Math.round(gr*255)},${Math.round(b*255)},0.35)`)
  g.addColorStop(1, `rgba(${Math.round(r*255)},${Math.round(gr*255)},${Math.round(b*255)},0)`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  return tex
}

export default function SkyView({ onBack }) {
  const mountRef = useRef(null)
  const pointAtRef = useRef(null)
  const recaptureRef = useRef(null)
  const starGroupRef = useRef(null)
  const solarBodiesRef = useRef([])
  const rotationRef = useRef(new THREE.Matrix4())
  const highlightStarRef = useRef(null)
  const highlightedStarRef = useRef(null)
  const camStateRef = useRef({ yaw: 0, pitch: 0, fov: Math.PI / 2, discLarge: false })
  const catalogStarsRef = useRef([])
  const satellitesRef = useRef([])
  const refreshSatellitesRef = useRef(null)
  const observerRef = useRef(null)

  const [observer, setObserver] = useState({
    name: 'Los Angeles',
    latitude: 34.0522,
    longitude: -118.2437,
  })
  const [obsTime, setObsTime] = useState(new Date())
  const [selectedObject, setSelectedObject] = useState(null)
  const [satellites, setSatellites] = useState([])

  observerRef.current = observer

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x02030f)

    const starGroup = new THREE.Group()
    scene.add(starGroup)
    starGroupRef.current = starGroup

    const horizonPts = []
    for (let i = 0; i <= 360; i++) {
      const a = (i * Math.PI) / 180
      horizonPts.push(new THREE.Vector3(Math.sin(a), 0, Math.cos(a)))
    }
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(horizonPts),
      new THREE.LineBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.5 })
    ))

    ;[
      { label: 'N', pos: [0, 0, -1], rot: 0 },
      { label: 'E', pos: [1, 0, 0], rot: -Math.PI / 2 },
      { label: 'S', pos: [0, 0, 1], rot: Math.PI },
      { label: 'W', pos: [-1, 0, 0], rot: Math.PI / 2 },
    ].forEach(({ label, pos, rot }) => {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(0.14, 0.07),
        new THREE.MeshBasicMaterial({ map: makeLabelTexture(label), transparent: true, depthWrite: false })
      )
      plane.position.set(pos[0], 0.04, pos[2])
      plane.rotation.y = rot
      scene.add(plane)
    })

    const starTex = (() => {
      const c = document.createElement('canvas')
      c.width = c.height = 128
      const ctx = c.getContext('2d')
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      g.addColorStop(0, 'rgba(255,255,255,1)')
      g.addColorStop(0.15, 'rgba(255,255,255,0.95)')
      g.addColorStop(0.4, 'rgba(255,255,255,0.25)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 128, 128)
      return new THREE.CanvasTexture(c)
    })()

    const starMat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: starTex },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform sampler2D uTex;
        void main() {
          vec4 tex = texture2D(uTex, gl_PointCoord);
          if (tex.a < 0.02) discard;
          gl_FragColor = vec4(vColor * tex.rgb, tex.a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })

    const namedCount = NAMED_STARS.length
    const namedPos = new Float32Array(namedCount * 3)
    const namedSizes = new Float32Array(namedCount)
    const namedColors = new Float32Array(namedCount * 3)
    NAMED_STARS.forEach(([, ra, dec, mag, con, spec], i) => {
      const [x, y, z] = raDecToXYZ(ra, dec, 1)
      namedPos[i * 3] = x
      namedPos[i * 3 + 1] = y
      namedPos[i * 3 + 2] = z
      namedSizes[i] = magToSize(mag) * 1.5
      const [r, g, b] = spectralToRGB(spec)
      namedColors[i * 3] = r
      namedColors[i * 3 + 1] = g
      namedColors[i * 3 + 2] = b
    })
    const namedGeo = new THREE.BufferGeometry()
    namedGeo.setAttribute('position', new THREE.BufferAttribute(namedPos, 3))
    namedGeo.setAttribute('aSize', new THREE.BufferAttribute(namedSizes, 1))
    namedGeo.setAttribute('aColor', new THREE.BufferAttribute(namedColors, 3))
    starGroup.add(new THREE.Points(namedGeo, starMat))

    const FAVORITES = (() => {
      try { return JSON.parse(localStorage.getItem('astroFavs') || '[]') } catch { return [] }
    })()
    const favStars = NAMED_STARS.filter(([name]) => FAVORITES.includes(name))
    if (favStars.length > 0) {
      const fN = favStars.length
      const fPos = new Float32Array(fN * 3)
      const fSizes = new Float32Array(fN)
      const fColors = new Float32Array(fN * 3)
      favStars.forEach(([, ra, dec, mag], i) => {
        const [x, y, z] = raDecToXYZ(ra, dec, 1)
        fPos[i * 3] = x
        fPos[i * 3 + 1] = y
        fPos[i * 3 + 2] = z
        fSizes[i] = magToSize(mag) * 2.4
        fColors[i * 3] = 1.00
        fColors[i * 3 + 1] = 0.82
        fColors[i * 3 + 2] = 0.35
      })
      const fGeo = new THREE.BufferGeometry()
      fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3))
      fGeo.setAttribute('aSize', new THREE.BufferAttribute(fSizes, 1))
      fGeo.setAttribute('aColor', new THREE.BufferAttribute(fColors, 3))
      starGroup.add(new THREE.Points(fGeo, starMat))
    }

    const exoCount = EXOPLANET_SYSTEMS.length
    const exoPos = new Float32Array(exoCount * 3)
    const exoSizes = new Float32Array(exoCount)
    const exoColors = new Float32Array(exoCount * 3)
    EXOPLANET_SYSTEMS.forEach((sys, i) => {
      const [x, y, z] = raDecToXYZ(sys.ra, sys.dec, 1)
      exoPos[i * 3] = x
      exoPos[i * 3 + 1] = y
      exoPos[i * 3 + 2] = z
      exoSizes[i] = 3.0
      const [r, g, b] = spectralToRGB(sys.spec)
      exoColors[i * 3] = r
      exoColors[i * 3 + 1] = g
      exoColors[i * 3 + 2] = b
    })
    const exoGeo = new THREE.BufferGeometry()
    exoGeo.setAttribute('position', new THREE.BufferAttribute(exoPos, 3))
    exoGeo.setAttribute('aSize', new THREE.BufferAttribute(exoSizes, 1))
    exoGeo.setAttribute('aColor', new THREE.BufferAttribute(exoColors, 3))
    starGroup.add(new THREE.Points(exoGeo, starMat))

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    mount.appendChild(renderer.domElement)

    const cubeRT = new THREE.WebGLCubeRenderTarget(2048, {
      format: THREE.RGBAFormat,
    })
    const cubeCamera = new THREE.CubeCamera(0.01, 10, cubeRT)
    cubeCamera.position.set(0, 0, 0)
    scene.add(cubeCamera)

    cubeCamera.update(renderer, scene)

    recaptureRef.current = () => {
      cubeCamera.update(renderer, scene)
    }

    highlightStarRef.current = (raHours, decDeg, name, extra) => {
      const [x, y, z] = raDecToXYZ(raHours, decDeg, 1)
      highlightedStarRef.current = {
        position: new THREE.Vector3(x, y, z),
        name,
        kind: extra?.kind ?? 'star',
        mag: extra?.mag ?? null,
        constellation: extra?.constellation ?? null,
      }
    }

    loadBrightStarCatalog().then(stars => {
      const filtered = stars.filter(s => {
        return !NAMED_STARS.some(([, nra, ndec]) => {
          let dra = Math.abs(s.ra - nra)
          if (dra > 12) dra = 24 - dra
          dra *= 15
          const ddec = Math.abs(s.dec - ndec)
          return Math.sqrt(dra * dra + ddec * ddec) < 0.2
        })
      })
      catalogStarsRef.current = filtered
      const N = filtered.length
      const catPos = new Float32Array(N * 3)
      const catSizes = new Float32Array(N)
      const catColors = new Float32Array(N * 3)
      filtered.forEach((s, i) => {
        const [x, y, z] = raDecToXYZ(s.ra, s.dec, 1)
        catPos[i * 3] = x
        catPos[i * 3 + 1] = y
        catPos[i * 3 + 2] = z
        catSizes[i] = magToSize(s.mag ?? 6)
        const [r, g, b] = spectralToRGB(s.spectral || 'G')
        catColors[i * 3] = r
        catColors[i * 3 + 1] = g
        catColors[i * 3 + 2] = b
      })
      const catGeo = new THREE.BufferGeometry()
      catGeo.setAttribute('position', new THREE.BufferAttribute(catPos, 3))
      catGeo.setAttribute('aSize', new THREE.BufferAttribute(catSizes, 1))
      catGeo.setAttribute('aColor', new THREE.BufferAttribute(catColors, 3))
      starGroup.add(new THREE.Points(catGeo, starMat))
      cubeCamera.update(renderer, scene)
    }).catch(err => console.error('Bright Star Catalog load failed:', err))

    const fisheyeScene = new THREE.Scene()
    const fisheyeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

    const fisheyeMat = new THREE.ShaderMaterial({
      uniforms: {
        uCube: { value: cubeRT.texture },
        uAspect: { value: window.innerWidth / window.innerHeight },
        uYaw: { value: 0.0 },
        uPitch: { value: 0.0 },
        uFov: { value: Math.PI * 0.5 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform samplerCube uCube;
        uniform float uAspect;
        uniform float uYaw;
        uniform float uPitch;
        uniform float uFov;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          p.x *= uAspect;
          float r = length(p);
          float maxR = sqrt(1.0 + uAspect * uAspect);
          float theta = (r / maxR) * uFov * 0.5;
          float sinT = sin(theta);
          float cosT = cos(theta);
          vec2 dir2d = r > 0.0001 ? p / r : vec2(0.0, 0.0);
          vec3 dirView = vec3(dir2d.x * sinT, dir2d.y * sinT, cosT);
          vec3 F = vec3(sin(uYaw) * cos(uPitch), sin(uPitch), cos(uYaw) * cos(uPitch));
          vec3 R = vec3(cos(uYaw), 0.0, -sin(uYaw));
          vec3 U = vec3(-sin(uYaw) * sin(uPitch), cos(uPitch), -cos(uYaw) * sin(uPitch));
          vec3 worldDir = R * dirView.x + U * dirView.y + F * dirView.z;
          vec3 col = textureCube(uCube, worldDir).rgb;
          float fovDeg = degrees(uFov);
          float vignetteAmt = smoothstep(60.0, 8.0, fovDeg) * 0.55;
          float v = 1.0 - vignetteAmt * pow(r / maxR, 2.2);
          col *= v;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })

    fisheyeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fisheyeMat))

    const discScene = new THREE.Scene()
    const discCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1e5, 1e5)
    const aspect0 = window.innerWidth / window.innerHeight
    discCamera.left = -aspect0
    discCamera.right = aspect0
    discCamera.updateProjectionMatrix()

    discScene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const sunLight3D = new THREE.DirectionalLight(0xfff5e0, 1.4)
    sunLight3D.position.set(0, 0, 10)
    discScene.add(sunLight3D)

    const textureLoader = new THREE.TextureLoader()
    const bodyMeshes = {}
    const sphereGeo = new THREE.SphereGeometry(1, 64, 64)

    SS_BODIES.forEach(b => {
      const tex = textureLoader.load(b.tex)
      tex.anisotropy = 8
      tex.minFilter = THREE.LinearMipmapLinearFilter
      tex.magFilter = THREE.LinearFilter

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.9,
        metalness: 0.0,
        emissive: b.kind === 'sun' ? new THREE.Color(0xffdd88) : new THREE.Color(0x000000),
        emissiveIntensity: b.kind === 'sun' ? 1.2 : 0,
        emissiveMap: b.kind === 'sun' ? tex : null,
      })

      const mesh = new THREE.Mesh(sphereGeo, mat)
      const tilts = { Venus: 177, Earth: 23, Mars: 25, Saturn: 26.7, Uranus: 98, Neptune: 28 }
      const tiltDeg = tilts[b.name] ?? 0
      mesh.rotation.z = tiltDeg * Math.PI / 180
      mesh.visible = false
      discScene.add(mesh)

      let ringMesh = null
      if (b.name === 'Saturn') {
        const ringGeo = new THREE.RingGeometry(1.25, 2.3, 128)
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xd4b896,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        })
        ringMesh = new THREE.Mesh(ringGeo, ringMat)
        ringMesh.rotation.x = Math.PI / 2.4
        ringMesh.visible = false
        discScene.add(ringMesh)
      }

      let glowSprite = null
      if (b.kind === 'sun') {
        const col = bodyColor(b.name)
        const glowTex = makeGlowTexture(col)
        glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }))
        glowSprite.visible = false
        discScene.add(glowSprite)
      }

      bodyMeshes[b.name] = { mesh, ringMesh, glowSprite, kind: b.kind, name: b.name }
    })

    const satGeo = new THREE.BufferGeometry()
    const satPosArr = new Float32Array(LIVE_SATELLITES.length * 3)
    satGeo.setAttribute('position', new THREE.BufferAttribute(satPosArr, 3))
    satGeo.setDrawRange(0, 0)
    const satMat = new THREE.PointsMaterial({
      map: makeSatelliteTexture(),
      size: 34,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
      alphaTest: 0.01,
    })
    const satPoints = new THREE.Points(satGeo, satMat)
    satPoints.visible = false
    discScene.add(satPoints)

    let yaw = 0
    let pitch = 0
    let targetYaw = 0
    let targetPitch = 0
    let fov = Math.PI * 0.5
    let targetFov = Math.PI * 0.5

    pointAtRef.current = (raHours, decDeg, angularSizeArcsec) => {
      const [x, y, z] = raDecToXYZ(raHours, decDeg, 1)
      const v = new THREE.Vector3(x, y, z)
        .applyMatrix4(rotationRef.current)
        .normalize()
      targetPitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, Math.asin(v.y)))
      targetYaw = Math.atan2(v.x, v.z)

      if (angularSizeArcsec) {
        const angRad = angularSizeArcsec / RAD_TO_ARCSEC
        targetFov = Math.max(angRad * 6, 0.1 * Math.PI / 180)
      } else {
        targetFov = 2 * Math.PI / 180
      }
    }

    let dragging = false
    let lastX = 0, lastY = 0
    let pointerDownX = 0
    let pointerDownY = 0
    let pointerDownTarget = null

    function onPointerDown(e) {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      targetYaw = yaw
      targetPitch = pitch
      pointerDownX = e.clientX
      pointerDownY = e.clientY
      pointerDownTarget = e.target
    }
    function onPointerMove(e) {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      yaw -= dx * 0.005
      pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, pitch - dy * 0.005))
      targetYaw = yaw
      targetPitch = pitch
      lastX = e.clientX
      lastY = e.clientY
    }

    function projectToScreen(raHours, decDeg) {
      const [x, y, z] = raDecToXYZ(raHours, decDeg, 1)
      const v = new THREE.Vector3(x, y, z).applyMatrix4(rotationRef.current).normalize()
      const F = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      )
      const R = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
      const U = new THREE.Vector3(
        -Math.sin(yaw) * Math.sin(pitch),
        Math.cos(pitch),
        -Math.cos(yaw) * Math.sin(pitch)
      )
      const vz = v.dot(F)
      if (vz <= 0.001) return null
      const vx = v.dot(R)
      const vy = v.dot(U)
      const theta = Math.acos(Math.max(-1, Math.min(1, vz)))
      const aspect = window.innerWidth / window.innerHeight
      const maxR = Math.sqrt(1 + aspect * aspect)
      const rScreen = (theta / (fov * 0.5)) * maxR
      const sinT = Math.sin(theta)
      let pX = 0, pY = 0
      if (sinT > 0.0001) {
        pX = (vx / sinT) * rScreen
        pY = (vy / sinT) * rScreen
      }
      return {
        x: ((pX / aspect) + 1) * 0.5 * window.innerWidth,
        y: (1 - (pY + 1) * 0.5) * window.innerHeight,
      }
    }

    function findObjectAt(clickX, clickY) {
      let best = null
      let bestScore = Infinity
      const aspect = window.innerWidth / window.innerHeight
      const maxR = Math.sqrt(1 + aspect * aspect)

      function consider(ra, dec, data, angularSize) {
        const pos = projectToScreen(ra, dec)
        if (!pos) return
        const rawD = Math.hypot(pos.x - clickX, pos.y - clickY)
        let score = rawD
        let threshold = 25
        if (angularSize) {
          const pixelRadius = (angularSize / RAD_TO_ARCSEC) * maxR * window.innerHeight / fov / 2
          if (pixelRadius * 2 < 3) return
          score = Math.max(0, rawD - pixelRadius)
          threshold = pixelRadius + 15
        }
        if (score < threshold && score < bestScore) {
          bestScore = score
          best = data
        }
      }

      for (const [name, ra, dec, mag, con] of NAMED_STARS) {
        consider(ra, dec, { name, kind: 'star', mag, constellation: con, ra, dec })
      }
      for (const s of catalogStarsRef.current) {
        consider(s.ra, s.dec, {
          name: 'HR ' + s.hr,
          kind: 'star',
          mag: s.mag,
          constellation: null,
          ra: s.ra,
          dec: s.dec,
        })
      }
      for (const b of solarBodiesRef.current) {
        consider(
          b.ra, b.dec,
          { name: b.name, kind: b.kind, mag: b.magnitude, constellation: null, ra: b.ra, dec: b.dec, angularSize: b.angularSize },
          b.angularSize
        )
      }
      for (const sys of EXOPLANET_SYSTEMS) {
        consider(sys.ra, sys.dec, {
          name: sys.name,
          kind: 'exoplanet-host',
          mag: sys.mag,
          constellation: null,
          ra: sys.ra,
          dec: sys.dec,
          planets: sys.planets,
          dist: sys.dist,
        })
      }
      for (const s of satellitesRef.current) {
        consider(s.ra, s.dec, {
          name: s.name,
          kind: 'satellite',
          mag: null,
          constellation: null,
          ra: s.ra,
          dec: s.dec,
          altitudeDeg: s.altitudeDeg,
          rangeKm: s.rangeKm,
        })
      }
      return best
    }

    function onPointerUp(e) {
      dragging = false
      if (!pointerDownTarget) return
      const wasOnCanvas = pointerDownTarget === renderer.domElement
      const moved = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY)
      pointerDownTarget = null
      if (!wasOnCanvas) return
      if (moved > 10) return

      const obj = findObjectAt(e.clientX, e.clientY)
      setSelectedObject(obj || null)
      highlightedStarRef.current = null
    }

    function onWheel(e) {
      e.preventDefault()
      const factor = Math.exp(e.deltaY * 0.003)
      targetFov = Math.max(1e-6, Math.min(Math.PI, targetFov * factor))
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('wheel', onWheel, { passive: false })

    function onResize() {
      renderer.setSize(window.innerWidth, window.innerHeight)
      fisheyeMat.uniforms.uAspect.value = window.innerWidth / window.innerHeight
      const a = window.innerWidth / window.innerHeight
      discCamera.left = -a
      discCamera.right = a
      discCamera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    const fovReadout = document.getElementById('astrogaze-fov')
    const frameReadout = document.getElementById('astrogaze-frame')

    let animId

    async function refreshSatellites() {
      const obs = observerRef.current
      const sats = await loadLiveSatellites(obs.latitude, obs.longitude)
      setSatellites(sats)
      satellitesRef.current = sats
    }
    refreshSatellites()
    const satInterval = setInterval(refreshSatellites, 30000)
    refreshSatellitesRef.current = refreshSatellites

    function animate() {
      animId = requestAnimationFrame(animate)

      let dYaw = targetYaw - yaw
      if (dYaw > Math.PI) dYaw -= 2 * Math.PI
      if (dYaw < -Math.PI) dYaw += 2 * Math.PI
      yaw += dYaw * 0.12
      pitch += (targetPitch - pitch) * 0.12
      fov += (targetFov - fov) * 0.28

      fisheyeMat.uniforms.uYaw.value = yaw
      fisheyeMat.uniforms.uPitch.value = pitch
      fisheyeMat.uniforms.uFov.value = fov

      const aspect = window.innerWidth / window.innerHeight
      const maxR = Math.sqrt(1 + aspect * aspect)
      const H = window.innerHeight
      const Fv = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      )
      const Rv = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
      const Uv = new THREE.Vector3(
        -Math.sin(yaw) * Math.sin(pitch),
        Math.cos(pitch),
        -Math.cos(yaw) * Math.sin(pitch)
      )

      if (satellitesRef.current.length > 0) {
        const posAttr = satPoints.geometry.attributes.position
        let visibleIdx = 0
        for (const s of satellitesRef.current) {
          const [sx, sy, sz] = raDecToXYZ(s.ra, s.dec, 1)
          const v = new THREE.Vector3(sx, sy, sz).applyMatrix4(rotationRef.current).normalize()
          const vzS = v.dot(Fv)
          if (vzS <= 0.001) continue
          const vxS = v.dot(Rv)
          const vyS = v.dot(Uv)
          const thetaS = Math.acos(Math.max(-1, Math.min(1, vzS)))
          const rS = (thetaS / (fov * 0.5)) * maxR
          const sinTS = Math.sin(thetaS)
          if (sinTS < 0.0001) continue
          const px = (vxS / sinTS) * rS
          const py = (vyS / sinTS) * rS
          posAttr.setXYZ(visibleIdx, px, py, 0)
          visibleIdx++
        }
        posAttr.needsUpdate = true
        satPoints.geometry.setDrawRange(0, visibleIdx)
        satPoints.visible = visibleIdx > 0
      } else {
        satPoints.visible = false
      }

      let anyDiscLarge = false
      const THRESHOLD_SHOW = 12

      for (const b of solarBodiesRef.current) {
        const entry = bodyMeshes[b.name]
        if (!entry) continue
        const { mesh, ringMesh, glowSprite, kind } = entry

        const [x, y, z] = raDecToXYZ(b.ra, b.dec, 1)
        const v = new THREE.Vector3(x, y, z).applyMatrix4(rotationRef.current).normalize()
        const vz = v.dot(Fv)

        if (vz <= 0.001) {
          mesh.visible = false
          if (ringMesh) ringMesh.visible = false
          if (glowSprite) glowSprite.visible = false
          continue
        }

        const vx = v.dot(Rv)
        const vy = v.dot(Uv)
        const theta = Math.acos(Math.max(-1, Math.min(1, vz)))
        const rScreen = (theta / (fov * 0.5)) * maxR

        const sinT = Math.sin(theta)
        let pX = 0, pY = 0
        if (sinT > 0.0001) {
          pX = (vx / sinT) * rScreen
          pY = (vy / sinT) * rScreen
        }

        const thetaBody = b.angularSize / RAD_TO_ARCSEC
        const pixelDiam = thetaBody * maxR * H / fov
        const worldDiam = (pixelDiam / H) * 2

        if (pixelDiam < THRESHOLD_SHOW) {
          mesh.visible = false
          if (ringMesh) ringMesh.visible = false
          if (glowSprite) glowSprite.visible = false
        } else {
          mesh.visible = true
          mesh.position.set(pX, pY, 0)
          mesh.scale.set(worldDiam / 2, worldDiam / 2, worldDiam / 2)
          mesh.rotation.y += kind === 'sun' ? 0.0003 : 0.001

          if (ringMesh) {
            ringMesh.visible = true
            ringMesh.position.set(pX, pY, 0)
            ringMesh.scale.set(worldDiam / 2, worldDiam / 2, worldDiam / 2)
          }

          if (glowSprite) {
            glowSprite.visible = true
            glowSprite.position.set(pX, pY, -0.01)
            const glowScale = worldDiam * 3.5
            glowSprite.scale.set(glowScale, glowScale, 1)
          }

          if (pixelDiam > 40) anyDiscLarge = true
        }
      }

      camStateRef.current.yaw = yaw
      camStateRef.current.pitch = pitch
      camStateRef.current.fov = fov
      camStateRef.current.discLarge = anyDiscLarge

      if (fovReadout) {
        const deg = fov * 180 / Math.PI
        if (deg >= 1) fovReadout.textContent = deg.toFixed(2) + '°'
        else if (deg >= 1 / 60) fovReadout.textContent = (deg * 60).toFixed(2) + '′'
        else fovReadout.textContent = (deg * 3600).toFixed(2) + '″'
      }
      if (frameReadout) {
        const azDeg = ((yaw * 180 / Math.PI) % 360 + 360) % 360
        const altDeg = pitch * 180 / Math.PI
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
        const compass = dirs[Math.round(azDeg / 45) % 8]
        frameReadout.textContent = compass + ' · ' + (altDeg >= 0 ? '+' : '') + altDeg.toFixed(0) + '°'
      }

      renderer.autoClear = true
      renderer.render(fisheyeScene, fisheyeCamera)
      renderer.autoClear = false
      renderer.render(discScene, discCamera)
      renderer.autoClear = true
    }
    animate()

    return () => {
      clearInterval(satInterval)
      cancelAnimationFrame(animId)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
      pointAtRef.current = null
      recaptureRef.current = null
      highlightStarRef.current = null
      highlightedStarRef.current = null
      refreshSatellitesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!starGroupRef.current) return
    const lst = computeLST(obsTime, observer.longitude)
    const m = computeStarRotation(observer.latitude, lst)
    rotationRef.current.copy(m)
    starGroupRef.current.setRotationFromMatrix(m)

    solarBodiesRef.current = getSolarSystemBodies(obsTime, observer.latitude, observer.longitude)

    if (recaptureRef.current) recaptureRef.current()
    if (refreshSatellitesRef.current) refreshSatellitesRef.current()
  }, [observer, obsTime])

  const dtValue = new Date(obsTime.getTime() - obsTime.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: '#02030f' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <StarLabel starRef={highlightedStarRef} camStateRef={camStateRef} rotationRef={rotationRef} />

      {selectedObject && (
        <div style={{
          position: 'absolute',
          bottom: 60,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(4,6,26,0.92)',
          border: '1px solid rgba(100,140,255,0.3)',
          borderRadius: 12,
          padding: '14px 40px 14px 20px',
          backdropFilter: 'blur(20px)',
          zIndex: 45,
          minWidth: 220,
          maxWidth: 320,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <button
            onClick={() => setSelectedObject(null)}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'transparent', border: 'none',
              color: 'rgba(180,200,255,0.5)', fontSize: 18,
              cursor: 'pointer', padding: '2px 8px',
              fontFamily: 'inherit',
            }}
          >×</button>

          <div style={{ color: '#e5e9f5', fontSize: 16, fontWeight: 600, letterSpacing: '0.02em' }}>
            {selectedObject.name}
          </div>
          <div style={{ color: 'rgba(180,200,240,0.75)', fontSize: 12, marginTop: 6, letterSpacing: '0.04em' }}>
            {(() => {
              const parts = [
                (selectedObject.kind || 'object')[0].toUpperCase() +
                (selectedObject.kind || 'object').slice(1)
              ]
              if (selectedObject.mag !== null && selectedObject.mag !== undefined) {
                parts.push('Mag ' + (typeof selectedObject.mag === 'number'
                  ? selectedObject.mag.toFixed(2)
                  : selectedObject.mag))
              }
              if (selectedObject.constellation) parts.push(selectedObject.constellation)
              return parts.join(' · ')
            })()}
          </div>

          {selectedObject.dist && (
            <div style={{ color: 'rgba(180,200,240,0.6)', fontSize: 11, marginTop: 3 }}>
              {selectedObject.dist} light-years away
            </div>
          )}

          {selectedObject.rangeKm && (
            <div style={{ color: 'rgba(180,200,240,0.6)', fontSize: 11, marginTop: 3 }}>
              {selectedObject.rangeKm.toFixed(0)} km away ·{' '}
              {selectedObject.altitudeDeg > 0
                ? `${selectedObject.altitudeDeg.toFixed(0)}° above horizon`
                : 'below horizon'}
            </div>
          )}

          {selectedObject.planets && selectedObject.planets.length > 0 && (
            <div style={{
              marginTop: 10, paddingTop: 10,
              borderTop: '1px solid rgba(100,140,255,0.15)',
              display: 'flex', flexWrap: 'wrap', gap: 6,
            }}>
              {selectedObject.planets.map(p => (
                <span key={p.id} style={{
                  background: 'rgba(255,200,80,0.12)',
                  border: '1px solid rgba(255,200,80,0.3)',
                  color: '#ffd680', borderRadius: 6,
                  padding: '3px 8px', fontSize: 11, fontWeight: 500,
                }}>
                  {p.id}{p.note ? ` · ${p.note}` : ''}
                </span>
              ))}
            </div>
          )}

          {selectedObject.planet && (
            <div style={{
              marginTop: 10, paddingTop: 10,
              borderTop: '1px solid rgba(100,140,255,0.15)',
              color: 'rgba(255,215,140,0.9)', fontSize: 12,
            }}>
              Orbiting {selectedObject.system.name}
              {selectedObject.planet.note ? ` — ${selectedObject.planet.note}` : ''}
            </div>
          )}

          <button
            onClick={() => {
              const ra = selectedObject.ra ?? selectedObject.system?.ra
              const dec = selectedObject.dec ?? selectedObject.system?.dec
              if (ra !== undefined && dec !== undefined && pointAtRef.current) {
                pointAtRef.current(ra, dec, selectedObject.angularSize)
              }
            }}
            style={{
              marginTop: 12,
              background: 'rgba(255,190,70,0.15)',
              border: '1px solid rgba(255,190,70,0.45)',
              color: '#ffd680', borderRadius: 8,
              padding: '8px 16px', fontSize: 12, fontWeight: 600,
              letterSpacing: '0.06em', cursor: 'pointer',
              fontFamily: 'inherit', width: '100%', minHeight: 40,
            }}
          >
            FLY TO IT
          </button>
        </div>
      )}

      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 40,
          background: 'rgba(4,6,26,0.85)',
          border: '1px solid rgba(100,140,255,0.3)',
          color: '#c8d8ff', borderRadius: 8, padding: '8px 14px',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >← Back</button>

      <div style={{
        position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
        zIndex: 40, width: 240,
      }}>
        <SearchBar
          items={GAZE_SEARCH_ITEMS}
          placeholder="Search…"
          onSelect={(it) => {
            setSelectedObject(null)
            const star = NAMED_STARS.find(x => x[0] === it.name)
            if (star && pointAtRef.current) {
              pointAtRef.current(star[1], star[2])
              highlightStarRef.current?.(star[1], star[2], star[0], {
                kind: 'star', mag: star[3], constellation: star[4],
              })
              return
            }
            const body = solarBodiesRef.current.find(b => b.name === it.name)
            if (body && pointAtRef.current) {
              pointAtRef.current(body.ra, body.dec, body.angularSize)
              highlightStarRef.current?.(body.ra, body.dec, body.name, {
                kind: body.kind, mag: body.magnitude, constellation: null,
              })
              return
            }
            for (const sys of EXOPLANET_SYSTEMS) {
              const sysMatch = it.name === sys.name
              const planetMatch = it.name.startsWith(sys.name + ' ')
              if ((sysMatch || planetMatch) && pointAtRef.current) {
                pointAtRef.current(sys.ra, sys.dec)
                highlightStarRef.current?.(sys.ra, sys.dec, sys.name, {
                  kind: 'star', mag: sys.mag, constellation: null,
                })
                setSelectedObject(
                  planetMatch
                    ? {
                        name: it.name, kind: 'exoplanet', system: sys,
                        planet: sys.planets.find(p => it.name === `${sys.name} ${p.id}`),
                        ra: sys.ra, dec: sys.dec,
                      }
                    : {
                        name: sys.name, kind: 'exoplanet-host', system: sys,
                        mag: sys.mag, planets: sys.planets, dist: sys.dist,
                        ra: sys.ra, dec: sys.dec,
                      }
                )
                return
              }
            }
            const sat = satellitesRef.current.find(s => s.name === it.name)
            if (sat && pointAtRef.current) {
              pointAtRef.current(sat.ra, sat.dec)
              highlightStarRef.current?.(sat.ra, sat.dec, sat.name, {
                kind: 'star', mag: null, constellation: null,
              })
              setSelectedObject(sat)
            }
          }}
        />
      </div>

      <div style={{
        position: 'absolute', top: 72, right: 20, zIndex: 40,
        color: '#c8d8ff', fontFamily: 'ui-monospace, monospace',
        fontSize: 13, letterSpacing: '0.05em', textAlign: 'right',
        pointerEvents: 'none', textShadow: '0 0 12px rgba(100,150,255,0.6)',
      }}>
        <div style={{ fontSize: 10, color: 'rgba(140,170,255,0.5)', marginBottom: 2, letterSpacing: '0.15em' }}>FIELD OF VIEW</div>
        <div id="astrogaze-fov" style={{ fontSize: 18, fontWeight: 500 }}>90.00°</div>
        <div id="astrogaze-frame" style={{ fontSize: 11, color: 'rgba(140,170,255,0.65)', marginTop: 4 }}>N · +0°</div>
      </div>

      <div style={{
        position: 'absolute', bottom: 44, left: 20, zIndex: 40,
        display: 'flex', flexDirection: 'column', gap: 8,
        fontFamily: 'system-ui, sans-serif',
      }}>
        <select
          value={observer.name}
          onChange={(e) => {
            const city = CITIES.find(c => c.name === e.target.value)
            if (city) setObserver({ name: city.name, latitude: city.latitude, longitude: city.longitude })
          }}
          style={{
            background: 'rgba(4,6,26,0.85)',
            border: '1px solid rgba(100,140,255,0.3)',
            color: '#c8d8ff', borderRadius: 8,
            padding: '6px 10px', fontSize: 13,
            fontFamily: 'inherit', outline: 'none', maxWidth: 200,
          }}
        >
          {CITIES.map(c => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={dtValue}
          onChange={(e) => setObsTime(new Date(e.target.value))}
          style={{
            background: 'rgba(4,6,26,0.85)',
            border: '1px solid rgba(100,140,255,0.3)',
            color: '#c8d8ff', borderRadius: 8,
            padding: '6px 10px', fontSize: 13,
            fontFamily: 'inherit', outline: 'none', maxWidth: 200,
          }}
        />
      </div>

      <div style={{
        position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)',
        color: 'rgba(160,190,255,0.4)', fontSize: 12, zIndex: 40,
        pointerEvents: 'none', whiteSpace: 'nowrap',
      }}>
        Drag to look · Scroll to zoom
      </div>
    </div>
  )
}

function StarLabel({ starRef, camStateRef, rotationRef }) {
  const [, tick] = useState(0)

  useEffect(() => {
    let raf
    function loop() {
      tick(t => t + 1)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const star = starRef.current
  if (!star) return null

  const { yaw, pitch, fov } = camStateRef.current

  const F = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  )
  const R = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
  const U = new THREE.Vector3(
    -Math.sin(yaw) * Math.sin(pitch),
    Math.cos(pitch),
    -Math.cos(yaw) * Math.sin(pitch)
  )

  const v = star.position.clone().applyMatrix4(rotationRef.current).normalize()
  const vx = v.dot(R)
  const vy = v.dot(U)
  const vz = v.dot(F)

  if (vz <= 0.001) return null

  const theta = Math.acos(Math.max(-1, Math.min(1, vz)))
  const aspect = window.innerWidth / window.innerHeight
  const maxR = Math.sqrt(1 + aspect * aspect)
  const rScreen = (theta / (fov * 0.5)) * maxR

  const sinT = Math.sin(theta)
  let pX = 0, pY = 0
  if (sinT > 0.0001) {
    pX = (vx / sinT) * rScreen
    pY = (vy / sinT) * rScreen
  }

  const px = ((pX / aspect) + 1) * 0.5 * window.innerWidth
  const py = (1 - (pY + 1) * 0.5) * window.innerHeight

  const kindColors = {
    star:    { glow: 'rgba(140,180,255,0.9)' },
    planet:  { glow: 'rgba(255,170,60,0.9)' },
    moon:    { glow: 'rgba(200,210,240,0.9)' },
    sun:     { glow: 'rgba(255,200,80,0.9)' },
    satellite: { glow: 'rgba(100,220,255,0.95)' },
  }
  const kc = kindColors[star.kind] || kindColors.star

  return (
    <div style={{
      position: 'absolute',
      left: px, top: py,
      pointerEvents: 'none',
      zIndex: 35,
      transform: 'translate(-50%, -50%)',
      width: 0, height: 0,
    }}>
      <div style={{
        position: 'absolute',
        left: 0, top: 24,
        transform: 'translateX(-50%)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        <div style={{
          color: '#e5e9f5',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13, fontWeight: 500,
          letterSpacing: '0.06em',
          textShadow: `0 0 8px ${kc.glow}, 0 0 16px ${kc.glow}`,
        }}>
          {star.name}
        </div>
        {star.mag !== null && star.mag !== undefined && (
          <div style={{
            color: 'rgba(180,200,240,0.72)',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 11, fontWeight: 400,
            letterSpacing: '0.05em',
            marginTop: 3,
            textShadow: '0 0 6px rgba(80,120,255,0.5)',
          }}>
            Mag {typeof star.mag === 'number' ? star.mag.toFixed(2) : star.mag}
            {star.constellation ? ' · ' + star.constellation : ''}
          </div>
        )}
      </div>
    </div>
  )
}