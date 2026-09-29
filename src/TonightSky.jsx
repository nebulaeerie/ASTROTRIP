import { useEffect, useMemo, useState } from 'react';
import * as Astronomy from 'astronomy-engine';
import { getActiveShower, daysUntilPeak, METEOR_SHOWERS } from './meteorShowers';
import { supabase } from './supabaseClient';
import { CITIES } from './cities';
import { findIssPasses } from './issPasses';
import IssPassCard from './IssPassCard';

const DEFAULT_LOCATION = {
  name: 'Los Angeles',
  latitude: 34.0522,
  longitude: -118.2437,
};

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          name: 'Your location',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => reject(err),
      { timeout: 8000 }
    );
  });
}

const PLANETS = [
  { name: 'Mercury', body: Astronomy.Body.Mercury },
  { name: 'Venus',   body: Astronomy.Body.Venus },
  { name: 'Mars',    body: Astronomy.Body.Mars },
  { name: 'Jupiter', body: Astronomy.Body.Jupiter },
  { name: 'Saturn',  body: Astronomy.Body.Saturn },
];

const PLANET_COLORS = {
  Mercury: '#b8b0a0',
  Venus:   '#e8d7a8',
  Mars:    '#d97a5a',
  Jupiter: '#d8b888',
  Saturn:  '#e0c890',
};

function planetColor(name) {
  return PLANET_COLORS[name] || '#8b95b8';
}

function getNightWindow(date, location) {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const noon = new Date(date);
  noon.setHours(12, 0, 0, 0);

  const sunset = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, noon, 1);
  const sunrise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, sunset ? sunset.date : noon, 1);

  if (!sunset || !sunrise) return null;

  const start = new Date(sunset.date.getTime() + 60 * 60 * 1000);
  const end   = new Date(sunrise.date.getTime() - 60 * 60 * 1000);
  return { start, end };
}

function planetVisibility(planet, location, nightWindow) {
  if (!nightWindow) return { visible: false };
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const stepMs = 30 * 60 * 1000;
  let best = null;

  for (let t = nightWindow.start.getTime(); t <= nightWindow.end.getTime(); t += stepMs) {
    const time = new Date(t);
    const eq = Astronomy.Equator(planet.body, time, observer, true, true);
    const hor = Astronomy.Horizon(time, observer, eq.ra, eq.dec, 'normal');
    if (hor.altitude > 0) {
      if (!best || hor.altitude > best.altitude) {
        best = { visible: true, altitude: hor.altitude, azimuth: hor.azimuth, time };
      }
    }
  }
  return best || { visible: false };
}

function getMoonInfo(date) {
  const phaseAngle = Astronomy.MoonPhase(date);
  const phaseName = (() => {
    const a = phaseAngle;
    if (a < 22.5 || a >= 337.5) return 'New Moon';
    if (a < 67.5)  return 'Waxing Crescent';
    if (a < 112.5) return 'First Quarter';
    if (a < 157.5) return 'Waxing Gibbous';
    if (a < 202.5) return 'Full Moon';
    if (a < 247.5) return 'Waning Gibbous';
    if (a < 292.5) return 'Last Quarter';
    return 'Waning Crescent';
  })();
  const rad = (phaseAngle * Math.PI) / 180;
  const illumination = Math.round(((1 - Math.cos(rad)) / 2) * 100);
  return { phaseName, phaseAngle, illumination };
}

function azimuthToCompass(az) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(az / 45) % 8];
}

