// Loads the Yale Bright Star Catalog (public domain, ~9,096 real stars with
// real RA/Dec/magnitude/spectral-type data) from /BSC.json in the public
// folder. Most stars only have a catalog number (no common name) -- that's
// normal for real astronomical data; only ~50 of the brightest stars have
// household names, which are kept separately in App.jsx's NAMED_STARS list.

export async function loadBrightStarCatalog() {
  const res = await fetch('/BSC.json')
  if (!res.ok) throw new Error(`Could not load BSC.json (${res.status})`)
  const data = await res.json()

  return data
    .map(entry => {
      const raParts = String(entry.RA || '').split(':').map(Number)
      const decRaw = String(entry.DEC || '')
      const sign = decRaw.trim().startsWith('-') ? -1 : 1
      const decParts = decRaw.replace('+', '').replace('-', '').split(':').map(Number)
      if (raParts.length !== 3 || decParts.length !== 3) return null
      const [rh, rm, rs] = raParts
      const [dd, dm, ds] = decParts
      if ([rh, rm, rs, dd, dm, ds].some(n => !Number.isFinite(n))) return null

      const ra = rh + rm / 60 + rs / 3600
      const dec = sign * (dd + dm / 60 + ds / 3600)
      const mag = parseFloat(entry.MAG)

      return {
        hr: entry['harvard_ref_#'],
        ra,
        dec,
        mag: Number.isFinite(mag) ? mag : 6.5,
        spectral: entry['Title HD'] || '',
      }
    })
    .filter(Boolean)
}