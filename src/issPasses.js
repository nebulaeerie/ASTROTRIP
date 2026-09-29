import * as satellite from 'satellite.js';

const ISS_TLE_URL =
  'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE';

async function fetchIssTle() {
  const res = await fetch(ISS_TLE_URL);
  if (!res.ok) throw new Error('TLE fetch failed: ' + res.status);
  const text = await res.text();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) throw new Error('Unexpected TLE format');
  return { name: lines[0], line1: lines[1], line2: lines[2] };
}

function sunAltitude(date, lat, lon) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * (Math.PI / 180);
  const lambda = ((L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) % 360) * (Math.PI / 180);
  const eps = (23.439 * Math.PI) / 180;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const lst = ((280.46 + 360.9856474 * n) % 360) * (Math.PI / 180) + (lon * Math.PI) / 180;
  const H = lst - ra;
  const latRad = (lat * Math.PI) / 180;
  const alt = Math.asin(Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(H));
  return (alt * 180) / Math.PI;
}

export async function findIssPasses({ latitude, longitude, days = 3, minElevation = 10, maxPasses = 3 } = {}) {
  const tle = await fetchIssTle();
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

  const observerGd = {
    latitude: (latitude * Math.PI) / 180,
    longitude: (longitude * Math.PI) / 180,
    height: 0.05,
  };

  const start = Date.now();
  const end = start + days * 24 * 60 * 60 * 1000;
  const stepMs = 30000;

  const passes = [];
  let current = null;

  for (let t = start; t < end; t += stepMs) {
    const date = new Date(t);
    const posVel = satellite.propagate(satrec, date);
    if (!posVel || !posVel.position) continue;

    const gmst = satellite.gstime(date);
    const posEcf = satellite.eciToEcf(posVel.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, posEcf);
    const elevationDeg = (look.elevation * 180) / Math.PI;
    const azimuthDeg = (look.azimuth * 180) / Math.PI;

    const isDark = sunAltitude(date, latitude, longitude) < -6;

    const geo = satellite.eciToGeodetic(posVel.position, gmst);
    const satLat = satellite.degreesLat(geo.latitude);
    const satLon = satellite.degreesLong(geo.longitude);
    const satAltKm = geo.height;
    const satLit = sunAltitude(date, satLat, satLon) > -18 && satAltKm > 100;

    const visibleNow = elevationDeg >= minElevation && isDark && satLit;

    if (visibleNow) {
      if (!current) {
        current = {
          startUTC: date.getTime(),
          startAz: azimuthDeg,
          maxEl: elevationDeg,
          maxElTime: date.getTime(),
          maxAz: azimuthDeg,
          endUTC: date.getTime(),
          endAz: azimuthDeg,
        };
      } else {
        current.endUTC = date.getTime();
        current.endAz = azimuthDeg;
        if (elevationDeg > current.maxEl) {
          current.maxEl = elevationDeg;
          current.maxElTime = date.getTime();
          current.maxAz = azimuthDeg;
        }
      }
    } else if (current) {
      const durationSec = (current.endUTC - current.startUTC) / 1000;
      if (durationSec >= 60) passes.push(current);
      current = null;
      if (passes.length >= maxPasses) break;
    }
  }

  if (current && passes.length < maxPasses) {
    const durationSec = (current.endUTC - current.startUTC) / 1000;
    if (durationSec >= 60) passes.push(current);
  }

  return passes;
}

export function azimuthToCompass(az) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round((az % 360) / 45) % 8];
}

export function formatPassTime(ms) {
  return new Date(ms).toLocaleString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}