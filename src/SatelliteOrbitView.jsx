import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import * as satellite from 'satellite.js'

const EARTH_RADIUS_KM = 6371
// Scene units = km. Earth radius = 6371 units.

// ECF (X → lon 0 / eq, Y → lon 90E / eq, Z → north) to Three (X, Z, -Y)
function ecfToThree(v) {
  return new THREE.Vector3(v.x, v.z, -v.y)
}

export default function SatelliteOrbitView({ target, onBack }) {
  const mountRef = useRef(null)
  const flyToSatRef = useRef(null)
  const flyToEarthRef = useRef(null)
  const [info, setInfo] = useState(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !target) return
    console.log('ORBIT TARGET:', target)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x02030f)

    // ── Renderer: logarithmicDepthBuffer is the ONE thing that makes this work ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      logarithmicDepthBuffer: true,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.display = 'block'
    mount.appendChild(renderer.domElement)

    const camera = new THREE.PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.0001, 1e8
    )
    camera.position.set(0, 9000, 22000)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.minDistance = 0.0005   // 0.5 m from target
    controls.maxDistance = 80000
    controls.target.set(0, 0, 0)

    // ── Earth ──
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x2a4a99, roughness: 0.9 })
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS_KM, 96, 96),
      earthMat
    )
    scene.add(earth)

    new THREE.TextureLoader().load(
      '/2k_earth_daymap.jpg',
      (tex) => { earthMat.map = tex; earthMat.color.setHex(0xffffff); earthMat.needsUpdate = true },
      undefined,
      () => {}
    )

    // ── Propagate satellite ──
    let satrec
    try {
      satrec = satellite.twoline2satrec(target.line1, target.line2)
    } catch (e) {
      console.warn('TLE parse failed:', e)
      return
    }

    const now = new Date()
    const pv = satellite.propagate(satrec, now)
    if (!pv || !pv.position) {
      console.warn('Propagation failed for', target.name)
      return
    }
    const gmst = satellite.gstime(now)
    const satPos = ecfToThree(satellite.eciToEcf(pv.position, gmst))

    const velocityKmS = pv.velocity
      ? Math.sqrt(pv.velocity.x ** 2 + pv.velocity.y ** 2 + pv.velocity.z ** 2)
      : null

    setInfo({
      name: target.name,
      altitudeKm: satPos.length() - EARTH_RADIUS_KM,
      velocityKmS,
    })

    // ── Satellite mesh ──
    const satGroup = new THREE.Group()
    satGroup.position.copy(satPos)
    scene.add(satGroup)

    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5, metalness: 0.6 })
    )
    satGroup.add(placeholder)

    // ── Build the real procedural model for this satellite ──
    const sizesByNorad = { 25544: 0.109, 20580: 0.013, 48274: 0.055 }
    const targetSizeKm = sizesByNorad[target.norad] ?? 0.05

    satGroup.remove(placeholder)
    placeholder.geometry.dispose()
    placeholder.material.dispose()

    const realModel = buildSatelliteModel(target.norad)
    const bbox = new THREE.Box3().setFromObject(realModel)
    const modelSize = bbox.getSize(new THREE.Vector3())
    const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z) || 1
    realModel.scale.setScalar(targetSizeKm / maxDim)
    const modelCenter = bbox.getCenter(new THREE.Vector3())
    realModel.position.sub(modelCenter.multiplyScalar(targetSizeKm / maxDim))
    satGroup.add(realModel)

    // ── Orbit path (90 min in ECF, so it sits in the Earth-fixed frame) ──
    const orbitPts = []
    for (let t = 0; t <= 90; t += 0.5) {
      const time = new Date(now.getTime() + t * 60000)
      const p = satellite.propagate(satrec, time)
      if (!p || !p.position) continue
      const g = satellite.gstime(time)
      orbitPts.push(ecfToThree(satellite.eciToEcf(p.position, g)))
    }
    if (orbitPts.length > 1) {
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts)
      scene.add(new THREE.Line(
        orbitGeo,
        new THREE.LineBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.55 })
      ))
    }

    // ── Stars ──
    const N = 5000
    const sp = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 5e5 + Math.random() * 5e5
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      sp[i*3]   = r * Math.sin(ph) * Math.cos(th)
      sp[i*3+1] = r * Math.sin(ph) * Math.sin(th)
      sp[i*3+2] = r * Math.cos(ph)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 1.5, sizeAttenuation: false,
    })))

    // ── Light ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.2))
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5)
    sunLight.position.set(1e5, 3e4, 5e4)
    scene.add(sunLight)

    // ── Fly-to helpers ──
    function flyTo(destPos, destTarget, dur = 40) {
      const from = { pos: camera.position.clone(), tgt: controls.target.clone() }
      let t = 0
      const step = () => {
        t++
        const e = 1 - Math.pow(1 - t / dur, 3)
        camera.position.lerpVectors(from.pos, destPos, e)
        controls.target.lerpVectors(from.tgt, destTarget, e)
        if (t < dur) requestAnimationFrame(step)
      }
      step()
    }

    flyToSatRef.current = () => {
      const dir = new THREE.Vector3(1, 1, 1).normalize()
      flyTo(satPos.clone().add(dir.multiplyScalar(0.4)), satPos.clone())
    }
    flyToEarthRef.current = () => {
      flyTo(new THREE.Vector3(0, 9000, 22000), new THREE.Vector3(0, 0, 0))
    }

    // ── Animate ──
    let animId
    function animate() {
      animId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      controls.dispose()
      window.removeEventListener('resize', onResize)
      flyToSatRef.current = null
      flyToEarthRef.current = null
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [target])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, background: '#02030f' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      <button
        onClick={onBack}
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 40,
          background: 'rgba(4,6,26,0.85)',
          border: '1px solid rgba(100,140,255,0.3)',
          color: '#c8d8ff', borderRadius: 8, padding: '8px 14px',
          fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >← Back to Sky</button>

      {info && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, textAlign: 'center',
          background: 'rgba(4,6,26,0.85)',
          border: '1px solid rgba(100,140,255,0.3)',
          borderRadius: 12, padding: '10px 22px',
          color: '#e5e9f5', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '0.03em' }}>
            {info.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(180,200,240,0.75)', marginTop: 4, letterSpacing: '0.05em' }}>
            {info.altitudeKm.toFixed(1)} km altitude
            {info.velocityKmS != null && ` · ${info.velocityKmS.toFixed(2)} km/s`}
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
        zIndex: 40, display: 'flex', gap: 10,
      }}>
        <button
          onClick={() => flyToEarthRef.current?.()}
          style={{
            background: 'rgba(4,6,26,0.85)',
            border: '1px solid rgba(100,140,255,0.4)',
            color: '#c8d8ff', borderRadius: 8, padding: '10px 18px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: '0.06em',
          }}
        >EARTH VIEW</button>
        <button
          onClick={() => flyToSatRef.current?.()}
          style={{
            background: 'rgba(255,190,70,0.15)',
            border: '1px solid rgba(255,190,70,0.55)',
            color: '#ffd680', borderRadius: 8, padding: '10px 18px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            letterSpacing: '0.06em',
          }}
        >FLY TO SATELLITE</button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Procedural satellite models — no external files, no GLB, no Draco
