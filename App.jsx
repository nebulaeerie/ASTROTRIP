import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import PostsPage from './PostsPage'
import GamesMenu from './GamesMenu'

const BODIES = [
  { name: 'Sun',     texture: '/2k_sun.jpg',           fallback: 0xffdd00, size: 16,  distance: 0,   speed: 0,       emissive: true,  glowColor: '#ffaa00', glowSize: 1.35, info: 'The Sun contains 99.86% of the Solar System mass. Core temperature reaches 15 million degrees.', stats: { Type: 'G-type Star', Diameter: '1,392,700 km', 'Surface Temp': '5,500 C', Age: '4.6 billion yrs' } },
  { name: 'Mercury', texture: '/2k_mercury.jpg',        fallback: 0x909090, size: 2,   distance: 28,  speed: 0.0014,                                           info: 'Mercury has no atmosphere. Temperatures swing from -180C at night to 430C by day.',              stats: { Type: 'Terrestrial',  Diameter: '4,879 km',     Distance: '57.9M km',    Moons: '0' } },
  { name: 'Venus',   texture: '/2k_venus_surface.jpg',  fallback: 0xddaa44, size: 3.5, distance: 40,  speed: 0.001,                glowColor: '#ffcc44', glowSize: 1.18, info: 'Venus is the hottest planet at 465C due to a runaway greenhouse effect.',                         stats: { Type: 'Terrestrial',  Diameter: '12,104 km',    Distance: '108.2M km',   Moons: '0' } },
  { name: 'Earth',   texture: '/2k_earth_daymap.jpg',   fallback: 0x2277ff, size: 4,   distance: 55,  speed: 0.0008,               glowColor: '#4488ff', glowSize: 1.15, info: 'Earth is the only world known to harbor life, with liquid oceans and a magnetic field.',          stats: { Type: 'Terrestrial',  Diameter: '12,742 km',    Distance: '149.6M km',   Moons: '1' } },
  { name: 'Mars',    texture: '/2k_mars.jpg',            fallback: 0xcc4400, size: 3,   distance: 72,  speed: 0.0006,               glowColor: '#ff6622', glowSize: 1.12, info: 'Mars hosts Olympus Mons, the Solar System tallest volcano at 22 km high.',                        stats: { Type: 'Terrestrial',  Diameter: '6,779 km',     Distance: '227.9M km',   Moons: '2' } },
  { name: 'Jupiter', texture: '/2k_jupiter.jpg',         fallback: 0xcc9966, size: 12,  distance: 105, speed: 0.00035,                                          info: 'Jupiter Great Red Spot is a storm larger than Earth, raging for over 350 years.',                 stats: { Type: 'Gas Giant',    Diameter: '139,820 km',   Distance: '778.5M km',   Moons: '95' } },
  { name: 'Saturn',  texture: '/2k_saturn.jpg',          fallback: 0xddcc88, size: 10,  distance: 140, speed: 0.00022, hasRing: true,                           info: 'Saturn rings span 282,000 km but are only about 10 metres thick.',                                  stats: { Type: 'Gas Giant',    Diameter: '116,460 km',   Distance: '1.43B km',    Moons: '146' } },
  { name: 'Uranus',  texture: '/2k_uranus.jpg',          fallback: 0x88dddd, size: 7,   distance: 172, speed: 0.00013,              glowColor: '#88ffee', glowSize: 1.1,  info: 'Uranus rotates on its side with a 98 degree axial tilt from an ancient collision.',              stats: { Type: 'Ice Giant',    Diameter: '50,724 km',    Distance: '2.87B km',    Moons: '28' } },
  { name: 'Neptune', texture: '/2k_neptune.jpg',         fallback: 0x3355ff, size: 6.5, distance: 200, speed: 0.00008,              glowColor: '#3366ff', glowSize: 1.1,  info: 'Neptune has the fastest winds in the Solar System at up to 2,100 km per hour.',                  stats: { Type: 'Ice Giant',    Diameter: '49,244 km',    Distance: '4.50B km',    Moons: '16' } },
]

