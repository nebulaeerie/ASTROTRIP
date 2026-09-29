// A card that shows the next few ISS passes with an arc diagram
// for the first one, and plain-language descriptions.
//
// Designed to fit alongside the other Tonight's Sky cards.

const LEDES = [
  "A football-field-sized laboratory orbiting at 27,600 km/h, about 7.7 km every second, with seven people aboard. When it passes overhead, it's the third-brightest object in the night sky, after the Moon and Venus.",
  "The largest structure humans have ever built in space, assembled module by module over more than a decade. It's been continuously occupied since November 2000.",
  "Ninety minutes per orbit, sixteen sunrises a day. The crew aboard sees more dawns in a single day than most of us see in a month.",
  "A 420-tonne spacecraft the size of a football field, powered by sunlight and kept aloft by orbital velocity alone. It has been falling around Earth since 1998.",
  "Twenty-eight thousand kilometres per hour, four hundred kilometres up, seven humans inside. The station is a working laboratory, a home, and a testbed for the technologies that will take us to Mars.",
  "The most expensive object ever built, roughly 150 billion dollars across its lifetime. It has hosted more than 270 visitors from 21 countries.",
  "The station is bright enough to cast a faint shadow on a dark night. Seen from the ground, it crosses the sky in a few minutes, silent and steady, like a slow-moving star.",
];

function pickLede() {
  const last = Number(sessionStorage.getItem('issLedeIndex') ?? -1);
  let next = Math.floor(Math.random() * LEDES.length);
  if (next === last) next = (next + 1) % LEDES.length;
  sessionStorage.setItem('issLedeIndex', String(next));
  return LEDES[next];
}

function compassToAzimuth(compass) {
  const map = {
    N: 0, NE: 45, E: 90, SE: 135,
    S: 180, SW: 225, W: 270, NW: 315,
  };
  return map[compass] ?? 0;
}

// Convert an azimuth to a readable compass direction.
function azimuthToCompass(az) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round((((az % 360) + 360) % 360) / 45) % 8];
}

// Plain-language altitude description.
function describeAltitude(deg) {
  if (deg < 15) return 'low on the horizon';
  if (deg < 30) return 'a little above the horizon';
  if (deg < 50) return 'about a third of the way up';
  if (deg < 65) return 'about halfway up';
  if (deg < 80) return 'high in the sky';
  return 'almost directly overhead';
}

function formatDuration(minutes) {
  if (minutes < 1) return 'less than a minute';
  if (minutes === 1) return '1 minute';
  return `${minutes} minutes`;
}

function formatPassDate(ms) {
  const d = new Date(ms);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (sameDay(d, now)) return `Tonight · ${time}`;
  if (sameDay(d, tomorrow)) return `Tomorrow · ${time}`;

  return (
    d.toLocaleDateString([], { weekday: 'long' }) + ' · ' + time
  );
}

