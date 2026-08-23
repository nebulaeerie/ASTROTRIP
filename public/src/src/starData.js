// Loads the real HYG star catalog (RA/Dec/magnitude/color/name) and turns it
// into data Three.js can render: a single Points cloud for all stars, plus a
// short list of named/bright stars used as click targets.
//
// Data source: HYG Database v4.2 (Hipparcos + Yale Bright Star + Gliese),
// CC BY-SA 4.0, https://codeberg.org/astronexus/hyg
// Expected file: /hygdata_v42.csv served from the public/ folder (see README
// note below for where to download it).

const SKY_RADIUS = 2400 // just inside the nebula backdrop sphere (radius 2500)

// Approximate B-V color index -> RGB. Blue-white stars have low/negative CI,
// red giants/dwarfs have high CI, ~0.65 is Sun-like white-yellow.
function colorIndexToRGB(ciRaw) {
  const ci = Number.isFinite(ciRaw) ? Math.max(-0.4, Math.min(2.0, ciRaw)) : 0.65
  let r, g, b
  if (ci < 0.0) {
    const t = (ci + 0.4) / 0.4
    r = 0.61 + 0.15 * t; g = 0.70 + 0.22 * t; b = 1.0
  } else if (ci < 0.4) {
    const t = ci / 0.4
    r = 0.76 + 0.24 * t; g = 0.92 + 0.08 * t; b = 1.0 - 0.12 * t
  } else if (ci < 1.0) {
    const t = (ci - 0.4) / 0.6
    r = 1.0; g = 1.0 - 0.18 * t; b = 0.88 - 0.5 * t
  } else {
    const t = Math.min(1, (ci - 1.0) / 1.0)
    r = 1.0; g = 0.82 - 0.42 * t; b = 0.38 - 0.3 * t
  }
  return [Math.max(0, Math.min(1, r)), Math.max(0, Math.min(1, g)), Math.max(0, Math.min(1, b))]
}

// RA is in hours (0-24), Dec is in degrees (-90 to 90). We ignore true
// distance and place every star on one fixed shell, the way the real night
// sky looks from Earth (distance differences are meaningless for a visual
// backdrop, and true-scale placement would put "nearby" stars absurdly far
// past the outer planets anyway).
function raDecToXYZ(raHours, decDeg, radius) {
  const ra = (raHours / 24) * Math.PI * 2
  const dec = (decDeg * Math.PI) / 180
  return [
    radius * Math.cos(dec) * Math.cos(ra),
    radius * Math.sin(dec),
    radius * Math.cos(dec) * Math.sin(ra),
  ]
}

function parseCSVLine(line) {
  // HYG's CSV has no embedded commas in the fields we use, so a plain split
  // is safe and much faster than a general CSV parser for ~120k rows.
  return line.split(',')
}

export async function loadStars() {
  const res = await fetch('/hygdata_v42.csv')
  if (!res.ok) throw new Error(`Could not load star catalog (${res.status})`)
  const text = await res.text()

  const lines = text.split('\n')
  const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
  const col = Object.fromEntries(header.map((h, i) => [h, i]))
  const need = ['ra', 'dec', 'mag']
  for (const c of need) {
    if (!(c in col)) throw new Error(`Star catalog missing expected column "${c}"`)
  }

  const positions = []
  const colors = []
  const named = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const c = parseCSVLine(line)

    const ra = parseFloat(c[col.ra])
    const dec = parseFloat(c[col.dec])
    const mag = parseFloat(c[col.mag])
    if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue

    const ci = col.ci !== undefined ? parseFloat(c[col.ci]) : NaN
    const [x, y, z] = raDecToXYZ(ra, dec, SKY_RADIUS)
    positions.push(x, y, z)

    const [r, g, b] = colorIndexToRGB(ci)
    // Brighter (lower magnitude) stars render more intensely so the sky
    // still reads as "denser but realistic" rather than flat-uniform.
    const brightness = Number.isFinite(mag)
      ? Math.max(0.22, 1 - Math.max(0, mag - 4) / 10)
      : 0.5
    colors.push(r * brightness, g * brightness, b * brightness)

    const proper = col.proper !== undefined ? (c[col.proper] || '').trim() : ''
    if (proper && Number.isFinite(mag) && mag < 4.2) {
      named.push({
        name: proper,
        position: [x, y, z],
        mag,
        dist: col.dist !== undefined ? parseFloat(c[col.dist]) : undefined,
        con: col.con !== undefined ? c[col.con] : undefined,
      })
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    named,
  }
}

export function starInfoPanel(star) {
  const stats = { Type: 'Star' }
  if (Number.isFinite(star.mag)) stats['Apparent Mag'] = star.mag.toFixed(2)
  if (Number.isFinite(star.dist) && star.dist < 1e7) stats['Distance'] = `${(star.dist * 3.262).toFixed(1)} ly`
  if (star.con) stats['Constellation'] = star.con
  return {
    name: star.name,
    info: `${star.name} is a real star from the HYG catalog, shown here at its true position in the sky as seen from Earth.`,
    stats,
  }
}