const MOON_INFO = {
  name: 'Moon',
  info: "Earth Moon stabilizes our axial tilt and drives the tides. Humans last walked on it in 1972.",
  stats: { Type: 'Natural Satellite', Diameter: '3,474 km', Distance: '384,400 km', Temp: '-173 to 127 C' },
}


const GALILEAN = [
  { name: 'Io',       color: 0xffcc44, size: 0.9,  orbitR: 17, speed: 0.00015 },
  { name: 'Europa',   color: 0xbbddff, size: 0.75, orbitR: 21, speed: 0.0001  },
  { name: 'Ganymede', color: 0xaa9988, size: 1.1,  orbitR: 26, speed: 0.00006 },
  { name: 'Callisto', color: 0x887766, size: 1.0,  orbitR: 32, speed: 0.00003 },
]
 function makeControls(camera, el) {
  let sph = { theta: Math.PI / 4, phi: Math.PI / 2.8, r: 320 }
  const target = new THREE.Vector3()
  let down = false, dragged = false, lx = 0, ly = 0, ptDist = null

  function update() {
    camera.position.set(
      target.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
      target.y + sph.r * Math.cos(sph.phi),
      target.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
    )
    camera.lookAt(target)
  }
  update()

  function onPD(e) { down = true; dragged = false; lx = e.clientX; ly = e.clientY }
  function onPM(e) {
    if (!down) return
    const dx = e.clientX - lx, dy = e.clientY - ly
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragged = true
    sph.theta -= dx * 0.004
    sph.phi = Math.max(0.08, Math.min(Math.PI - 0.08, sph.phi + dy * 0.004))
    lx = e.clientX; ly = e.clientY
    update()
  }
  function onPU() { down = false }
  function onW(e) { sph.r = Math.max(28, Math.min(950, sph.r + e.deltaY * 0.12)); update() }
  function onTS(e) {
    if (e.touches.length === 1) { lx = e.touches[0].clientX; ly = e.touches[0].clientY; dragged = false }
    if (e.touches.length === 2) ptDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
  }
  function onTM(e) {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - lx, dy = e.touches[0].clientY - ly
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragged = true
      sph.theta -= dx * 0.004
      sph.phi = Math.max(0.08, Math.min(Math.PI - 0.08, sph.phi + dy * 0.004))
      lx = e.touches[0].clientX; ly = e.touches[0].clientY
      update()
    }
    if (e.touches.length === 2 && ptDist !== null) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY)
      sph.r = Math.max(28, Math.min(950, sph.r - (d - ptDist) * 0.5))
      ptDist = d; update()
    }
  }
  function onTE() { ptDist = null }

  el.addEventListener('pointerdown', onPD)
  window.addEventListener('pointermove', onPM)
  window.addEventListener('pointerup', onPU)
  el.addEventListener('wheel', onW, { passive: true })
  el.addEventListener('touchstart', onTS, { passive: true })
  el.addEventListener('touchmove', onTM, { passive: true })
  el.addEventListener('touchend', onTE)

  function animateTo(toTarget, toR) {
    const from = { ...sph }, fromT = target.clone()
    const off = camera.position.clone().sub(toTarget)
    let toTheta = Math.atan2(off.x, off.z)
    let toPhi = Math.max(0.3, Math.min(Math.PI - 0.3, Math.atan2(Math.sqrt(off.x**2 + off.z**2), off.y)))
    let dTheta = toTheta - from.theta
    if (dTheta > Math.PI) dTheta -= 2 * Math.PI
    if (dTheta < -Math.PI) dTheta += 2 * Math.PI
    const t0 = performance.now(), dur = 1100
    function tick() {
      const t = Math.min((performance.now() - t0) / dur, 1)
      const e = 1 - Math.pow(1 - t, 4)
      sph.r = from.r + (toR - from.r) * e
      sph.theta = from.theta + dTheta * e
      sph.phi = from.phi + (toPhi - from.phi) * e
      target.lerpVectors(fromT, toTarget, e)
      update()
      if (t < 1) requestAnimationFrame(tick)
    }
    tick()
  }

  function reset() { animateTo(new THREE.Vector3(0, 0, 0), 300) }

  function dispose() {
    el.removeEventListener('pointerdown', onPD)
    window.removeEventListener('pointermove', onPM)
    window.removeEventListener('pointerup', onPU)
    el.removeEventListener('wheel', onW)
    el.removeEventListener('touchstart', onTS)
    el.removeEventListener('touchmove', onTM)
    el.removeEventListener('touchend', onTE)
  }

  return { isDragged: () => dragged, animateTo, reset, dispose }
}