// ────────────────────────────────────────────────────────────────────────────

function buildSatelliteModel(norad) {
  if (norad === 25544) return buildISS()
  if (norad === 20580) return buildHubble()
  if (norad === 48274) return buildTiangong()
  return buildGeneric()
}

const MATS = {
  white:  () => new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.55, metalness: 0.35 }),
  gold:   () => new THREE.MeshStandardMaterial({ color: 0xc4a24d, roughness: 0.4,  metalness: 0.7 }),
  blue:   () => new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.35, metalness: 0.15, emissive: 0x0a1a4f, emissiveIntensity: 0.25 }),
  dark:   () => new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85, metalness: 0.2 }),
  silver: () => new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3,  metalness: 0.75 }),
}

function buildISS() {
  const g = new THREE.Group()
  const W = MATS.white(), G = MATS.gold(), B = MATS.blue(), D = MATS.dark()

  // Main integrated truss — 100 m long X-axis beam
  g.add(new THREE.Mesh(new THREE.BoxGeometry(100, 4, 4), W))

  // Truss ribs
  for (let x = -45; x <= 45; x += 10) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 5), D)
    rib.position.set(x, 0, 0)
    g.add(rib)
  }

  // Solar array wings — 4 per side
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(34, 0.25, 12), B)
      wing.position.set(side * (36 + i * 18), 0, 0)
      g.add(wing)
      const mast = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 0.5), D)
      mast.position.set(side * (32 + i * 18), 0, 0)
      g.add(mast)
    }
  }

  // Pressurized modules — row of cylinders along X
  const mods = [12, 14, 18, 12, 10]
  let mx = -20
  for (const len of mods) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, len, 20), W)
    cyl.rotation.z = Math.PI / 2
    cyl.position.x = mx + len / 2
    g.add(cyl)
    for (let end = -1; end <= 1; end += 2) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.3, 20), G)
      cap.rotation.z = Math.PI / 2
      cap.position.x = mx + len / 2 + end * len / 2
      g.add(cap)
    }
    mx += len
  }

  // Radiators
  for (let side = -1; side <= 1; side += 2) {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(2, 18, 10), W)
    rad.position.set(-4, side * 10, 0)
    g.add(rad)
  }

  // Gold equipment block at truss center
  g.add(new THREE.Mesh(new THREE.BoxGeometry(6, 5, 5), G))

  return g
}

