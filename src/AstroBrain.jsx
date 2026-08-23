import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'

const TOTAL_TIME = 60
const QUESTIONS_PER_ROUND = 5

function getHighScores() {
  try { return JSON.parse(localStorage.getItem('astroBrainScores') || '[]') } catch { return [] }
}
function saveHighScore(score) {
  const scores = getHighScores()
  scores.push({ score, date: new Date().toLocaleDateString() })
  scores.sort((a, b) => b.score - a.score)
  const top10 = scores.slice(0, 10)
  localStorage.setItem('astroBrainScores', JSON.stringify(top10))
  return top10
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function AstroBrain({ onBack }) {
  const [phase, setPhase] = useState('menu') // menu | loading | playing | result
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME)
  const [results, setResults] = useState([])
  const [highScores, setHighScores] = useState(getHighScores())
  const [error, setError] = useState(null)
  const timerRef = useRef(null)
  const scoreRef = useRef(0)

  const endGame = useCallback((finalScore) => {
    clearInterval(timerRef.current)
    const updated = saveHighScore(finalScore)
    setHighScores(updated)
    setPhase('result')
  }, [])

  const startGame = async () => {
    setPhase('loading')
    setError(null)
    const { data, error: err } = await supabase
      .from('quiz_questions')
      .select('*')
    if (err || !data || data.length === 0) {
      setError('Could not load questions. Check your Supabase connection.')
      setPhase('menu')
      return
    }
    const picked = shuffle(data).slice(0, QUESTIONS_PER_ROUND)
    setQuestions(picked)
    setCurrent(0)
    setSelected(null)
    setAnswered(false)
    setScore(0)
    scoreRef.current = 0
    setResults([])
    setTimeLeft(TOTAL_TIME)
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing') return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { endGame(scoreRef.current); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [phase, endGame])

  function handleAnswer(optionIndex) {
    if (answered) return
    setSelected(optionIndex)
    setAnswered(true)
    const q = questions[current]
    const correct = optionIndex === q.correct_index
    const points = correct ? Math.ceil((timeLeft / TOTAL_TIME) * 100) + 50 : 0
    const newScore = scoreRef.current + points
    scoreRef.current = newScore
    setScore(newScore)
    setResults(r => [...r, { question: q.question, correct, chosen: q.options[optionIndex], answer: q.options[q.correct_index] }])
    setTimeout(() => {
      if (current + 1 >= QUESTIONS_PER_ROUND) { endGame(newScore) }
      else { setCurrent(c => c + 1); setSelected(null); setAnswered(false) }
    }, 1400)
  }

  const timerPct = (timeLeft / TOTAL_TIME) * 100
  const timerColor = timeLeft > 30 ? '#22cc88' : timeLeft > 15 ? '#ffaa22' : '#ff4444'

  if (phase === 'loading') return (
    <div style={s.center}>
      <div style={s.loadText}>Loading questions...</div>
    </div>
  )

  if (phase === 'menu') return (
    <div style={s.root}>
      <button style={s.backBtn} onClick={onBack}>← Games</button>
      <div style={s.menuBox}>
        <div style={s.gameIcon}>🧠</div>
        <h1 style={s.gameTitle}>Astro Brain</h1>
        <p style={s.gameSubtitle}>5 questions · 60 seconds · Score based on speed and accuracy</p>
        {error && <div style={s.error}>{error}</div>}
        <button style={s.startBtn} onClick={startGame}>Start Game</button>
        {highScores.length > 0 && (
          <div style={s.scoresBox}>
            <div style={s.scoresTitle}>🏆 High Scores</div>
            {highScores.slice(0, 5).map((hs, i) => (
              <div key={i} style={s.scoreRow}>
                <span style={s.scoreRank}>#{i + 1}</span>
                <span style={s.scoreVal}>{hs.score} pts</span>
                <span style={s.scoreDate}>{hs.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  if (phase === 'result') return (
    <div style={s.root}>
      <button style={s.backBtn} onClick={onBack}>← Games</button>
      <div style={s.menuBox}>
        <div style={s.gameIcon}>🏆</div>
        <h1 style={s.gameTitle}>Round Complete</h1>
        <div style={s.finalScore}>{score} <span style={s.pts}>pts</span></div>
        <div style={s.resultsGrid}>
          {results.map((r, i) => (
            <div key={i} style={{ ...s.resultRow, borderColor: r.correct ? 'rgba(34,204,136,0.3)' : 'rgba(255,68,68,0.3)' }}>
              <div style={s.resultIcon}>{r.correct ? '✓' : '✗'}</div>
              <div>
                <div style={s.resultQ}>{r.question}</div>
                {!r.correct && <div style={s.resultA}>Answer: {r.answer}</div>}
              </div>
            </div>
          ))}
        </div>
        <div style={s.btnRow}>
          <button style={s.startBtn} onClick={startGame}>Play Again</button>
          <button style={{ ...s.startBtn, background: 'transparent', borderColor: 'rgba(100,140,255,0.3)', color: '#99bbff' }} onClick={onBack}>← Games</button>
        </div>
      </div>
    </div>
  )

  const q = questions[current]
  const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options

  return (
    <div style={s.root}>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => { clearInterval(timerRef.current); setPhase('menu') }}>✕</button>
        <div style={s.topInfo}>
          <span style={s.qCount}>Q {current + 1} / {QUESTIONS_PER_ROUND}</span>
          <span style={s.scorePill}>⭐ {score}</span>
        </div>
        <div style={{ ...s.timerPill, color: timerColor, borderColor: timerColor }}>
          {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
        </div>
      </div>
      <div style={s.timerBar}>
        <div style={{ ...s.timerFill, width: `${timerPct}%`, background: timerColor }} />
      </div>
      <div style={s.questionBox}>
        <div style={s.questionText}>{q.question}</div>
        <div style={s.optionsGrid}>
          {opts.map((opt, i) => {
            let bg = 'rgba(8,12,40,0.8)'
            let border = 'rgba(80,110,200,0.2)'
            let color = 'rgba(200,220,255,0.85)'
            if (answered) {
              if (i === q.correct_index) { bg = 'rgba(34,204,136,0.15)'; border = '#22cc88'; color = '#22cc88' }
              else if (i === selected) { bg = 'rgba(255,68,68,0.15)'; border = '#ff4444'; color = '#ff4444' }
            } else if (selected === i) { bg = 'rgba(100,140,255,0.15)'; border = '#6699ff' }
            return (
              <button key={i} disabled={answered} onClick={() => handleAnswer(i)}
                style={{ background: bg, border: `1px solid ${border}`, color, borderRadius: '12px', padding: '16px 20px', fontSize: '0.9rem', cursor: answered ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.25s', fontFamily: 'inherit', lineHeight: 1.4 }}>
                <span style={{ opacity: 0.5, marginRight: '10px' }}>{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#02030f', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px 60px' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#02030f', color: 'rgba(180,200,255,0.6)', fontFamily: 'Inter, sans-serif' },
  loadText: { fontSize: '1rem', letterSpacing: '0.1em' },
  backBtn: { alignSelf: 'flex-start', marginTop: '24px', background: 'transparent', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' },
  menuBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '520px', width: '100%', marginTop: '40px' },
  gameIcon: { fontSize: '4rem' },
  gameTitle: { color: '#fff', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontFamily: 'Georgia, serif', fontWeight: 300, margin: 0, textAlign: 'center' },
  gameSubtitle: { color: 'rgba(160,185,255,0.6)', fontSize: '0.88rem', textAlign: 'center', lineHeight: 1.6, margin: 0 },
  error: { color: '#ff6666', fontSize: '0.85rem', background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '8px', padding: '12px 16px', textAlign: 'center' },
  startBtn: { background: 'rgba(68,102,255,0.2)', border: '1px solid rgba(68,102,255,0.5)', color: '#aabbff', padding: '14px 40px', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit', letterSpacing: '0.06em', transition: 'all 0.2s' },
  scoresBox: { width: '100%', background: 'rgba(8,12,40,0.6)', border: '1px solid rgba(80,110,200,0.15)', borderRadius: '14px', padding: '20px 24px' },
  scoresTitle: { color: '#aac4ff', fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '14px' },
  scoreRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(80,110,200,0.08)' },
  scoreRank: { color: 'rgba(120,160,255,0.5)', fontSize: '0.8rem', width: '28px' },
  scoreVal: { color: '#ddeaff', fontSize: '0.9rem', fontWeight: 500 },
  scoreDate: { color: 'rgba(120,160,255,0.4)', fontSize: '0.75rem' },
  finalScore: { color: '#fff', fontSize: '4rem', fontFamily: 'Georgia, serif', fontWeight: 300, lineHeight: 1 },
  pts: { fontSize: '1.5rem', color: 'rgba(160,185,255,0.5)' },
  resultsGrid: { width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' },
  resultRow: { display: 'flex', gap: '14px', alignItems: 'flex-start', background: 'rgba(8,12,40,0.6)', border: '1px solid', borderRadius: '10px', padding: '14px 16px' },
  resultIcon: { fontSize: '1rem', marginTop: '2px', flexShrink: 0 },
  resultQ: { color: 'rgba(200,220,255,0.8)', fontSize: '0.85rem', lineHeight: 1.5 },
  resultA: { color: '#22cc88', fontSize: '0.8rem', marginTop: '4px' },
  btnRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' },
  topBar: { width: '100%', maxWidth: '640px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 12px' },
  topInfo: { display: 'flex', gap: '12px', alignItems: 'center' },
  qCount: { color: 'rgba(160,185,255,0.5)', fontSize: '0.8rem', letterSpacing: '0.08em' },
  scorePill: { color: '#ddeaff', fontSize: '0.85rem', background: 'rgba(80,110,200,0.15)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(100,140,255,0.2)' },
  timerPill: { fontSize: '0.9rem', fontWeight: 500, border: '1px solid', padding: '4px 12px', borderRadius: '20px', fontFamily: 'monospace', minWidth: '64px', textAlign: 'center' },
  timerBar: { width: '100%', maxWidth: '640px', height: '3px', background: 'rgba(80,110,200,0.15)', borderRadius: '2px', marginBottom: '32px' },
  timerFill: { height: '100%', borderRadius: '2px', transition: 'width 1s linear, background 0.5s' },
  questionBox: { width: '100%', maxWidth: '640px' },
  questionText: { color: '#fff', fontSize: 'clamp(1rem,2.5vw,1.3rem)', fontFamily: 'Georgia, serif', fontWeight: 400, lineHeight: 1.5, marginBottom: '28px', textAlign: 'center' },
  optionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
}