export default function TonightSky({ onBack }) {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationStatus, setLocationStatus] = useState('default');
  const [now, setNow] = useState(new Date());
  const [skyNote, setSkyNote] = useState(null);
  const [cityQuery, setCityQuery] = useState('');
  const [issPasses, setIssPasses] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('type', 'skynote')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (cancelled || error || !data || data.length === 0) return;
      setSkyNote(data[0]);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIssPasses(null);
    findIssPasses({ latitude: location.latitude, longitude: location.longitude })
      .then((p) => { if (!cancelled) setIssPasses(p); })
      .catch(() => { if (!cancelled) setIssPasses([]); });
    return () => { cancelled = true; };
  }, [location.latitude, location.longitude]);

  const handleUseMyLocation = () => {
    getBrowserLocation()
      .then((loc) => { setLocation(loc); setLocationStatus('granted'); })
      .catch(() => setLocationStatus('denied'));
  };

  const handlePickCity = (city) => {
    setLocation({ name: city.name, latitude: city.latitude, longitude: city.longitude });
    setLocationStatus('manual');
    setCityQuery('');
  };

  const cityMatches = cityQuery.trim().length < 1
    ? []
    : CITIES
        .filter((c) => {
          const q = cityQuery.toLowerCase();
          return c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);
        })
        .slice(0, 6);

  const sky = useMemo(() => {
    const nightWindow = getNightWindow(now, location);
    const moon = getMoonInfo(now);
    const planets = PLANETS.map((p) => ({
      name: p.name,
      ...planetVisibility(p, location, nightWindow),
    })).filter((p) => p.visible);

    const activeShower = getActiveShower(now);
    const nextShower = activeShower
      ? null
      : METEOR_SHOWERS
          .map((s) => ({ shower: s, days: daysUntilPeak(now, s) }))
          .sort((a, b) => a.days - b.days)[0];

    return { nightWindow, moon, planets, activeShower, nextShower };
  }, [now, location]);

  return (
    <div style={styles.wrap}>
      <button
        onClick={onBack}
        style={styles.backBtn}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.color = '#c2cae0';
        }}
      >
        ← Back
      </button>

      <header style={styles.header}>
        <h1 style={styles.title}>Tonight's Sky</h1>
        <div style={styles.locationRow}>
          <span style={styles.locationName}>{location.name}</span>
          <span style={styles.coords}>
            {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
          </span>
          {locationStatus !== 'granted' && (
            <button onClick={handleUseMyLocation} style={styles.locBtn}>
              Use my location
            </button>
          )}
          <div style={styles.citySearch}>
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="Search city…"
              style={styles.cityInput}
            />
            {cityMatches.length > 0 && (
              <ul style={styles.cityDropdown}>
                {cityMatches.map((c) => (
                  <li
                    key={`${c.name}-${c.country}`}
                    style={styles.cityItem}
                    onClick={() => handlePickCity(c)}
                  >
                    <span>{c.name}</span>
                    <span style={styles.cityCountry}>{c.country}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </header>

      <section className="sky-card" style={styles.card}>
        <h2 style={styles.cardTitle}>Moon</h2>
        <div style={styles.moonRow}>
          <MoonGlyph angle={sky.moon.phaseAngle} />
          <div>
            <div style={styles.big}>{sky.moon.phaseName}</div>
            <div style={styles.sub}>{sky.moon.illumination}% illuminated</div>
          </div>
        </div>
      </section>

      <section className="sky-card" style={styles.card}>
        <h2 style={styles.cardTitle}>Visible Planets Tonight</h2>
        {sky.planets.length === 0 ? (
          <p style={styles.sub}>
            No naked-eye planets above the horizon during tonight's dark window.
          </p>
        ) : (
          <ul style={styles.planetList}>
            {sky.planets.map((p) => (
              <li key={p.name} style={styles.planetItem}>
                <span style={styles.planetName}>
                  <span
                    style={{
                      ...styles.planetDot,
                      background: planetColor(p.name),
                      color: planetColor(p.name),
                    }}
                  />
                  {p.name}
                </span>
                <span style={styles.planetMeta}>
                  max altitude {p.altitude.toFixed(0)}° ·{' '}
                  {azimuthToCompass(p.azimuth)} · around{' '}
                  {p.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sky-card" style={styles.card}>
        <h2 style={styles.cardTitle}>Meteor Showers</h2>
        {sky.activeShower ? (
          <>
            <div style={styles.big}>{sky.activeShower.name}</div>
            <p style={styles.sub}>
              Active now · peaks around{' '}
              {new Date(now.getFullYear(), sky.activeShower.peak[0] - 1, sky.activeShower.peak[1])
                .toLocaleDateString([], { month: 'long', day: 'numeric' })}{' '}
              · ~{sky.activeShower.zhr}/hr at peak
            </p>
            <p style={styles.sub}>Parent body: {sky.activeShower.parent}</p>
          </>
        ) : sky.nextShower ? (
          <>
            <div style={styles.big}>{sky.nextShower.shower.name}</div>
            <p style={styles.sub}>
              Next up · peaks{' '}
              {new Date(now.getFullYear(), sky.nextShower.shower.peak[0] - 1, sky.nextShower.shower.peak[1])
                .toLocaleDateString([], { month: 'long', day: 'numeric' })}{' '}
              ({sky.nextShower.days} days) · ~{sky.nextShower.shower.zhr}/hr
            </p>
          </>
        ) : (
          <p style={styles.sub}>No major showers active right now.</p>
        )}
      </section>

      {sky.nightWindow && (
        <section className="sky-card" style={styles.card}>
          <h2 style={styles.cardTitle}>Dark Window</h2>
          <p style={styles.sub}>
            Best viewing roughly{' '}
            {sky.nightWindow.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
            {sky.nightWindow.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} local time.
          </p>
        </section>
      )}

      <IssPassCard passes={issPasses} locationName={location.name} />

      {skyNote && (
        <section className="sky-card" style={styles.card}>
          <h2 style={styles.cardTitle}>Sky Note</h2>
          {skyNote.translations?.en?.title && (
            <div style={styles.big}>{skyNote.translations.en.title}</div>
          )}
          {skyNote.created_at && (
            <div style={styles.noteDate}>
              {new Date(skyNote.created_at).toLocaleDateString([], {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </div>
          )}
          {skyNote.cover_image && (
            <img src={skyNote.cover_image} alt="" style={styles.noteImage} />
          )}
          {skyNote.translations?.en?.body && (
            <div
              className="noteBody"
              style={styles.noteBody}
              dangerouslySetInnerHTML={{
                __html: skyNote.translations.en.body
                  .replace(/\n{2,}/g, '</p><p>')
                  .replace(/\n/g, '<br/>')
                  .replace(/^/, '<p>')
                  .replace(/$/, '</p>'),
              }}
            />
          )}
        </section>
      )}
    </div>
  );
}

function MoonGlyph({ angle }) {
  const r = 22;
  const rad = (angle * Math.PI) / 180;
  const shift = Math.cos(rad) * r;
  const isWaxing = angle < 180;
  return (
    <svg
      width={64}
      height={64}
      viewBox="-32 -32 64 64"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(245,243,231,0.35))' }}
    >
      <defs>
        <clipPath id="moonClip"><circle cx="0" cy="0" r={r} /></clipPath>
      </defs>
      <circle cx="0" cy="0" r={r} fill="#1b1f3a" />
      <g clipPath="url(#moonClip)">
        <circle cx={isWaxing ? -shift : shift} cy="0" r={r} fill="#f5f3e7" />
      </g>
      <circle cx="0" cy="0" r={r} fill="none" stroke="#3a3f5a" strokeWidth="1" />
    </svg>
  );
}

const styles = {
  wrap: { maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px', color: '#fff' },
  backBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#c2cae0',
    borderRadius: 8,
    padding: '7px 14px',
    cursor: 'pointer',
    marginBottom: 20,
    fontSize: 13,
    fontWeight: 500,
    transition: 'background 150ms ease, color 150ms ease',
  },
  header: { marginBottom: 24 },
  title: {
    fontSize: 34,
    fontWeight: 700,
    letterSpacing: -0.6,
    marginBottom: 10,
    color: '#ffffff',
    textShadow: '0 0 24px rgba(120,150,255,0.35)',
  },
  locationRow: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', fontSize: 14, color: '#a8b2cf', marginTop: 4 },
  locationName: { fontSize: 15, color: '#e5e9f5', fontWeight: 500 },
  coords: { fontSize: 12, color: '#6f7a9a' },
  locBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#9aa4c7',
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 12,
    cursor: 'pointer',
  },
  citySearch: { position: 'relative', display: 'inline-block' },
  cityInput: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 13,
    width: 160,
    outline: 'none',
  },
  cityDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    background: '#0b1020',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    listStyle: 'none',
    padding: 4,
    margin: 0,
    minWidth: 200,
    zIndex: 20,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  cityItem: {
    padding: '6px 10px',
    cursor: 'pointer',
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    fontSize: 13,
    color: '#e5e9f5',
  },
  cityCountry: { color: '#7f8bb0', fontSize: 12 },
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
  moonRow: { display: 'flex', gap: 20, alignItems: 'center' },
  big: { fontSize: 22, fontWeight: 600, letterSpacing: -0.2, color: '#f2f4ff' },
  sub: { fontSize: 14, color: '#a8b2cf', lineHeight: 1.6 },
  planetList: { listStyle: 'none', padding: 0, margin: 0 },
  planetItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    gap: 12,
    flexWrap: 'wrap',
  },
  planetName: { fontWeight: 500 },
  planetDot: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    marginRight: 8,
    verticalAlign: 'middle',
    boxShadow: '0 0 6px currentColor',
  },
  planetMeta: { fontSize: 13, color: '#9aa4c7' },
  passList: { listStyle: 'none', padding: 0, margin: 0 },
  passItem: {
    padding: '10px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  passTime: { fontSize: 15, fontWeight: 500, color: '#f2f4ff', marginBottom: 2 },
  passMeta: { fontSize: 13, color: '#9aa4c7' },
  passNote: {
    paddingTop: 12,
    fontSize: 12,
    color: '#7f8bb0',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  noteBody: { fontSize: 15, color: '#c2cae0', lineHeight: 1.7, marginTop: 10 },
  noteDate: { fontSize: 12, color: '#5f6a8a', marginTop: 4, marginBottom: 4 },
  noteImage: { width: '100%', borderRadius: 8, marginTop: 12, marginBottom: 4, display: 'block' },
};