import { useEffect, useRef, useState, useCallback } from 'react'

const PLANET_COLORS = ['#ffdd00','#909090','#ddaa44','#2277ff','#cc4400','#cc9966','#ddcc88','#88dddd','#3355ff']
const PLANET_SIZES  = [20, 3, 5, 6, 4.5, 16, 14, 10, 9]
const PLANET_DIST   = [0, 80, 130, 180, 230, 300, 380, 450, 510]
const PLANET_NAMES  = ['Sun','Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune']
const STAR_COLORS   = ['#ffffff','#ffe8cc','#cce0ff','#ffeecc']

function getHighScore() { try { return parseInt(localStorage.getItem('astroDiveHS') || '0') } catch { return 0 } }
function saveHighScore(s) { try { localStorage.setItem('astroDiveHS', String(s)) } catch {} }

export default function AstroDive({ onBack }) {
  const [phase, setPhase]       = useState('menu')
  const [mode, setMode]         = useState(null)
  const [score, setScore]       = useState(0)
  const [highScore, setHighScore] = useState(getHighScore())
  const [lives, setLives]       = useState(3)
  const [nearPlanet, setNearPlanet] = useState(null)
  const canvasRef = useRef(null)
  const stateRef  = useRef({})
  const animRef   = useRef(null)

  const endGame = useCallback((finalScore) => {
    cancelAnimationFrame(animRef.current)
    if (finalScore > getHighScore()) { saveHighScore(finalScore); setHighScore(finalScore) }
    setScore(finalScore)
    setPhase('result')
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const W = canvas.width, H = canvas.height

    // Generate stars
    const stars = Array.from({ length: 300 }, () => ({
      x: Math.random() * W * 4 - W * 1.5,
      y: Math.random() * H * 4 - H * 1.5,
      r: Math.random() * 1.5,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    }))

    // Planets
    const planets = PLANET_DIST.map((dist, i) => {
      if (mode === 'topdown') {
        const angle = Math.random() * Math.PI * 2
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, r: PLANET_SIZES[i], color: PLANET_COLORS[i], name: PLANET_NAMES[i], angle, dist, speed: i === 0 ? 0 : 0.0001 + 0.0003 / (i + 1) }
      } else {
        return { x: dist * 3, y: H / 2 + (Math.random() - 0.5) * 80, r: PLANET_SIZES[i], color: PLANET_COLORS[i], name: PLANET_NAMES[i] }
      }
    })

    // Asteroids
    const asteroids = Array.from({ length: 18 }, () => ({
      x: Math.random() * 2000 + 500,
      y: Math.random() * H,
      r: 4 + Math.random() * 8,
      vx: -(1 + Math.random() * 2),
      vy: (Math.random() - 0.5) * 0.8,
      rot: 0, rotV: (Math.random() - 0.5) * 0.05,
    }))

    // Stars collectibles
    const starItems = Array.from({ length: 25 }, () => ({
      x: Math.random() * 2000 + 300,
      y: Math.random() * (H - 80) + 40,
      r: 8, collected: false, pulse: 0,
    }))

    // Ship
    const ship = { x: mode === 'topdown' ? 0 : 100, y: mode === 'topdown' ? 0 : H / 2, vx: 0, vy: 0, angle: 0, thrust: false, invincible: 0 }
    const keys = {}
    let camX = ship.x - W / 2, camY = ship.y - H / 2
    let scoreVal = 0, livesVal = 3, gameOver = false

    stateRef.current = { ship, keys, scoreVal, livesVal, gameOver }

    function onKey(e) {
      keys[e.code] = e.type === 'keydown'
      e.preventDefault()
    }

    // Touch controls
    let touchStart = null
    function onTouchStart(e) { touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
    function onTouchMove(e) {
      if (!touchStart) return
      const dx = e.touches[0].clientX - touchStart.x
      const dy = e.touches[0].clientY - touchStart.y
      if (mode === 'topdown') { ship.angle = Math.atan2(dy, dx); keys['ArrowUp'] = Math.hypot(dx, dy) > 20 }
      else { ship.vy = dy * 0.1; keys['ArrowUp'] = dy < -20; keys['ArrowDown'] = dy > 20 }
    }
    function onTouchEnd() { touchStart = null; keys['ArrowUp'] = false; keys['ArrowDown'] = false }

    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: true })
    canvas.addEventListener('touchend', onTouchEnd)

    function drawShip(ctx, x, y, angle, thrust, invincible) {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle)
      if (invincible > 0 && Math.floor(invincible / 6) % 2 === 0) { ctx.restore(); return }
      ctx.strokeStyle = '#aac4ff'
      ctx.lineWidth = 2
      ctx.fillStyle = 'rgba(80,120,255,0.3)'
      ctx.beginPath()
      ctx.moveTo(16, 0)
      ctx.lineTo(-10, 10)
      ctx.lineTo(-6, 0)
      ctx.lineTo(-10, -10)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      if (thrust) {
        ctx.fillStyle = `rgba(255,${100 + Math.random() * 155},0,0.8)`
        ctx.beginPath()
        ctx.moveTo(-6, 4)
        ctx.lineTo(-6 - 8 - Math.random() * 8, 0)
        ctx.lineTo(-6, -4)
        ctx.fill()
      }
      ctx.restore()
    }

    function loop() {
      if (gameOver) return
      animRef.current = requestAnimationFrame(loop)

      // Input
      if (mode === 'topdown') {
        if (keys['ArrowLeft']  || keys['KeyA']) ship.angle -= 0.06
        if (keys['ArrowRight'] || keys['KeyD']) ship.angle += 0.06
        if (keys['ArrowUp']    || keys['KeyW']) { ship.vx += Math.cos(ship.angle) * 0.18; ship.vy += Math.sin(ship.angle) * 0.18; ship.thrust = true } else ship.thrust = false
        ship.vx *= 0.97; ship.vy *= 0.97
        ship.x += ship.vx; ship.y += ship.vy
        // Orbit planets
        planets.forEach(p => { if (p.speed) { p.angle += p.speed; p.x = Math.cos(p.angle) * p.dist; p.y = Math.sin(p.angle) * p.dist } })
        camX += (ship.x - W / 2 - camX) * 0.1
        camY += (ship.y - H / 2 - camY) * 0.1
      } else {
        if (keys['ArrowUp']   || keys['KeyW']) ship.vy -= 0.25
        if (keys['ArrowDown'] || keys['KeyS']) ship.vy += 0.25
        ship.vy *= 0.92
        ship.vx = 2.2
        ship.x += ship.vx; ship.y += ship.vy
        ship.y = Math.max(20, Math.min(H - 20, ship.y))
        ship.thrust = keys['ArrowUp'] || keys['KeyW']
        ship.angle = Math.atan2(ship.vy, ship.vx)
        camX += (ship.x - W * 0.3 - camX) * 0.08
        camY += (ship.y - H / 2 - camY) * 0.08
      }

      if (ship.invincible > 0) ship.invincible--

      // Draw
      ctx.fillStyle = '#02030f'
      ctx.fillRect(0, 0, W, H)

      // Stars bg (parallax)
      stars.forEach(st => {
        ctx.beginPath()
        ctx.arc(((st.x - camX * 0.3) % (W * 2) + W * 2) % (W * 2), ((st.y - camY * 0.3) % (H * 2) + H * 2) % (H * 2), st.r, 0, Math.PI * 2)
        ctx.fillStyle = st.color
        ctx.fill()
      })

      ctx.save()
      ctx.translate(-camX, -camY)

      // Orbit rings (top-down)
      if (mode === 'topdown') {
        PLANET_DIST.forEach(d => {
          if (!d) return
          ctx.beginPath(); ctx.arc(0, 0, d, 0, Math.PI * 2)
          ctx.strokeStyle = 'rgba(80,110,200,0.15)'; ctx.lineWidth = 1; ctx.stroke()
        })
      }

      // Star collectibles
      starItems.forEach(st => {
        if (st.collected) return
        st.pulse = (st.pulse + 0.05) % (Math.PI * 2)
        const glow = 4 + Math.sin(st.pulse) * 2
        ctx.beginPath(); ctx.arc(st.x, st.y, glow, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,220,50,0.3)'; ctx.fill()
        ctx.beginPath(); ctx.arc(st.x, st.y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#ffdd44'; ctx.fill()
        // Collect
        if (Math.hypot(ship.x - st.x, ship.y - st.y) < st.r + 12) {
          st.collected = true; scoreVal += 10; setScore(scoreVal)
        }
      })

      // Planets
      let nearest = null, nearestDist = Infinity
      planets.forEach(p => {
        const grad = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r)
        grad.addColorStop(0, p.color + 'ff'); grad.addColorStop(1, p.color + '88')
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = grad; ctx.fill()
        // Glow
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2)
        ctx.strokeStyle = p.color + '44'; ctx.lineWidth = 6; ctx.stroke()
        // Label
        const d = Math.hypot(ship.x - p.x, ship.y - p.y)
        if (d < nearestDist) { nearestDist = d; nearest = p.name }
        if (d < p.r + 80) {
          ctx.fillStyle = 'rgba(200,220,255,0.8)'; ctx.font = '12px Inter, sans-serif'
          ctx.textAlign = 'center'; ctx.fillText(p.name, p.x, p.y - p.r - 10)
        }
        // Collision
        if (d < p.r + 10 && ship.invincible === 0 && p.name !== 'Sun') {
          ship.invincible = 90; livesVal--; setLives(livesVal)
          if (livesVal <= 0) { gameOver = true; endGame(scoreVal) }
        }
      })
      setNearPlanet(nearestDist < 200 ? nearest : null)

      // Asteroids
      asteroids.forEach(a => {
        a.x += a.vx; a.y += a.vy; a.rot += a.rotV
        if (a.x < camX - 100) { a.x = camX + W + 100; a.y = Math.random() * H + camY }
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot)
        ctx.beginPath()
        for (let i = 0; i < 7; i++) {
          const ang = (i / 7) * Math.PI * 2, r = a.r * (0.7 + Math.sin(i * 2.3) * 0.3)
          i === 0 ? ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r) : ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
        }
        ctx.closePath(); ctx.fillStyle = '#554433'; ctx.fill(); ctx.strokeStyle = '#887766'; ctx.lineWidth = 1; ctx.stroke()
        ctx.restore()
        // Collision
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.r + 10 && ship.invincible === 0) {
          ship.invincible = 90; livesVal--; setLives(livesVal)
          a.x = camX + W + 200
          if (livesVal <= 0) { gameOver = true; endGame(scoreVal) }
        }
      })

      // Ship
      drawShip(ctx, ship.x, ship.y, ship.angle, ship.thrust, ship.invincible)
      ctx.restore()

      // HUD
      ctx.fillStyle = 'rgba(2,3,15,0.7)'
      ctx.fillRect(0, 0, W, 50)
      ctx.fillStyle = '#ddeaff'; ctx.font = '14px Inter, sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(`⭐ ${scoreVal}`, 20, 32)
      ctx.textAlign = 'center'
      ctx.fillText(mode === 'topdown' ? 'TOP-DOWN · WASD/Arrows' : 'FIRST PERSON · ↑↓ to fly', W / 2, 32)
      ctx.textAlign = 'right'
      ctx.fillText('❤️ '.repeat(livesVal), W - 20, 32)
    }

    loop()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [phase, mode, endGame])

  if (phase === 'menu') return (
    <div style={s.root}>
      <button style={s.backBtn} onClick={onBack}>← Games</button>
      <div style={s.menuBox}>
        <div style={s.icon}>🚀</div>
        <h1 style={s.title}>Astro Dive</h1>
        <p style={s.subtitle}>Fly through the Solar System. Collect stars. Avoid asteroids and planet collisions.</p>
        <p style={s.subtitle}>Choose your perspective:</p>
        <div style={s.modeRow}>
          <button style={s.modeBtn} onClick={() => { setMode('topdown'); setLives(3); setScore(0); setPhase('playing') }}>
            <span style={{ fontSize: '2rem' }}>🗺️</span>
            <span style={s.modeName}>Top-Down</span>
            <span style={s.modeDesc}>Overhead view of the solar system. Full freedom of movement.</span>
          </button>
          <button style={s.modeBtn} onClick={() => { setMode('firstperson'); setLives(3); setScore(0); setPhase('playing') }}>
            <span style={{ fontSize: '2rem' }}>👨‍🚀</span>
            <span style={s.modeName}>First Person</span>
            <span style={s.modeDesc}>Fly through space in a scrolling perspective. Dodge everything.</span>
          </button>
        </div>
        <div style={s.controls}>
          <div style={s.ctrlTitle}>Controls</div>
          <div style={s.ctrlRow}><kbd style={s.kbd}>W / ↑</kbd><span>Thrust / Up</span></div>
          <div style={s.ctrlRow}><kbd style={s.kbd}>A / ←</kbd><span>Turn left (top-down)</span></div>
          <div style={s.ctrlRow}><kbd style={s.kbd}>D / →</kbd><span>Turn right (top-down)</span></div>
          <div style={s.ctrlRow}><kbd style={s.kbd}>S / ↓</kbd><span>Down (first person)</span></div>
          <div style={s.ctrlRow}><span>📱</span><span>Swipe to steer on mobile</span></div>
        </div>
        {highScore > 0 && <div style={s.hsBox}>🏆 High Score: <strong style={{ color: '#ffdd44' }}>{highScore}</strong></div>}
      </div>
    </div>
  )

  if (phase === 'result') return (
    <div style={s.root}>
      <button style={s.backBtn} onClick={onBack}>← Games</button>
      <div style={s.menuBox}>
        <div style={s.icon}>💫</div>
        <h1 style={s.title}>Game Over</h1>
        <div style={s.finalScore}>{score} <span style={{ fontSize: '1.5rem', color: 'rgba(160,185,255,0.5)' }}>stars</span></div>
        {score >= highScore && score > 0 && <div style={{ color: '#ffdd44', fontSize: '0.9rem' }}>🏆 New High Score!</div>}
        <div style={{ color: 'rgba(160,185,255,0.5)', fontSize: '0.85rem' }}>High Score: {highScore}</div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={s.startBtn} onClick={() => { setLives(3); setScore(0); setPhase('playing') }}>Play Again</button>
          <button style={{ ...s.startBtn, background: 'transparent', borderColor: 'rgba(100,140,255,0.3)', color: '#99bbff' }} onClick={() => setPhase('menu')}>Change Mode</button>
          <button style={{ ...s.startBtn, background: 'transparent', borderColor: 'rgba(100,140,255,0.3)', color: '#99bbff' }} onClick={onBack}>← Games</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#02030f', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {nearPlanet && (
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(4,6,26,0.85)', border: '1px solid rgba(100,140,255,0.25)', borderRadius: '10px', padding: '8px 20px', color: '#aac4ff', fontSize: '0.82rem', backdropFilter: 'blur(10px)', letterSpacing: '0.08em' }}>
          Approaching {nearPlanet}
        </div>
      )}
      <button onClick={() => { cancelAnimationFrame(animRef.current); setPhase('menu') }}
        style={{ position: 'absolute', top: '60px', right: '20px', background: 'rgba(4,6,26,0.8)', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Inter, sans-serif' }}>
        ✕ Quit
      </button>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#02030f', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 60px' },
  backBtn: { alignSelf: 'flex-start', marginTop: '24px', background: 'transparent', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' },
  menuBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '600px', width: '100%', marginTop: '40px' },
  icon: { fontSize: '4rem' },
  title: { color: '#fff', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontFamily: 'Georgia, serif', fontWeight: 300, margin: 0, textAlign: 'center' },
  subtitle: { color: 'rgba(160,185,255,0.6)', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.6, margin: 0 },
  modeRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%' },
  modeBtn: { background: 'rgba(8,12,40,0.8)', border: '1px solid rgba(80,110,200,0.2)', borderRadius: '16px', padding: '24px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', transition: 'all 0.25s', fontFamily: 'inherit' },
  modeName: { color: '#ddeaff', fontSize: '1rem', fontFamily: 'Georgia, serif' },
  modeDesc: { color: 'rgba(160,185,255,0.5)', fontSize: '0.78rem', textAlign: 'center', lineHeight: 1.5 },
  controls: { width: '100%', background: 'rgba(8,12,40,0.5)', border: '1px solid rgba(80,110,200,0.12)', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '8px' },
  ctrlTitle: { color: 'rgba(120,160,255,0.5)', fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' },
  ctrlRow: { display: 'flex', gap: '12px', alignItems: 'center', color: 'rgba(180,200,255,0.6)', fontSize: '0.83rem' },
  kbd: { background: 'rgba(80,110,200,0.15)', border: '1px solid rgba(100,140,255,0.2)', borderRadius: '4px', padding: '2px 8px', fontSize: '0.78rem', color: '#aabbff', fontFamily: 'monospace', minWidth: '60px', textAlign: 'center' },
  hsBox: { color: 'rgba(160,185,255,0.6)', fontSize: '0.88rem', background: 'rgba(80,110,200,0.1)', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(100,140,255,0.15)' },
  startBtn: { background: 'rgba(204,68,255,0.2)', border: '1px solid rgba(204,68,255,0.4)', color: '#ddaaff', padding: '14px 28px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', letterSpacing: '0.05em' },
  finalScore: { color: '#fff', fontSize: '4rem', fontFamily: 'Georgia, serif', fontWeight: 300 },
}