function makeGlow(color, size) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, color + 'cc')
  g.addColorStop(0.4, color + '44')
  g.addColorStop(1, color + '00')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const s = new THREE.Sprite(mat)
  s.scale.setScalar(size)
  return s
}

function buildScene(scene) {
  // Nebula background
  const nc = document.createElement('canvas')
  nc.width = nc.height = 512
  const nctx = nc.getContext('2d')
  nctx.fillStyle = '#02030f'
  nctx.fillRect(0, 0, 512, 512)
  ;[
    { x: 120, y: 100, r: 180, c: 'rgba(40,20,120,0.18)' },
    { x: 380, y: 300, r: 200, c: 'rgba(20,60,100,0.15)' },
    { x: 260, y: 400, r: 160, c: 'rgba(80,20,100,0.12)' },
    { x: 60,  y: 360, r: 140, c: 'rgba(10,40,120,0.1)'  },
    { x: 440, y: 80,  r: 120, c: 'rgba(60,10,80,0.1)'   },
  ].forEach(({ x, y, r, c }) => {
    const g = nctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)')
    nctx.fillStyle = g; nctx.fillRect(0, 0, 512, 512)
  })
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(nc), side: THREE.BackSide })))

  // Stars
  const N = 22000
  const sp = new Float32Array(N * 3), sc = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const r = 800 + Math.random() * 1600, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1)
    sp[i*3] = r*Math.sin(ph)*Math.cos(th); sp[i*3+1] = r*Math.sin(ph)*Math.sin(th); sp[i*3+2] = r*Math.cos(ph)
    sc[i*3] = 0.82 + Math.random()*0.18; sc[i*3+1] = 0.85 + (Math.random()-0.5)*0.1; sc[i*3+2] = 0.92 + Math.random()*0.08
  }
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  sg.setAttribute('color', new THREE.BufferAttribute(sc, 3))
  scene.add(new THREE.PointsMaterial({ size: 0.9, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.85 }))

  // Asteroid belt
 const ap = new Float32Array(2400 * 3)
  for (let i = 0; i < 2400; i++) {
    const a = Math.random() * Math.PI * 2, r = 86 + Math.random() * 10
    ap[i*3] = Math.cos(a)*r; ap[i*3+1] = (Math.random()-0.5)*2; ap[i*3+2] = Math.sin(a)*r
  }
  const ag = new THREE.BufferGeometry()
  ag.setAttribute('position', new THREE.BufferAttribute(ap, 3))
  scene.add(new THREE.Points(ag, new THREE.PointsMaterial({ color: 0x887766, size: 0.28, transparent: true, opacity: 0.7 })))
}