function buildHubble() {
  const g = new THREE.Group()
  const S = MATS.silver(), G = MATS.gold(), B = MATS.blue()

  // Main tube (13 m long, 4.3 m diameter)
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 13, 32), S)
  tube.rotation.z = Math.PI / 2
  g.add(tube)

  // Aperture door at one end
  const door = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.3, 32), G)
  door.rotation.z = Math.PI / 2
  door.position.x = -6.65
  g.add(door)

  // Two solar panels (perpendicular to tube)
  for (let side = -1; side <= 1; side += 2) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 12, 5), B)
    panel.position.set(0, side * 8, 0)
    g.add(panel)
  }

  // Antenna dish
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    S
  )
  dish.rotation.x = Math.PI
  dish.position.set(3, 3, 0)
  g.add(dish)

  return g
}

function buildTiangong() {
  const g = new THREE.Group()
  const W = MATS.white(), G = MATS.gold(), B = MATS.blue()

  // Core module (16 m along X)
  const core = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 16, 24), W)
  core.rotation.z = Math.PI / 2
  g.add(core)

  // Two lab modules perpendicular to core
  for (let side = -1; side <= 1; side += 2) {
    const lab = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 14, 24), W)
    lab.rotation.x = Math.PI / 2
    lab.position.set(0, side * 7, 0)
    g.add(lab)

    // Solar wings per lab
    for (let x = -1; x <= 1; x += 2) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(18, 0.2, 8), B)
      wing.position.set(x * 10, side * 8, 0)
      g.add(wing)
    }
  }

  // Docking hub
  g.add(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), G))

  return g
}

function buildGeneric() {
  const g = new THREE.Group()
  const S = MATS.silver(), B = MATS.blue(), G = MATS.gold()

  // Main bus
  g.add(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 6), S))

  // Solar panels
  for (let side = -1; side <= 1; side += 2) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(8, 0.15, 4), B)
    panel.position.set(side * 6, 0, 0)
    g.add(panel)
  }

  // Antenna
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    G
  ))

  return g
}