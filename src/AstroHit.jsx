import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './Auth'

function getHighScore() { try { return parseInt(localStorage.getItem('astroHitHS') || '0') } catch { return 0 } }
function saveHighScore(s) { try { localStorage.setItem('astroHitHS', String(s)) } catch {} }

let audioCtx = null
function getCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}
function playTone(freq, duration, type = 'sine', volume = 0.15, sweepTo = null) {
  const ctx = getCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime + duration)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

const SFX = {
  fire:    () => playTone(220, 0.07, 'sawtooth', 0.10, 110),
  perfect: () => { playTone(880, 0.12, 'sine', 0.20); setTimeout(() => playTone(1320, 0.18, 'sine', 0.16), 55) },
  good:    () => playTone(660, 0.11, 'sine', 0.15),
  okay:    () => playTone(440, 0.09, 'triangle', 0.12),
  miss:    () => { playTone(320, 0.10, 'triangle', 0.12); setTimeout(() => playTone(200, 0.14, 'triangle', 0.10), 70) },
  combo:   (n) => {
    const base = 523
    for (let i = 0; i < 3; i++) setTimeout(() => playTone(base * Math.pow(1.26, i + Math.min(n, 5) * 0.15), 0.09, 'sine', 0.14), i * 45)
  },
  over:    () => {
    playTone(523, 0.40, 'sine', 0.10)
    setTimeout(() => playTone(440, 0.55, 'sine', 0.09), 180)
    setTimeout(() => playTone(349, 1.10, 'sine', 0.09), 380)
  },
}