export default function App() {
  const mountRef = useRef(null)
  const controlsRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [isZoomed, setIsZoomed] = useState(false)
  const [page, setPage] = useState(null)
  const [showFavs, setShowFavs] = useState(false)
  const [ready, setReady] = useState(false)
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('astroFavs') || '[]') } catch { return [] }
  })

  const toggleFav = useCallback((name) => {
    setFavorites(prev => {
      const next = prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]
      localStorage.setItem('astroFavs', JSON.stringify(next))
      return next
    })
  }, [])

  function closePanel() {
    setSelected(null)
    if (isZoomed && controlsRef.current) { controlsRef.current.reset(); setIsZoomed(false) }
  }

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 6000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.85
    mount.appendChild(renderer.domElement)

    const controls = makeControls(camera, renderer.domElement)
    controlsRef.current = controls

    buildScene(scene)
    scene.add(new THREE.AmbientLight(0xffffff, 1.8))
    const sunLight = new THREE.PointLight(0xfff5e0, 3, 0)
    scene.add(sunLight)

    const loader = new THREE.TextureLoader()
    function loadTex(path, cb) { loader.load(path, cb, undefined, () => cb(null)) }

    const meshes = []
    const angles = BODIES.map((_, i) => (i / BODIES.length) * Math.PI * 2)
    const clickTargets = []

    BODIES.forEach((b, i) => {
      const mat = b.emissive
        ? new THREE.MeshStandardMaterial({ emissive: new THREE.Color(0xffdd00), emissiveIntensity: 1.1, color: 0x111111 })
        : new THREE.MeshStandardMaterial({ color: b.fallback, roughness: 0.82, metalness: 0.04 })
      loadTex(b.texture, (tex) => {
        if (!tex) return
        if (b.emissive) { mat.emissiveMap = tex; mat.emissiveIntensity = 0.95 }
        else { mat.map = tex; mat.color.setHex(0xffffff) }
        mat.needsUpdate = true
      })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(b.size, 64, 64), mat)
      mesh.userData = { bodyIndex: i }
      scene.add(mesh)
      meshes.push(mesh)
      clickTargets.push(mesh)
      if (b.glowColor) mesh.add(makeGlow(b.glowColor, b.size * 2 * (b.glowSize || 1.15)))
      if (b.hasRing) {
        const rg = new THREE.RingGeometry(b.size * 1.32, b.size * 2.45, 128)
        const rm = new THREE.MeshBasicMaterial({ color: 0xd4b896, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
        loadTex('/2k_saturn_ring_alpha.png', (tex) => { if (tex) { rm.map = tex; rm.alphaMap = tex; rm.needsUpdate = true } })
        const ring = new THREE.Mesh(rg, rm)
        ring.rotation.x = Math.PI / 2.3
        mesh.add(ring)
      }
      if (b.distance > 0) {
        const pts = []
        for (let a = 0; a <= Math.PI * 2; a += 0.015) pts.push(new THREE.Vector3(Math.cos(a) * b.distance, 0, Math.sin(a) * b.distance))
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x223355, transparent: true, opacity: 0.35 })))
      }
    })

    const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.92 })
    loadTex('/2k_moon.jpg', (tex) => { if (tex) { moonMat.map = tex; moonMat.color.setHex(0xffffff); moonMat.needsUpdate = true } })
    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 32), moonMat)
    moonMesh.userData = { isMoon: true }
    scene.add(moonMesh)
    clickTargets.push(moonMesh)
    let moonAngle = 0

    const galMeshes = GALILEAN.map((g, gi) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(g.size, 24, 24), new THREE.MeshStandardMaterial({ color: g.color, roughness: 0.9 }))
      m.userData = { galIndex: gi }
      scene.add(m)
      clickTargets.push(m)
      return m
    })
    const galAngles = GALILEAN.map((_, i) => (i / GALILEAN.length) * Math.PI * 2)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    let clickStart = { x: 0, y: 0 }

    function onPD(e) { clickStart = { x: e.clientX, y: e.clientY } }
    function onPU(e) {
      if (controls.isDragged()) return
      if (Math.abs(e.clientX - clickStart.x) > 6 || Math.abs(e.clientY - clickStart.y) > 6) return
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(clickTargets, false)
      if (!hits.length) { setSelected(null); controls.reset(); setIsZoomed(false); return }
      const hit = hits[0].object
      if (hit.userData.isMoon) {
        setSelected(MOON_INFO); controls.animateTo(moonMesh.position.clone(), 14); setIsZoomed(true)
      } else if (hit.userData.galIndex !== undefined) {
        const g = GALILEAN[hit.userData.galIndex]
        setSelected({ name: g.name, info: g.name + ' is one of Jupiter four Galilean moons discovered by Galileo in 1610.', stats: { Type: 'Moon of Jupiter' } })
        controls.animateTo(hit.position.clone(), g.size * 8); setIsZoomed(true)
      } else if (hit.userData.bodyIndex !== undefined) {
        const b = BODIES[hit.userData.bodyIndex]
        setSelected(b); controls.animateTo(meshes[hit.userData.bodyIndex].position.clone(), b.size * 6 + 18); setIsZoomed(true)
      }
    }

    renderer.domElement.addEventListener('pointerdown', onPD)
    renderer.domElement.addEventListener('pointerup', onPU)

    let animId
    let starAngle = 0
    function animate() {
      animId = requestAnimationFrame(animate)
      starAngle += 0.00008
      sg.attributes.position.needsUpdate = true
      scene.rotation.y = starAngle
      BODIES.forEach((b, i) => {
        if (b.distance > 0) { angles[i] += b.speed; meshes[i].position.x = Math.cos(angles[i]) * b.distance; meshes[i].position.z = Math.sin(angles[i]) * b.distance }
        meshes[i].rotation.y += b.emissive ? 0.0008 : 0.003
      })
      moonAngle += 0.006
      moonMesh.position.set(meshes[3].position.x + Math.cos(moonAngle) * 8, meshes[3].position.y, meshes[3].position.z + Math.sin(moonAngle) * 8)
      moonMesh.rotation.y += 0.002
      GALILEAN.forEach((g, i) => {
        galAngles[i] += g.speed
        galMeshes[i].position.set(meshes[5].position.x + Math.cos(galAngles[i]) * g.orbitR, meshes[5].position.y, meshes[5].position.z + Math.sin(galAngles[i]) * g.orbitR)
      })
      renderer.render(scene, camera)
    }
    animate()
    setTimeout(() => setReady(true), 400)

    function onResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight) }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', onPD)
      renderer.domElement.removeEventListener('pointerup', onPU)
      window.removeEventListener('resize', onResize)
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  const isFav = selected ? favorites.includes(selected.name) : false

  return (
    <div style={{ width:'100vw', height:'100vh', overflow:'hidden', position:'relative', background:'#02030f' }}>
      <div ref={mountRef} style={{ width:'100%', height:'100%', position:'absolute', inset:0 }} />
      <div style={{ position:'absolute', inset:0, background:'#02030f', transition:'opacity 1.4s ease', opacity: ready ? 0 : 1, pointerEvents:'none', zIndex:50 }} />

      <header style={{ position:'absolute', top:0, left:0, right:0, zIndex:20, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 28px', background:'linear-gradient(to bottom, rgba(2,3,15,0.96) 55%, transparent)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ color:'#7ba4ff', fontSize:'1.2rem' }}>✦</span>
          <span style={{ color:'#fff', fontSize:'1.15rem', fontWeight:300, letterSpacing:'0.28em', fontFamily:'Georgia, serif' }}>ASTRO-TRIP</span>
        </div>
        <nav style={{ display:'flex', gap:'4px', alignItems:'center' }}>
          <button style={nb()} onClick={() => { setPage(null); closePanel() }}>Explorer</button>
          <button style={nb(page === 'article')}  onClick={() => { setPage('article');  setSelected(null) }}>Articles</button>
          <button style={nb(page === 'research')} onClick={() => { setPage('research'); setSelected(null) }}>Research</button>
          <button style={nb(page === 'game')} onClick={() => { setPage('game'); setSelected(null) }}>Game</button>
          <button style={{ ...nb(showFavs), fontSize:'1rem', padding:'7px 12px', display:'flex', alignItems:'center', gap:'5px' }} onClick={() => setShowFavs(v => !v)}>
            ★{favorites.length > 0 && <span style={{ background:'#5577ff', color:'#fff', borderRadius:'10px', fontSize:'0.68rem', padding:'1px 5px', fontWeight:600 }}>{favorites.length}</span>}
          </button>
        </nav>
      </header>

      {(page === 'article' || page === 'research') && (
        <div style={{ position:'absolute', inset:0, zIndex:15, background:'rgba(2,3,15,0.82)', backdropFilter:'blur(2px)' }}>
          <div style={{ width:'100%', height:'100%' }} className="page-scrollable">
            <PostsPage type={page} onBack={() => setPage(null)} />
          </div>
        </div>
      )}
      
      {page === 'game' && (
  <div style={s.overlay}>
    <div style={s.overlayInner} className="page-scrollable">
      <GamesMenu onBack={() => setPage(null)} />
    </div>
  </div>
)}

      {!selected && !page && (
        <div style={{ position:'absolute', bottom:'22px', left:'50%', transform:'translateX(-50%)', color:'rgba(160,190,255,0.35)', fontSize:'0.76rem', display:'flex', gap:'10px', zIndex:10, whiteSpace:'nowrap' }}>
          <span>Drag to rotate</span><span>·</span><span>Scroll to zoom</span><span>·</span><span>Tap a planet to explore</span>
        </div>
      )}

      {selected && !page && (
        <div style={{ position:'absolute', bottom:'28px', left:'24px', background:'rgba(4,6,26,0.93)', border:'1px solid rgba(100,140,255,0.22)', borderRadius:'16px', padding:'26px', maxWidth:'320px', width:'calc(100vw - 48px)', backdropFilter:'blur(20px)', zIndex:10, boxShadow:'0 8px 48px rgba(0,0,70,0.6)', animation:'slideUp 0.35s cubic-bezier(0.16,1,0.3,1)' }}>
          <button onClick={closePanel} style={{ position:'absolute', top:'12px', right:'12px', background:'transparent', border:'none', color:'rgba(160,185,255,0.45)', fontSize:'1rem', cursor:'pointer', padding:'4px 8px' }}>✕</button>
          <div style={{ color:'#fff', fontSize:'1.55rem', fontFamily:'Georgia, serif', fontWeight:400, marginBottom:'10px' }}>{selected.name}</div>
          <p style={{ color:'rgba(185,205,255,0.8)', fontSize:'0.86rem', lineHeight:1.68, marginBottom:'18px' }}>{selected.info}</p>
          {selected.stats && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'18px' }}>
              {Object.entries(selected.stats).map(([k, v]) => (
                <div key={k} style={{ background:'rgba(80,110,200,0.09)', borderRadius:'8px', padding:'10px 12px', border:'1px solid rgba(100,140,255,0.11)' }}>
                  <div style={{ color:'rgba(140,170,255,0.55)', fontSize:'0.68rem', letterSpacing:'0.1em', marginBottom:'4px' }}>{k}</div>
                  <div style={{ color:'#ddeaff', fontSize:'0.84rem', fontWeight:500 }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <button style={{ ...ab(isFav) }} onClick={() => toggleFav(selected.name)}>{isFav ? '★ Saved' : '☆ Save'}</button>
            <button style={{ ...ab(false) }} onClick={closePanel}>← Back</button>
          </div>
        </div>
      )}

      {showFavs && (
        <div style={{ position:'absolute', top:'68px', right:'24px', background:'rgba(4,6,26,0.94)', border:'1px solid rgba(100,140,255,0.2)', borderRadius:'14px', padding:'18px', minWidth:'190px', backdropFilter:'blur(20px)', zIndex:20, boxShadow:'0 8px 32px rgba(0,0,60,0.5)' }}>
          <div style={{ color:'#99bbff', fontSize:'0.82rem', letterSpacing:'0.12em', marginBottom:'12px', fontWeight:500 }}>★ Favorites</div>
          {favorites.length === 0
            ? <div style={{ color:'rgba(140,170,255,0.35)', fontSize:'0.8rem' }}>Nothing saved yet.</div>
            : favorites.map(f => (
              <div key={f} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(100,140,255,0.08)' }}>
                <span style={{ color:'rgba(195,215,255,0.8)', fontSize:'0.83rem' }}>{f}</span>
                <button onClick={() => toggleFav(f)} style={{ background:'transparent', border:'none', color:'rgba(140,170,255,0.35)', cursor:'pointer', fontSize:'0.78rem', padding:'2px 6px' }}>✕</button>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

function nb(active) {
  return { background: active ? 'rgba(100,140,255,0.15)' : 'transparent', border: active ? '1px solid rgba(100,140,255,0.3)' : '1px solid transparent', color: active ? '#c8d8ff' : 'rgba(180,205,255,0.55)', padding:'7px 14px', borderRadius:'8px', fontSize:'0.8rem', letterSpacing:'0.06em', cursor:'pointer', fontFamily:'inherit' }
}
function ab(active) {
  return { background: active ? 'rgba(100,150,255,0.18)' : 'transparent', border: active ? '1px solid rgba(100,150,255,0.55)' : '1px solid rgba(100,150,255,0.3)', color: active ? '#ccdaff' : '#99bbff', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', fontSize:'0.8rem', letterSpacing:'0.04em', fontFamily:'inherit' }
}
