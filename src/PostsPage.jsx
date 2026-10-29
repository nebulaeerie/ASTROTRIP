import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabaseClient'
import { LANGUAGES } from './languages'

const META = {
  article:  { label: 'Articles',  eyebrow: 'From the Observatory',  empty: 'No articles published yet.' },
  research: { label: 'Research',  eyebrow: 'Scientific Findings',   empty: 'No research published yet.' },
}

/* ------------------------------------------------------------------ */
/*  WIDGET: Green aliens falling on modal open                        */
/* ------------------------------------------------------------------ */

function AlienSvg({ hue = 0 }) {
  const body = `hsl(${118 + hue}, 72%, 52%)`
  const stroke = `hsl(${130 + hue}, 35%, 20%)`
  return (
    <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style={{ display: 'block' }}>
      <line x1="38" y1="26" x2="28" y2="8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="62" y1="26" x2="72" y2="8" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="28" cy="8" r="3.5" fill={body} stroke={stroke} strokeWidth="1.5"/>
      <circle cx="72" cy="8" r="3.5" fill={body} stroke={stroke} strokeWidth="1.5"/>
      <path d="M32 76 Q22 84 20 98" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="20" cy="99" r="3" fill={body} stroke={stroke} strokeWidth="1.5"/>
      <path d="M68 76 Q78 68 84 56" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="84" cy="55" r="3" fill={body} stroke={stroke} strokeWidth="1.5"/>
      <path d="M40 98 L39 116" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M60 98 L61 116" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="38" cy="118" rx="5" ry="2.5" fill={body} stroke={stroke} strokeWidth="1.5"/>
      <ellipse cx="62" cy="118" rx="5" ry="2.5" fill={body} stroke={stroke} strokeWidth="1.5"/>
      <path d="M34 64 Q32 64 32 68 L30 98 Q30 102 34 102 L66 102 Q70 102 70 98 L68 68 Q68 64 66 64 Z" fill={body} stroke={stroke} strokeWidth="1.5"/>
      <ellipse cx="50" cy="44" rx="24" ry="20" fill={body} stroke={stroke} strokeWidth="1.5"/>
      <ellipse cx="40" cy="44" rx="7.5" ry="9" fill="#0a1a0a"/>
      <ellipse cx="60" cy="44" rx="7.5" ry="9" fill="#0a1a0a"/>
      <circle cx="42.5" cy="41" r="2.5" fill="#ffffff"/>
      <circle cx="62.5" cy="41" r="2.5" fill="#ffffff"/>
      <path d="M44 57 Q50 60 56 57" stroke={stroke} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function GreenAliensOverlay() {
  const [gone, setGone] = useState(false)
  const [fading, setFading] = useState(false)

  const [reduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const [aliens] = useState(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const count = isMobile ? 22 : 32
    return Array.from({ length: count }, (_, i) => {
      const size = (isMobile ? 20 : 28) + Math.random() * (isMobile ? 16 : 26)
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.4,
        duration: 1.8 + Math.random() * 1.2,
        size,
        sway: (Math.random() - 0.5) * 240,
        rotStart: (Math.random() - 0.5) * 30,
        rotEnd: (Math.random() - 0.5) * 60,
        flip: Math.random() > 0.5 ? 1 : -1,
        hue: Math.floor(Math.random() * 30) - 15,
      }
    })
  })

  useEffect(() => {
    if (reduced) { setGone(true); return }
    const fadeT = setTimeout(() => setFading(true), 4200)
    const goneT = setTimeout(() => setGone(true), 5200)
    return () => { clearTimeout(fadeT); clearTimeout(goneT) }
  }, [reduced])

  if (gone || reduced) return null

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 450, overflow: 'hidden', opacity: fading ? 0 : 1, transition: 'opacity 1s ease' }}>
      {aliens.map(a => (
        <div key={a.id} style={{ position: 'absolute', top: '-160px', left: `${a.left}%`, marginLeft: -a.size / 2, width: a.size, height: a.size * 1.4, transform: `scaleX(${a.flip})` }}>
          <div style={{ width: '100%', height: '100%', '--sway': `${a.sway}px`, '--rot-start': `${a.rotStart}deg`, '--rot-end': `${a.rotEnd}deg`, animation: `alienFall ${a.duration}s linear ${a.delay}s forwards` }}>
            <AlienSvg hue={a.hue} />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes alienFall {
          0%   { transform: translate(0, 0) rotate(var(--rot-start)); opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translate(var(--sway), 120vh) rotate(var(--rot-end)); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  WIDGET: Build-the-green color mixer                               */
/* ------------------------------------------------------------------ */

function ColorMixerWidget() {
  const [sodium, setSodium] = useState(false)
  const [calcium, setCalcium] = useState(false)

  const color =
    sodium && calcium ? '#5fce54' :
    sodium ? '#d8d06a' :
    calcium ? '#d99b8a' :
    '#ffb070'

  const label =
    sodium && calcium ? 'Green: both absorbers are active' :
    sodium ? 'Yellow-green: sodium is active' :
    calcium ? 'Muted warm: calcium is active' :
    'Warm orange — temperature alone'

  const ToggleButton = ({ active, onClick, children }) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        background: active ? 'rgba(100,140,255,0.25)' : 'rgba(80,110,200,0.1)',
        border: `1px solid ${active ? 'rgba(140,180,255,0.7)' : 'rgba(100,140,255,0.25)'}`,
        color: active ? '#e0ecff' : 'rgba(200,220,255,0.75)',
        padding: '8px 14px',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.82rem',
        fontFamily: 'inherit',
        transition: 'all 0.25s',
        textAlign: 'left',
      }}
    >
      {active ? '✓ ' : '○ '}{children}
    </button>
  )

  return (
    <div style={{
      border: '1px solid rgba(100,140,255,0.2)',
      borderRadius: '16px',
      padding: '20px',
      margin: '28px 0',
      background: 'rgba(8,12,40,0.6)',
    }}>
      <div style={{
        fontSize: '0.7rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'rgba(120,160,255,0.6)',
        marginBottom: '10px',
      }}>
        Interactive · Simulated Color
      </div>

      <h3 style={{
        margin: '0 0 16px',
        color: '#e8f0ff',
        fontSize: '1.15rem',
        fontFamily: 'Georgia, serif',
        fontWeight: 400,
      }}>
        Build the green here
      </h3>

      <div
        aria-hidden="true"
        style={{
          width: '100%',
          height: '110px',
          borderRadius: '12px',
          background: color,
          transition: 'background 0.6s ease, box-shadow 0.6s ease',
          boxShadow: `0 0 40px ${color}55`,
          marginBottom: '16px',
        }}
      />

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <ToggleButton active={sodium} onClick={() => setSodium(s => !s)}>
          Sodium absorbs orange-yellow
        </ToggleButton>
        <ToggleButton active={calcium} onClick={() => setCalcium(c => !c)}>
          Calcium absorbs violet
        </ToggleButton>
      </div>

      <div style={{
        fontSize: '0.85rem',
        color: 'rgba(200,215,255,0.85)',
        marginBottom: '10px',
      }}>
        {label}
      </div>

      <p style={{
        fontSize: '0.72rem',
        color: 'rgba(150,180,255,0.55)',
        margin: 0,
        fontStyle: 'italic',
        lineHeight: 1.6,
      }}>
       This is a simulated human-eye color. Toggle both absorbers to see why a
        white dwarf like WD J1330+6435 would look green to the eye.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  WIDGET: Cosmic crime scene                                        */
/* ------------------------------------------------------------------ */

function CrimeSceneWidget() {
  const [stage, setStage] = useState(0)
  const [autoPlayed, setAutoPlayed] = useState(false)
  const [playKey, setPlayKey] = useState(0)
  const timersRef = useRef([])
  const ref = useRef(null)

  const [reduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const [debris] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      startX: 250 + Math.random() * 90,
      startY: 30 + Math.random() * 160,
      endX: 80 + (Math.random() * 40 - 20),
      endY: 110 + (Math.random() * 40 - 20),
      r: 1.8 + Math.random() * 1.6,
      fill: ['#a8c0ff', '#7fa0e0', '#d8e4ff'][i % 3],
    }))
  )

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  const play = () => {
    clearTimers()
    setStage(0)
    setPlayKey(k => k + 1)
    timersRef.current.push(setTimeout(() => setStage(1), 1400))
    timersRef.current.push(setTimeout(() => setStage(2), 3000))
  }

  const jumpTo = (s) => {
    clearTimers()
    setStage(s)
  }

  useEffect(() => {
    if (reduced) { setStage(2); return }
    if (autoPlayed) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAutoPlayed(true)
          play()
          io.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [autoPlayed, reduced])

  useEffect(() => () => clearTimers(), [])

  const stageLabel = [
    'A rocky body drifts too close',
    'Gravity shreds it into debris',
    'Debris falls onto the white dwarf',
  ][stage]

  return (
    <div
      ref={ref}
      style={{
        border: '1px solid rgba(100,140,255,0.2)',
        borderRadius: '16px',
        padding: '16px',
        margin: '28px 0',
        background: 'rgba(8,12,40,0.6)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        gap: '10px',
      }}>
        <div style={{
          fontSize: '0.7rem',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(120,160,255,0.6)',
        }}>
          The cosmic crime scene
        </div>
        {!reduced && (
          <button
            type="button"
            onClick={play}
            style={{
              background: 'rgba(80,110,200,0.15)',
              border: '1px solid rgba(100,140,255,0.3)',
              color: 'rgba(200,220,255,0.9)',
              padding: '4px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontFamily: 'inherit',
            }}
          >
            ↻ Replay
          </button>
        )}
      </div>

      <svg key={playKey} viewBox="0 0 400 220" style={{ width: '100%', height: 'auto', display: 'block' }} aria-hidden="true">
        <defs>
          <radialGradient id="wd-glow">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#c8d8ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c8d8ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx="80" cy="110" r="70" fill="url(#wd-glow)" style={{ opacity: stage >= 2 ? 0.95 : 0.5, transition: 'opacity 0.9s ease' }} />
        <circle cx="80" cy="110" r="10" fill="#f0f4ff" />

        <ellipse cx="80" cy="110" rx="220" ry="120" fill="none" stroke="rgba(100,140,255,0.18)" strokeDasharray="3 6" style={{ opacity: stage === 0 ? 1 : 0.25, transition: 'opacity 0.8s' }} />

        <g style={{ opacity: stage === 0 ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          <circle cx="290" cy="110" r="14" fill="#5a8de8" />
          <circle cx="285" cy="105" r="4" fill="#7fb0ff" opacity="0.7" />
        </g>

        <g style={{ opacity: stage >= 1 ? 1 : 0, transition: 'opacity 0.6s ease' }}>
          {debris.map(d => {
            const x = stage >= 2 ? d.endX : d.startX
            const y = stage >= 2 ? d.endY : d.startY
            return (
              <circle
                key={d.id}
                r={d.r}
                fill={d.fill}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transition: 'transform 1.5s cubic-bezier(.4,.1,.6,.9)',
                }}
              />
            )
          })}
        </g>
      </svg>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '10px',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '0.82rem', color: 'rgba(200,215,255,0.85)' }}>{stageLabel}</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <button
              key={i}
              type="button"
              onClick={() => jumpTo(i)}
              aria-label={`Jump to stage ${i + 1}`}
              aria-pressed={stage === i}
              style={{
                width: '32px',
                height: '6px',
                borderRadius: '3px',
                background: i <= stage ? 'rgba(120,160,255,0.9)' : 'rgba(120,160,255,0.2)',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'background 0.4s',
              }}
            />
          ))}
        </div>
      </div>

      <p style={{
        fontSize: '0.72rem',
        color: 'rgba(150,180,255,0.55)',
        margin: '12px 0 0',
        fontStyle: 'italic',
        lineHeight: 1.6,
      }}>
        A rocky body is torn apart by the white dwarf's gravity; then the debris accretes onto the star,
        carrying calcium, sodium, and lithium into its atmosphere.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Existing components                                               */