export default function AstroHit({ onBack }) {
  const { user, openSignIn, submitGameScore, loadGameScores } = useAuth()
  const [phase, setPhase] = useState('menu')
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [guestScore, setGuestScore] = useState(() => getHighScore())
  const [maxCombo, setMaxCombo] = useState(0)
  const [lives, setLives] = useState(3)
  const [combo, setCombo] = useState(0)
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (user) {
      loadGameScores().then(scores => {
        setBestScore(scores['astrohit']?.high_score || 0)
      })
    } else {
      setBestScore(guestScore)
    }
  }, [user, guestScore, loadGameScores])

  useEffect(() => {
    const unlock = () => { getCtx(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])

  const startGame = () => {
    setScore(0)
    setMaxCombo(0)
    setLives(3)
    setCombo(0)
    setPhase('playing')
  }

  const endGame = useCallback(async (finalScore, finalCombo) => {
    cancelAnimationFrame(animRef.current)
    SFX.over()
    if (user) {
      const result = await submitGameScore('astrohit', finalScore)
      if (result) setBestScore(result.high_score)
    } else {
      if (finalScore > guestScore) {
        saveHighScore(finalScore)
        setGuestScore(finalScore)
        setBestScore(finalScore)
      }
    }
    setScore(finalScore)
    setMaxCombo(finalCombo)
    setPhase('result')
  }, [user, submitGameScore, guestScore])

  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const W = () => canvas.width
    const H = () => canvas.height

    let scoreVal = 0
    let livesVal = 3
    let comboVal = 0
    let maxComboVal = 0
    let gameOver = false
    let meteors = []
    let shake = 0
    let spawnCooldown = 0
    let prevDesiredCount = 1
    const particles = []
    const popups = []
    const impacts = []
    const permanentCraters = []

    let moonBaked = null
    let moonBakedCX = 0
    let moonBakedCY = 0

    function desiredMeteorCount() {
      if (scoreVal < 100) return 1
      if (scoreVal < 250) return 2
      if (scoreVal < 500) return 3
      if (scoreVal < 900) return 4
      return 5
    }

    const target = { x: 0, y: 0, r: 0 }
    function computeTarget() {
      target.x = W() / 2
      target.y = H() * 0.72
      target.r = Math.min(W(), H()) * 0.19
    }

    function resize() {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      computeTarget()
      const baked = bakeMoonBase(target.r)
      moonBaked = baked.canvas
      moonBakedCX = baked.cx
      moonBakedCY = baked.cy
      for (const m of meteors) {
        const dx = target.x - m.x
        const dy = target.y - m.y
        const len = Math.hypot(dx, dy) || 1
        const speed = Math.hypot(m.vx, m.vy)
        m.vx = (dx / len) * speed
        m.vy = (dy / len) * speed
      }
    }
    resize()
    window.addEventListener('resize', resize)

    function spawnMeteor() {
      const startX = W() * (0.1 + Math.random() * 0.8)
      const startY = -40 - meteors.length * 50
      const aimX = target.x + (Math.random() - 0.5) * target.r * 0.5
      const aimY = target.y
      const dx = aimX - startX
      const dy = aimY - startY
      const len = Math.hypot(dx, dy) || 1
      const speed = 2.5 + Math.min(3, scoreVal / 600)
      meteors.push({ x: startX, y: startY, vx: (dx / len) * speed, vy: (dy / len) * speed, trail: [], size: 10 })
    }
    spawnMeteor()

    function fire() {
      if (meteors.length === 0 || gameOver) return
      SFX.fire()

      let active = null
      let activeDist = Infinity
      for (const m of meteors) {
        const d = Math.hypot(m.x - target.x, m.y - target.y)
        if (d < activeDist) { activeDist = d; active = m }
      }
      if (!active) return

      let points = 0
      let hitType = 'miss'
      if (activeDist < target.r * 0.3) { points = 100; hitType = 'perfect' }
      else if (activeDist < target.r * 0.6) { points = 50; hitType = 'good' }
      else if (activeDist < target.r) { points = 20; hitType = 'okay' }

      meteors = meteors.filter(m => m !== active)

      if (hitType === 'miss') {
        livesVal--
        setLives(livesVal)
        comboVal = 0
        setCombo(0)
        SFX.miss()
        shake = 12
        popups.push({ x: active.x, y: active.y - 20, text: 'MISS', color: '#ff4444', life: 70, big: true })
        for (let i = 0; i < 12; i++) {
          const a = Math.random() * Math.PI * 2
          const sp = 1 + Math.random() * 4
          particles.push({ x: active.x, y: active.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 35, color: '#ff6644', size: 2 })
        }
        if (livesVal <= 0) { gameOver = true; endGame(scoreVal, maxComboVal) }
        return
      }

      comboVal++
      if (comboVal > maxComboVal) maxComboVal = comboVal
      setCombo(comboVal)

      const comboMult = comboVal >= 5 ? 3 : comboVal >= 3 ? 2 : 1
      const finalPoints = points * comboMult
      scoreVal += finalPoints
      setScore(scoreVal)

      if (hitType === 'perfect') SFX.perfect()
      else if (hitType === 'good') SFX.good()
      else SFX.okay()
      if (comboVal >= 3) SFX.combo(comboVal)

      if (hitType === 'perfect') shake = 16
      else if (hitType === 'good') shake = 10
      else shake = 6

      const color = hitType === 'perfect' ? '#ffdd44' : hitType === 'good' ? '#88ffcc' : '#aaccff'
      popups.push({ x: active.x, y: active.y - 20, text: `+${finalPoints}${comboMult > 1 ? ` ×${comboMult}` : ''}`, color, life: 70, big: hitType === 'perfect' })

      const impSize = hitType === 'perfect' ? 22 : hitType === 'good' ? 15 : 10
      impacts.push({
        x: active.x,
        y: active.y,
        u: (active.x - target.x) / target.r,
        v: (active.y - target.y) / target.r,
        age: 0,
        maxAge: 60,
        size: impSize,
        seed: Math.random() * 1000,
      })

      const pCount = hitType === 'perfect' ? 40 : hitType === 'good' ? 24 : 14
      const pColor = hitType === 'perfect' ? '#ffdd44' : hitType === 'good' ? '#88ffcc' : '#ffaa66'
      for (let i = 0; i < pCount; i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 1.5 + Math.random() * 6
        particles.push({ x: active.x, y: active.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 40, color: pColor, size: 2 + Math.random() * 2.5 })
      }
    }

    function onKey(e) {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); fire() }
    }
    function onPointer(e) { e.preventDefault(); fire() }
    window.addEventListener('keydown', onKey)
    canvas.addEventListener('pointerdown', onPointer)

    function loop() {
      if (gameOver) return
      animRef.current = requestAnimationFrame(loop)
      if (shake > 0) shake *= 0.88

      const currentDesired = desiredMeteorCount()
      if (currentDesired > prevDesiredCount) {
        popups.push({ x: W() / 2, y: H() * 0.3, text: `⚡ ${currentDesired}× METEORS`, color: '#ffdd44', life: 110, big: true })
        SFX.combo(currentDesired + 2)
        prevDesiredCount = currentDesired
      }

      let lostThisFrame = 0
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.trail.push({ x: m.x, y: m.y })
        if (m.trail.length > 12) m.trail.shift()
        m.x += m.vx
        m.y += m.vy
        if (m.y > H() + 80 || m.x < -80 || m.x > W() + 80) {
          meteors.splice(i, 1)
          lostThisFrame++
        }
      }
      if (lostThisFrame > 0) {
        livesVal -= lostThisFrame
        comboVal = 0
        setLives(Math.max(0, livesVal))
        setCombo(0)
        SFX.miss()
        shake = 10
        popups.push({ x: W() / 2, y: H() * 0.4, text: 'MISSED!', color: '#ff4444', life: 80, big: true })
        if (livesVal <= 0) { gameOver = true; endGame(scoreVal, maxComboVal); return }
      }

      if (spawnCooldown > 0) spawnCooldown--
      if (meteors.length < currentDesired && spawnCooldown <= 0) {
        spawnMeteor()
        spawnCooldown = 10
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life--
        if (p.life <= 0) particles.splice(i, 1)
      }
      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i]
        p.y -= 1.4; p.life--
        if (p.life <= 0) popups.splice(i, 1)
      }
      for (let i = impacts.length - 1; i >= 0; i--) {
        const imp = impacts[i]
        imp.age++
        if (imp.age >= imp.maxAge) {
          permanentCraters.push({ u: imp.u, v: imp.v, r: imp.size / target.r * 0.8 })
          if (permanentCraters.length > 30) permanentCraters.shift()
          impacts.splice(i, 1)
        }
      }

      let active = null
      let activeDist = Infinity
      for (const m of meteors) {
        const d = Math.hypot(m.x - target.x, m.y - target.y)
        if (d < activeDist) { activeDist = d; active = m }
      }
      const inRange = active && activeDist < target.r

      ctx.save()
      if (shake > 0.5) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
      ctx.fillStyle = '#02030f'
      ctx.fillRect(-30, -30, W() + 60, H() + 60)
      ctx.fillStyle = 'rgba(200,220,255,0.3)'
      for (let i = 0; i < 60; i++) {
        ctx.fillRect((i * 173) % W(), (i * 267) % H(), 1.5, 1.5)
      }

      if (moonBaked) {
        ctx.drawImage(moonBaked, target.x - moonBakedCX, target.y - moonBakedCY)
      }

      ctx.save()
      ctx.beginPath()
      ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2)
      ctx.clip()
      permanentCraters.forEach(c => {
        drawCrater(ctx, target.x + c.u * target.r, target.y + c.v * target.r, c.r * target.r, false)
      })
      impacts.forEach(imp => {
        const craterR = imp.size * Math.min(1, imp.age / 10) * 0.8
        if (craterR > 0.6) {
          drawCrater(ctx, target.x + imp.u * target.r, target.y + imp.v * target.r, craterR, imp.age < 25)
        }
      })
      ctx.restore()

      impacts.forEach(imp => drawImpactEffects(ctx, { x: target.x, y: target.y, r: target.r }, imp))

      if (inRange) drawLockOn(ctx, target.x, target.y, target.r, Date.now())

      meteors.forEach(m => {
        m.trail.forEach((t, i) => {
          const alpha = i / m.trail.length
          ctx.beginPath()
          ctx.arc(t.x, t.y, m.size * alpha * 0.9, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,150,60,${alpha * 0.4})`
          ctx.fill()
        })
        const mg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 2.4)
        mg.addColorStop(0, '#ffffff')
        mg.addColorStop(0.28, '#ffcc66')
        mg.addColorStop(0.55, '#ff8844')
        mg.addColorStop(1, 'rgba(255,100,50,0)')
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.size * 2.4, 0, Math.PI * 2)
        ctx.fillStyle = mg
        ctx.fill()
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.size * 0.55, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      })

      particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / 45)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        ctx.globalAlpha = 1
      })

      popups.forEach(p => {
        ctx.globalAlpha = Math.min(1, p.life / 25)
        ctx.fillStyle = p.color
        ctx.font = p.big ? 'bold 26px Inter, sans-serif' : 'bold 18px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(p.text, p.x, p.y)
        ctx.globalAlpha = 1
      })

      ctx.restore()

      ctx.fillStyle = 'rgba(2,3,15,0.75)'
      ctx.fillRect(0, 0, W(), 56)
      ctx.fillStyle = '#ddeaff'
      ctx.font = 'bold 16px Inter, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`⭐ ${scoreVal}`, 20, 36)

      if (comboVal >= 2) {
        ctx.fillStyle = comboVal >= 5 ? '#ffdd44' : '#88ffcc'
        ctx.font = 'bold 18px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`COMBO ×${comboVal}`, W() / 2, 36)
      } else if (meteors.length > 1) {
        ctx.fillStyle = '#ffaa88'
        ctx.font = 'bold 14px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`☄️ ×${meteors.length} INCOMING`, W() / 2, 36)
      } else {
        ctx.fillStyle = 'rgba(160,185,255,0.4)'
        ctx.font = '12px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('TAP when a meteor is over the Moon', W() / 2, 36)
      }

      ctx.textAlign = 'right'
      ctx.font = '18px Inter, sans-serif'
      let livesStr = ''
      for (let i = 0; i < livesVal; i++) livesStr += '❤️ '
      if (livesVal === 0) livesStr = '💀'
      ctx.fillText(livesStr, W() - 20, 36)
    }
    loop()

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onPointer)
    }
  }, [phase, endGame])

  if (phase === 'menu') return (
    <div style={s.root}>
      <button style={s.backBtn} onClick={onBack}>← Games</button>
      <div style={s.menuBox}>
        <div style={s.icon}>🌕</div>
        <h1 style={s.title}>Astro Hit</h1>
        <p style={s.subtitle}>Asteroids are falling toward the Moon. Tap before they slip past.</p>
        <div style={s.rulesBox}>
          <div style={s.rule}>🎯 Tap / click / press Space when a meteor is over the Moon</div>
          <div style={s.rule}>✨ Center hit = 100 points. 3 hits in a row doubles the score, 5 triples it</div>
          <div style={s.rule}>☄️ Meteors multiply as your score climbs: 1 → 2 → 3 → 4 → 5</div>
          <div style={s.rule}>🌑 Every impact leaves a fresh crater on the surface</div>
          <div style={s.rule}>❤️ Three misses and it's over</div>
        </div>
        {bestScore > 0 && <div style={s.bestBox}>🏆 Best: {bestScore.toLocaleString()}</div>}
        <button style={s.startBtn} onClick={startGame}>Start →</button>
      </div>
    </div>
  )

  if (phase === 'result') return (
    <div style={s.root}>
      <button style={s.backBtn} onClick={onBack}>← Games</button>
      <div style={s.menuBox}>
        <div style={s.icon}>💥</div>
        <h1 style={s.title}>Game Over</h1>
        <div style={s.finalScore}>{score.toLocaleString()}</div>
        <div style={s.statBox}>
          <div style={s.statRow}><span>Best combo</span><span style={{ color: '#ffdd44' }}>×{maxCombo}</span></div>
          <div style={s.statRow}><span>High score</span><span style={{ color: '#88ffcc' }}>{bestScore.toLocaleString()}</span></div>
        </div>
        {score >= bestScore && score > 0 && (
          <div style={{ color: '#ffdd44', fontSize: '0.9rem', letterSpacing: '0.1em' }}>🏆 NEW HIGH SCORE</div>
        )}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button style={s.startBtn} onClick={startGame}>Play Again</button>
          <button style={{ ...s.startBtn, background: 'transparent', borderColor: 'rgba(100,140,255,0.3)', color: '#99bbff' }} onClick={onBack}>← Games</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#02030f', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', userSelect: 'none' }} />
      <button onClick={onBack} style={{ position: 'absolute', top: '64px', right: '16px', background: 'rgba(4,6,26,0.8)', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', zIndex: 10 }}>✕ Quit</button>
    </div>
  )
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function genMoonTexture() {
  const craters = []
  const specks = []
  const maria = []

  const mariaGroups = [
    { alpha: 0.40, circles: [{ dx: -0.28, dy: -0.18, r: 0.24 }, { dx: -0.18, dy: -0.08, r: 0.20 }, { dx: -0.34, dy: 0.02, r: 0.17 }] },
    { alpha: 0.36, circles: [{ dx: 0.22, dy: -0.22, r: 0.19 }, { dx: 0.32, dy: -0.10, r: 0.15 }, { dx: 0.15, dy: -0.30, r: 0.13 }] },
    { alpha: 0.34, circles: [{ dx: 0.12, dy: 0.30, r: 0.22 }, { dx: 0.26, dy: 0.22, r: 0.15 }] },
    { alpha: 0.30, circles: [{ dx: -0.32, dy: 0.28, r: 0.13 }, { dx: -0.22, dy: 0.36, r: 0.11 }] },
    { alpha: 0.28, circles: [{ dx: 0.36, dy: 0.30, r: 0.12 }] },
  ]
  mariaGroups.forEach(m => maria.push(m))

  for (let i = 0; i < 42; i++) {
    const ang = hash(i * 3 + 1) * Math.PI * 2
    const dist = Math.sqrt(hash(i * 3 + 2)) * 0.93
    const size = 0.012 + hash(i * 3 + 3) * 0.05
    craters.push({ u: Math.cos(ang) * dist, v: Math.sin(ang) * dist, r: size })
  }

  for (let i = 0; i < 140; i++) {
    const ang = hash(i + 5000) * Math.PI * 2
    const dist = Math.sqrt(hash(i + 6000)) * 0.95
    specks.push({
      u: Math.cos(ang) * dist,
      v: Math.sin(ang) * dist,
      r: 0.004 + hash(i + 7000) * 0.011,
      dark: hash(i + 8000) > 0.5,
    })
  }

  return { craters, specks, maria }
}

const MOON_TEXTURE = genMoonTexture()

function drawCrater(ctx, cx, cy, r, hot) {
  if (r < 0.6) return
  const lw = Math.max(1, r * 0.1)

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(28, 22, 16, 0.35)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.6, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(8, 6, 3, 0.38)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.92, Math.PI * 0.1, Math.PI * 0.9)
  ctx.strokeStyle = 'rgba(252, 246, 232, 0.5)'
  ctx.lineWidth = lw
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.92, Math.PI * 1.15, Math.PI * 1.85)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)'
  ctx.lineWidth = lw
  ctx.stroke()

  if (hot) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, 'rgba(255, 170, 70, 0.45)')
    g.addColorStop(1, 'rgba(255, 80, 20, 0)')
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
  }
}

function bakeMoonBase(r) {
  const pad = 30
  const size = Math.ceil(r * 2 + pad * 2)
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const bctx = c.getContext('2d')
  const cx = size / 2
  const cy = size / 2

  const grad = bctx.createRadialGradient(cx - r * 0.42, cy - r * 0.42, r * 0.08, cx, cy, r)
  grad.addColorStop(0,    '#f4f0e4')
  grad.addColorStop(0.35, '#d8d2c2')
  grad.addColorStop(0.7,  '#a29c8e')
  grad.addColorStop(0.95, '#4a4236')
  grad.addColorStop(1,    '#2a2418')
  bctx.beginPath()
  bctx.arc(cx, cy, r, 0, Math.PI * 2)
  bctx.fillStyle = grad
  bctx.fill()

  bctx.save()
  bctx.beginPath()
  bctx.arc(cx, cy, r, 0, Math.PI * 2)
  bctx.clip()

  MOON_TEXTURE.maria.forEach(m => {
    m.circles.forEach(circ => {
      bctx.beginPath()
      bctx.arc(cx + circ.dx * r, cy + circ.dy * r, circ.r * r, 0, Math.PI * 2)
      bctx.fillStyle = `rgba(52, 46, 36, ${m.alpha})`
      bctx.fill()
    })
  })

  MOON_TEXTURE.craters.forEach(cr => {
    drawCrater(bctx, cx + cr.u * r, cy + cr.v * r, cr.r * r, false)
  })

  MOON_TEXTURE.specks.forEach(sp => {
    bctx.beginPath()
    bctx.arc(cx + sp.u * r, cy + sp.v * r, sp.r * r, 0, Math.PI * 2)
    bctx.fillStyle = sp.dark ? 'rgba(28, 22, 16, 0.4)' : 'rgba(248, 244, 232, 0.22)'
    bctx.fill()
  })

  const limb = bctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r)
  limb.addColorStop(0, 'rgba(0, 0, 0, 0)')
  limb.addColorStop(1, 'rgba(0, 0, 0, 0.58)')
  bctx.beginPath()
  bctx.arc(cx, cy, r, 0, Math.PI * 2)
  bctx.fillStyle = limb
  bctx.fill()

  bctx.restore()

  bctx.beginPath()
  bctx.arc(cx, cy, r - 0.6, -Math.PI * 0.78, Math.PI * 0.12)
  bctx.strokeStyle = 'rgba(255, 252, 240, 0.55)'
  bctx.lineWidth = 1.8
  bctx.stroke()

  return { canvas: c, cx, cy }
}

function drawImpactEffects(ctx, moon, imp) {
  const px = moon.x + imp.u * moon.r
  const py = moon.y + imp.v * moon.r
  const craterR = imp.size * Math.min(1, imp.age / 10) * 0.8

  if (imp.age < 15) {
    const ft = imp.age / 15
    const fr = imp.size * (1 + ft * 4.5)
    const g = ctx.createRadialGradient(px, py, 0, px, py, fr)
    g.addColorStop(0,    `rgba(255, 255, 255, ${1 - ft})`)
    g.addColorStop(0.2,  `rgba(255, 245, 210, ${(1 - ft) * 0.9})`)
    g.addColorStop(0.5,  `rgba(255, 180, 60,  ${(1 - ft) * 0.6})`)
    g.addColorStop(0.8,  `rgba(255, 90,  25,  ${(1 - ft) * 0.3})`)
    g.addColorStop(1,    'rgba(200, 40, 0, 0)')
    ctx.beginPath()
    ctx.arc(px, py, fr, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
  }

  if (imp.age >= 1 && imp.age < 26) {
    const st = (imp.age - 1) / 25
    const sr = imp.size * (0.6 + st * 9)
    const alpha = (1 - st) * 0.55
    ctx.beginPath()
    ctx.arc(px, py, sr, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 220, 160, ${alpha})`
    ctx.lineWidth = 1.5 + st * 0.8
    ctx.stroke()
  }

  if (imp.age >= 3 && imp.age < 30) {
    const rt = (imp.age - 3) / 27
    const alpha = (1 - rt) * 0.7
    for (let i = 0; i < 16; i++) {
      const jitter = Math.sin(i * 7.3 + imp.seed) * 0.18
      const ang = (i / 16) * Math.PI * 2 + jitter
      const rayLen = imp.size * (1 + rt * 5) * (0.55 + hash(i + imp.seed) * 0.9)
      const x0 = px + Math.cos(ang) * craterR * 0.8
      const y0 = py + Math.sin(ang) * craterR * 0.8
      const x1 = px + Math.cos(ang) * rayLen
      const y1 = py + Math.sin(ang) * rayLen
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.strokeStyle = `rgba(255, 225, 185, ${alpha})`
      ctx.lineWidth = Math.max(0.4, 2 * (1 - rt))
      ctx.stroke()
    }
  }

  if (imp.age >= 5 && imp.age < 70) {
    const pt = (imp.age - 5) / 65
    const rise = pt * imp.size * 8
    const alpha = (1 - pt) * 0.32
    for (let i = 0; i < 8; i++) {
      const jitter = Math.sin(i * 3.7 + imp.seed) * imp.size * 1.5
      const puffY = py - rise * (0.3 + hash(i * 2 + imp.seed) * 1.0)
      const puffR = imp.size * (0.6 + pt * 1.6) * (0.5 + hash(i * 5 + imp.seed) * 0.7)
      ctx.beginPath()
      ctx.arc(px + jitter * (0.3 + pt * 1.2), puffY, puffR, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(165, 145, 125, ${alpha * 0.55})`
      ctx.fill()
    }
  }
}

function drawLockOn(ctx, cx, cy, r, t) {
  const alpha = 0.6 + Math.sin(t * 0.012) * 0.3
  const size = r * 0.35
  const offset = r + 12

  ctx.save()
  ctx.shadowColor = 'rgba(255, 221, 68, 0.75)'
  ctx.shadowBlur = 14
  ctx.strokeStyle = `rgba(255, 221, 68, ${alpha})`
  ctx.lineWidth = 2

  const corners = [
    [cx - offset, cy - offset,  1,  1],
    [cx + offset, cy - offset, -1,  1],
    [cx - offset, cy + offset,  1, -1],
    [cx + offset, cy + offset, -1, -1],
  ]
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath()
    ctx.moveTo(x, y + dy * size * 0.3)
    ctx.lineTo(x, y)
    ctx.lineTo(x + dx * size * 0.3, y)
    ctx.stroke()
  })

  ctx.beginPath()
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(255, 221, 68, ${alpha * 0.45})`
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
}

const s = {
  root: { minHeight: '100vh', background: '#02030f', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px 40px' },
  backBtn: { alignSelf: 'flex-start', marginTop: '20px', background: 'transparent', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' },
  menuBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', maxWidth: '520px', width: '100%', marginTop: '24px' },
  icon: { fontSize: '3.5rem' },
  title: { color: '#fff', fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontFamily: 'Georgia, serif', fontWeight: 300, margin: 0, textAlign: 'center' },
  subtitle: { color: 'rgba(160,185,255,0.6)', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.6, margin: 0, maxWidth: '440px' },
  rulesBox: { width: '100%', background: 'rgba(8,12,40,0.6)', border: '1px solid rgba(80,110,200,0.15)', borderRadius: '14px', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '10px' },
  rule: { color: 'rgba(180,200,255,0.7)', fontSize: '0.82rem', lineHeight: 1.5 },
  bestBox: { color: 'rgba(160,185,255,0.7)', fontSize: '0.85rem', background: 'rgba(80,110,200,0.1)', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(100,140,255,0.15)' },
  startBtn: { background: 'rgba(255,102,34,0.25)', border: '1px solid rgba(255,140,80,0.5)', color: '#ffaa88', padding: '14px 36px', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit', letterSpacing: '0.05em' },
  finalScore: { color: '#fff', fontSize: 'clamp(3rem,8vw,4rem)', fontFamily: 'Georgia, serif', fontWeight: 300, lineHeight: 1, textShadow: '0 0 40px rgba(255,170,80,0.5)' },
  statBox: { width: '100%', background: 'rgba(8,12,40,0.6)', border: '1px solid rgba(80,110,200,0.15)', borderRadius: '14px', padding: '16px 20px' },
  statRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', color: 'rgba(180,200,255,0.7)', fontSize: '0.85rem', borderBottom: '1px solid rgba(80,110,200,0.08)' },
}