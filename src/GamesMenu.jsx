import AstroBrain from './AstroBrain'
import AstroGuess from './AstroGuess'
import AstroBuild from './AstroBuild'
import AstroDive from './AstroDive'
import { useState } from 'react'

const GAMES = [
  {
    id: 'brain',
    name: 'Astro Brain',
    icon: '🧠',
    desc: 'Test your astronomy knowledge. 5 questions, 1 minute, how high can you score?',
    color: '#4466ff',
    glow: 'rgba(68,102,255,0.3)',
  },
  {
    id: 'guess',
    name: 'Astro Guess',
    icon: '🔭',
    desc: 'Read the clues. Guess the planet. The fewer clues you need, the higher your score.',
    color: '#ff6622',
    glow: 'rgba(255,102,34,0.3)',
  },
  {
    id: 'build',
    name: 'Astro Build',
    icon: '🪐',
    desc: 'Design your own planet. Customize its properties and find out if life could exist on it.',
    color: '#22cc88',
    glow: 'rgba(34,204,136,0.3)',
  },
  {
    id: 'dive',
    name: 'Astro Dive',
    icon: '🚀',
    desc: 'Fly through the solar system. Choose top-down or first-person. Collect stars, dodge asteroids.',
    color: '#cc44ff',
    glow: 'rgba(204,68,255,0.3)',
  },
]

export default function GamesMenu({ onBack }) {
  const [active, setActive] = useState(null)

  if (active === 'brain') return <AstroBrain onBack={() => setActive(null)} />
  if (active === 'guess') return <AstroGuess onBack={() => setActive(null)} />
  if (active === 'build') return <AstroBuild onBack={() => setActive(null)} />
  if (active === 'dive')  return <AstroDive  onBack={() => setActive(null)} />

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <header style={s.header}>
        <button style={s.backBtn} onClick={onBack}>← Solar System</button>
        <h1 style={s.title}>Game Center</h1>
        <div style={{ width: 120 }} />
      </header>
      <div style={s.eyebrow}>Choose your challenge</div>
      <div style={s.grid}>
        {GAMES.map(g => (
          <button key={g.id} style={{ ...s.card, '--glow': g.glow, '--accent': g.color }} onClick={() => setActive(g.id)}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 16px 48px ${g.glow}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,40,0.4)' }}
          >
            <div style={{ ...s.cardIcon, background: `radial-gradient(circle, ${g.glow} 0%, transparent 70%)` }}>{g.icon}</div>
            <div style={{ ...s.cardName, color: g.color }}>{g.name}</div>
            <div style={s.cardDesc}>{g.desc}</div>
            <div style={{ ...s.cardPlay, borderColor: g.color, color: g.color }}>Play →</div>
          </button>
        ))}
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#02030f', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  bg: { position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 30% 40%, rgba(30,40,120,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(80,20,120,0.08) 0%, transparent 50%)', pointerEvents: 'none' },
  header: { position: 'sticky', top: 0, zIndex: 10, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', background: 'rgba(2,3,15,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(80,110,200,0.12)' },
  backBtn: { background: 'transparent', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' },
  title: { color: '#fff', fontSize: '1.2rem', fontFamily: 'Georgia, serif', fontWeight: 300, letterSpacing: '0.15em', margin: 0 },
  eyebrow: { color: 'rgba(120,160,255,0.5)', fontSize: '0.75rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '60px', marginBottom: '40px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', padding: '0 40px 60px', maxWidth: '1100px', width: '100%' },
  card: { background: 'rgba(8,12,40,0.8)', border: '1px solid rgba(80,110,200,0.15)', borderRadius: '20px', padding: '36px 28px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 4px 24px rgba(0,0,40,0.4)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: '14px' },
  cardIcon: { fontSize: '2.5rem', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: '1.3rem', fontFamily: 'Georgia, serif', fontWeight: 400, letterSpacing: '0.04em' },
  cardDesc: { color: 'rgba(170,190,240,0.7)', fontSize: '0.85rem', lineHeight: 1.65 },
  cardPlay: { display: 'inline-block', border: '1px solid', padding: '8px 18px', borderRadius: '8px', fontSize: '0.82rem', marginTop: '8px', width: 'fit-content', letterSpacing: '0.05em' },
}