/* ------------------------------------------------------------------ */

function PostCard({ post, lang, onClick }) {
  const t = post.translations?.[lang.code] || post.translations?.en || {}
  const title = t.title || 'Untitled'
  const excerpt = (t.excerpt || t.body || '').slice(0, 180)
  const date = new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <article
      onClick={() => onClick(post)}
      style={{ background: 'rgba(8,12,40,0.7)', border: '1px solid rgba(80,110,200,0.15)', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s', direction: lang.dir, display: 'flex',
    flexDirection: 'column',
    height: '100%' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(120,160,255,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(80,110,200,0.15)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {post.cover_image && (
        <div style={{ width: '100%', background: 'rgba(0,0,0,0.2)', aspectRatio: '1 / 1', overflow: 'hidden' }}>
          <img src={post.cover_image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}
      <div style={{ padding: '24px', display: 'flex',
flexDirection: 'column',
flex: 1 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: post.series ? 'linear-gradient(135deg, rgba(100,140,255,0.28), rgba(60,90,200,0.14))' : 'linear-gradient(135deg, rgba(100,140,255,0.20), rgba(60,90,200,0.10))', border: `1px solid ${post.series ? 'rgba(140,180,255,0.45)' : 'rgba(130,170,255,0.42)'}`, color: post.series ? '#d8e4ff' : '#d0deff', fontSize: '0.68rem', letterSpacing: '0.06em', padding: '4px 10px', borderRadius: '20px', boxShadow: post.series ? '0 0 10px rgba(100,140,255,0.18)' : '0 0 10px rgba(100,140,255,0.18)' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: post.series ? '#aac4ff' : '#aac4ff', boxShadow: post.series ? '0 0 6px #aac4ff' : '0 0 6px #aac4ff', flexShrink: 0 }} />
            <span>{post.series ? `${post.series}${post.part_number ? ` · Part ${post.part_number}` : ''}` : 'White Dwarfs'}</span>
          </div>
          <time style={{ color: 'rgba(120,160,255,0.5)', fontSize: '0.68rem', letterSpacing: '0.1em' }}>{date}</time>
        </div>
        <h2 style={{ color: '#e8f0ff', fontSize: '1.25rem', fontFamily: 'Georgia, serif', fontWeight: 400, margin: '0 0 12px', lineHeight: 1.3 }}>{title}</h2>
        {excerpt && <p style={{ color: 'rgba(170,190,240,0.65)', fontSize: '0.85rem', lineHeight: 1.7, margin: '0 0 16px' }}>{excerpt}{excerpt.length >= 180 ? '…' : ''}</p>}
        <span style={{ color: 'rgba(120,160,255,0.7)', fontSize: '0.8rem', marginTop: 'auto', paddingTop: '8px', display: 'inline-block' }}>Read →</span>
      </div>
    </article>
  )
}

function renderArticleParts(body) {
  const regex = /\{\{WIDGET:([a-z0-9-]+)\}\}/g
  const parts = []
  let lastIndex = 0
  let m
  while ((m = regex.exec(body)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ type: 'html', content: body.slice(lastIndex, m.index) })
    }
    parts.push({ type: 'widget', name: m[1] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < body.length) {
    parts.push({ type: 'html', content: body.slice(lastIndex) })
  }
  return parts
}

function WidgetByName({ name }) {
  if (name === 'color-mixer') return <ColorMixerWidget />
  if (name === 'crime-scene') return <CrimeSceneWidget />
  return null
}

function PostModal({ post, lang, onClose, posts, onNavigate }) {
  const t = post.translations?.[lang.code] || post.translations?.en || {}
  const title = t.title || 'Untitled'
  const excerpt = t.excerpt || ''
  const body = t.body || ''
  const date = new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const seriesSiblings = post.series
    ? posts.filter(p => p.series === post.series).sort((a, b) => (a.part_number || 0) - (b.part_number || 0))
    : []
  const idx = seriesSiblings.findIndex(p => p.id === post.id)
  const prevPost = idx > 0 ? seriesSiblings[idx - 1] : null
  const nextPost = idx >= 0 && idx < seriesSiblings.length - 1 ? seriesSiblings[idx + 1] : null

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,10,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 'clamp(16px,6vw,48px) clamp(8px,3vw,24px)' }}>
     {body.includes('{{WIDGET:color-mixer}}') && <GreenAliensOverlay />}
      <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(4,6,26,0.98)', border: '1px solid rgba(100,140,255,0.2)', borderRadius: '20px', maxWidth: '1100px', width: '100%', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,60,0.7)', overflow: 'hidden', direction: lang.dir }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(80,110,200,0.15)', border: '1px solid rgba(100,140,255,0.2)', color: 'rgba(200,220,255,0.7)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem', zIndex: 10 }}>✕</button>
        {post.cover_image && (
          <img src={post.cover_image} alt={title} style={{ width: '100%', maxWidth: '850px', height: 'auto', display: 'block', margin: '0 auto' }} />
        )}
        <div style={{ padding: 'clamp(20px,5vw,40px) clamp(16px,5vw,48px) clamp(28px,7vw,56px)' }}>
          {post.series && (
            <div style={{ display: 'inline-block', background: 'rgba(100,140,255,0.15)', border: '1px solid rgba(100,140,255,0.3)', color: '#aac4ff', fontSize: '0.72rem', letterSpacing: '0.06em', padding: '4px 12px', borderRadius: '20px', marginBottom: '14px' }}>
              {post.series}{post.part_number ? ` · Part ${post.part_number} of ${seriesSiblings.length}` : ''}
            </div>
          )}
          <time style={{ color: 'rgba(120,160,255,0.5)', fontSize: '0.72rem', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>{date}</time>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontFamily: 'Georgia, serif', fontWeight: 300, margin: '0 0 32px', lineHeight: 1.2 }}>{title}</h1>

          {excerpt && (
            <p style={{ color: 'rgba(170,190,240,0.7)', fontSize: '1.05rem', lineHeight: 1.7, fontStyle: 'italic', margin: '-16px 0 32px' }}>
              {excerpt}
            </p>
          )}

          <div style={{ color: 'rgba(190,210,255,0.85)', fontSize: '1rem', lineHeight: 1.85 }}>
            {renderArticleParts(body).map((part, i) =>
              part.type === 'html' ? (
                <div key={i} dangerouslySetInnerHTML={{ __html: part.content.replace(/\n/g, '<br/>') }} />
              ) : (
                <WidgetByName key={i} name={part.name} />
              )
            )}
          </div>

          {(prevPost || nextPost) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(80,110,200,0.15)' }}>
              {prevPost ? (
                <button onClick={() => onNavigate(prevPost)} style={{ background: 'rgba(80,110,200,0.1)', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(200,220,255,0.85)', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit', textAlign: 'left' }}>
                  ← Part {prevPost.part_number}
                </button>
              ) : <span />}
              {nextPost ? (
                <button onClick={() => onNavigate(nextPost)} style={{ background: 'rgba(80,110,200,0.1)', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(200,220,255,0.85)', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit', textAlign: 'right' }}>
                  Part {nextPost.part_number} →
                </button>
              ) : <span />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PostsPage({ type, onBack }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState(LANGUAGES[0])
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [selected, setSelected] = useState(null)
  const meta = META[type] || META.article

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('type', type)
        .eq('published', true)
        .order('created_at', { ascending: false })
      if (!error) setPosts(data || [])
      setLoading(false)
    }
    load()
  }, [type])

  return (
    <div style={{ minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', rowGap: '8px', padding: '14px clamp(14px,4vw,48px)', background: 'rgba(2,3,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(80,110,200,0.12)' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}>← Solar System</button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowLangMenu(s => !s)} style={{ background: 'rgba(80,110,200,0.1)', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(200,220,255,0.85)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit', minWidth: '140px', textAlign: 'left' }}>
            {lang.name} ▾
          </button>
          {showLangMenu && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'rgba(4,6,26,0.98)', border: '1px solid rgba(100,140,255,0.2)', borderRadius: '12px', padding: '8px', zIndex: 200, maxHeight: 'none', overflowY: 'auto', minWidth: '180px', boxShadow: '0 16px 48px rgba(0,0,60,0.6)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => { setLang(l); setShowLangMenu(false) }}
                  style={{ background: l.code === lang.code ? 'rgba(100,140,255,0.2)' : 'transparent', border: 'none', color: l.code === lang.code ? '#c8d8ff' : 'rgba(180,200,255,0.7)', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left', fontFamily: 'inherit' }}>
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div style={{ textAlign: 'center', padding: 'clamp(48px,10vw,80px) clamp(16px,4vw,48px) 48px' }}>
        <div style={{ color: 'rgba(120,160,255,0.6)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>{meta.eyebrow}</div>
        <h1 style={{ color: '#fff', fontSize: 'clamp(2.5rem,6vw,5rem)', fontFamily: 'Georgia, serif', fontWeight: 300, letterSpacing: '0.06em', margin: '0 0 24px' }}>{meta.label}</h1>
        <div style={{ width: '48px', height: '1px', background: 'linear-gradient(to right, transparent, rgba(120,160,255,0.5), transparent)', margin: '0 auto' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px,100%), 1fr))', gap: '20px', padding: '0 clamp(16px,4vw,48px) 48px', maxWidth: '1280px', margin: '0 auto' }}>
        {loading && [1,2,3].map(i => <div key={i} style={{ height: '240px', borderRadius: '16px', background: 'rgba(20,30,80,0.4)' }} />)}
        {!loading && posts.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'rgba(150,180,255,0.35)', padding: '80px 0' }}>{meta.empty}</div>}
        {!loading && posts.map(post => <PostCard key={post.id} post={post} lang={lang} onClick={setSelected} />)}
      </div>

      {selected && <PostModal post={selected} lang={lang} onClose={() => setSelected(null)} posts={posts} onNavigate={setSelected} />}
    </div>
  )
}