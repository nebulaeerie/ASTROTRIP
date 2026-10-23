export default async function handler(req, res) {
  const { norad } = req.query
  if (!norad || !/^\d+$/.test(norad)) {
    res.status(400).json({ error: 'invalid norad' })
    return
  }
  try {
    const r = await fetch(
      `https://celestrak.org/NORAD/elements/gp.php?CATNR=${norad}&FORMAT=TLE`
    )
    if (!r.ok) {
      res.status(r.status).json({ error: 'celestrak ' + r.status })
      return
    }
    const text = await r.text()
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.status(200).send(text)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
}