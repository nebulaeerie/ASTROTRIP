// Major annual meteor showers.
// peak: [month, day] (1-indexed month)
// active: [startMonth, startDay, endMonth, endDay]
// zhr: zenithal hourly rate (rough peak meteors/hour under dark sky)


export const METEOR_SHOWERS = [
  { name: 'Quadrantids',   peak: [1, 3],   active: [12, 28, 1, 12],  zhr: 110, parent: 'asteroid 2003 EH1' },
  { name: 'Lyrids',        peak: [4, 22],  active: [4, 16, 4, 25],   zhr: 18,  parent: 'comet C/1861 G1 Thatcher' },
  { name: 'Eta Aquariids', peak: [5, 6],   active: [4, 19, 5, 28],   zhr: 50,  parent: 'comet 1P/Halley' },
  { name: 'Delta Aquariids',peak: [7, 30], active: [7, 12, 8, 23],   zhr: 25,  parent: 'comet 96P/Machholz' },
  { name: 'Perseids',      peak: [8, 12],  active: [7, 17, 8, 24],   zhr: 100, parent: 'comet 109P/Swift-Tuttle' },
  { name: 'Draconids',     peak: [10, 8],  active: [10, 6, 10, 10],  zhr: 10,  parent: 'comet 21P/Giacobini-Zinner' },
  { name: 'Orionids',      peak: [10, 21], active: [10, 2, 11, 7],   zhr: 20,  parent: 'comet 1P/Halley' },
  { name: 'Taurids',       peak: [11, 5],  active: [10, 20, 11, 30], zhr: 5,   parent: 'comet 2P/Encke' },
  { name: 'Leonids',       peak: [11, 17], active: [11, 6, 11, 30],  zhr: 15,  parent: 'comet 55P/Tempel-Tuttle' },
  { name: 'Geminids',      peak: [12, 14], active: [12, 4, 12, 17],  zhr: 150, parent: 'asteroid 3200 Phaethon' },
  { name: 'Ursids',        peak: [12, 22], active: [12, 17, 12, 26], zhr: 10,  parent: 'comet 8P/Tuttle' },
];

// Return the shower whose active window contains the given date,
// or null if none. Handles year-wrapping (e.g. Quadrantids).
export function getActiveShower(date) {
  const m = date.getMonth() + 1; // 1-12
  const d = date.getDate();

  for (const s of METEOR_SHOWERS) {
    const [sm, sd, em, ed] = s.active;

    // Normal case: same-year window
    if (sm <= em) {
      if (
        (m === sm && d >= sd) ||
        (m === em && d <= ed) ||
        (m > sm && m < em)
      ) return s;
    } else {
      // Wraps year (Dec → Jan)
      if (
        (m === sm && d >= sd) ||
        (m === em && d <= ed) ||
        m > sm ||
        m < em
      ) return s;
    }
  }
  return null;
}

// Days until the next peak (or null if none upcoming this year)
export function daysUntilPeak(date, shower) {
  const [pm, pd] = shower.peak;
  const year = date.getFullYear();
  let peak = new Date(year, pm - 1, pd);
  if (peak < date) peak = new Date(year + 1, pm - 1, pd);
  return Math.round((peak - date) / (1000 * 60 * 60 * 24));
}