// Draw the pass arc. Uses rise/peak/set azimuths and peak elevation.
// x-axis: azimuth 0-360 mapped left→right
// y-axis: elevation 0-90, drawn as a dome
function PassArc({ startAz, maxAz, maxEl, endAz }) {
  const width = 260;
  const height = 100;
  const padX = 20;
  const padY = 12;

  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  // Map azimuth to x. Compass "up" at the center for a natural look:
  // we shift so that N=0 is at left, going clockwise.
  const azToX = (az) => padX + (((az % 360) + 360) % 360) / 360 * innerW;
  const elToY = (el) => padY + innerH - (Math.max(0, Math.min(90, el)) / 90) * innerH;

  const x1 = azToX(startAz);
  const x2 = azToX(maxAz);
  const x3 = azToX(endAz);
  const y1 = elToY(0);
  const y3 = elToY(0);
  const y2 = elToY(maxEl);

  // Quadratic-ish arc: rise → peak → set
  const pathD = `M ${x1} ${y1} Q ${x2} ${y2 - 20} ${x3} ${y3}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-hidden="true"
    >
      {/* Horizon line */}
      <line
        x1={padX}
        y1={elToY(0)}
        x2={width - padX}
        y2={elToY(0)}
        stroke="rgba(150,170,220,0.25)"
        strokeWidth="1"
      />

      {/* Arc path */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(140,180,255,0.85)"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />

      {/* Rise dot */}
      <circle cx={x1} cy={y1} r="3" fill="#8cffb4" />

      {/* Peak dot */}
      <circle cx={x2} cy={y2} r="3.5" fill="#ffffff" />

      {/* Set dot */}
      <circle cx={x3} cy={y3} r="3" fill="#ff9d8c" />

      {/* Peak direction label */}
      <text
        x={x2}
        y={y2 - 8}
        fill="#c2cae0"
        fontSize="9"
        textAnchor="middle"
      >
        {azimuthToCompass(maxAz)} · {maxEl.toFixed(0)}°
      </text>

      {/* Rise label */}
      <text
        x={x1}
        y={y1 + 12}
        fill="#8cffb4"
        fontSize="9"
        textAnchor="middle"
      >
        {azimuthToCompass(startAz)}
      </text>

      {/* Set label */}
      <text
        x={x3}
        y={y3 + 12}
        fill="#ff9d8c"
        fontSize="9"
        textAnchor="middle"
      >
        {azimuthToCompass(endAz)}
      </text>
    </svg>
  );
}

export default function IssPassCard({ passes, locationName }) {
  if (passes === null) {
    return (
      <section className="sky-card" style={styles.card}>
        <h2 style={styles.cardTitle}>International Space Station</h2>
        <p style={styles.sub}>Checking orbit…</p>
      </section>
    );
  }

  if (passes.length === 0) {
    return (
      <section className="sky-card" style={styles.card}>
        <h2 style={styles.cardTitle}>International Space Station</h2>
        <p style={styles.sub}>
          No bright passes over {locationName} in the next 3 days. The
          station's orbit is tilted 51.6° — passes come in clusters, then
          none for days. Check back in a week.
        </p>
      </section>
    );
  }

  const first = passes[0];
  const rest = passes.slice(1, 3);
  const firstDurationMin = Math.round((first.endUTC - first.startUTC) / 60000);

  return (
    <section className="sky-card" style={styles.card}>
      <h2 style={styles.cardTitle}>International Space Station</h2>

      <p style={styles.lede}>{pickLede()}</p>

      <div style={styles.firstPass}>
        <div style={styles.firstPassHeader}>
          <span style={styles.firstPassTime}>{formatPassDate(first.startUTC)}</span>
          <span style={styles.firstPassDuration}>
            {formatDuration(firstDurationMin)} across the sky
          </span>
        </div>

        <PassArc
          startAz={first.startAz}
          maxAz={first.maxAz}
          maxEl={first.maxEl}
          endAz={first.endAz}
        />

        <p style={styles.firstPassText}>
          Rises in the {azimuthToCompass(first.startAz)}, climbs to{' '}
          {describeAltitude(first.maxEl)}, then sets in the{' '}
          {azimuthToCompass(first.endAz)}. It'll look like a steady,
          silent plane — much brighter, and moving faster than anything
          else in the sky.
        </p>
      </div>

      {rest.length > 0 && (
        <div style={styles.nextPasses}>
          <div style={styles.nextLabel}>Also visible</div>
          {rest.map((p, i) => {
            const mins = Math.round((p.endUTC - p.startUTC) / 60000);
            return (
              <div key={i} style={styles.nextPassRow}>
                <span style={styles.nextPassTime}>{formatPassDate(p.startUTC)}</span>
                <span style={styles.nextPassMeta}>
                  {formatDuration(mins)} · {azimuthToCompass(p.startAz)} →{' '}
                  {azimuthToCompass(p.endAz)} · peaks {p.maxEl.toFixed(0)}°
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p style={styles.footnote}>
        The station circles Earth 16 times a day, but you only see it when
        it's still in sunlight while you're in darkness. Usually the hour
        after sunset or before sunrise.
      </p>
    </section>
  );
}

const styles = {
  card: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '20px 22px',
    marginBottom: 16,
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)',
    transition: 'border-color 200ms ease, transform 200ms ease',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#7f8bb0',
    marginBottom: 16,
  },
  lede: {
    fontSize: 14,
    color: '#a8b2cf',
    lineHeight: 1.6,
    marginBottom: 18,
  },
  firstPass: {
    background: 'rgba(0,0,0,0.18)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: '16px 18px',
    marginBottom: 16,
  },
  firstPassHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  firstPassTime: {
    fontSize: 16,
    fontWeight: 600,
    color: '#f2f4ff',
  },
  firstPassDuration: {
    fontSize: 12,
    color: '#7f8bb0',
  },
  firstPassText: {
    fontSize: 13.5,
    color: '#b8c2de',
    lineHeight: 1.6,
    marginTop: 8,
  },
  nextPasses: {
    marginBottom: 14,
  },
  nextLabel: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#6f7a9a',
    marginBottom: 8,
  },
  nextPassRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    padding: '6px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    flexWrap: 'wrap',
  },
  nextPassTime: {
    fontSize: 13.5,
    color: '#d8e0f5',
    fontWeight: 500,
  },
  nextPassMeta: {
    fontSize: 12.5,
    color: '#8b95b8',
  },
  footnote: {
    fontSize: 12,
    color: '#7f8bb0',
    lineHeight: 1.55,
    fontStyle: 'italic',
    marginTop: 8,
  },
  sub: {
    fontSize: 14,
    color: '#a8b2cf',
    lineHeight: 1.6,
  },
};