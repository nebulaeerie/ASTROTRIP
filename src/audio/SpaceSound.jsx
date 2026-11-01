import { useState } from 'react'
import useSpaceAudio from './useSpaceAudio'
import CommentSection from '../CommentSection'

const SPACE_TRACKS = [
  {
    id: 'apollo-11',
    title: 'Apollo 11 · One Small Step',
    source: 'NASA · Internet Archive',
    url: 'https://archive.org/download/NasaAudioHighlightReels/REPLACE-WITH-REAL-FILENAME.mp3',
  },
  {
    id: 'skylab',
    title: 'Skylab Audio Highlights',
    source: 'NASA · Internet Archive',
    url: 'https://archive.org/download/NasaAudioHighlightReels/REPLACE-WITH-REAL-FILENAME.mp3',
  },
  {
    id: 'shuttle-launch',
    title: 'Space Shuttle Launch',
    source: 'NASA · Internet Archive',
    url: 'https://archive.org/download/NasaAudioHighlightReels/REPLACE-WITH-REAL-FILENAME.mp3',
  },
]

export default function SpaceSound() {
  const audio = useSpaceAudio()
  const [open, setOpen] = useState(false)

  const label = !audio.unlocked
    ? 'Tap for sound'
    : audio.muted
      ? 'Sound off'
      : audio.currentTrack
        ? 'Live Sound · playing'
        : 'Live Sound'

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={pillStyle}
      >
        <Equalizer active={audio.unlocked && !audio.muted} />
        <span>{label}</span>
      </button>

      {open && (
        <Panel audio={audio} tracks={SPACE_TRACKS} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

const pillStyle = {
  position: 'fixed',
  bottom: 22,
  right: 22,
  zIndex: 60,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '9px 18px',
  borderRadius: 999,
  background: 'rgba(4, 6, 26, 0.72)',
  border: '1px solid rgba(100, 140, 255, 0.3)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 0 24px rgba(100, 140, 255, 0.18)',
  color: 'rgba(210, 225, 255, 0.85)',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '0.78rem',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

function Equalizer({ active }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 14 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 2.5,
            borderRadius: 2,
            background: active ? '#88bbff' : 'rgba(136, 187, 255, 0.3)',
            boxShadow: active ? '0 0 6px #88bbff' : 'none',
            animation: active ? `eq 0.9s ease-in-out ${i * 0.15}s infinite alternate` : 'none',
            height: active ? undefined : 4,
          }}
        />
      ))}
      <style>{`
        @keyframes eq {
          0%   { height: 4px;  opacity: 0.6; }
          100% { height: 14px; opacity: 1;   }
        }
      `}</style>
    </span>
  )
}

function Panel({ audio, tracks, onClose }) {
  const [commentsOpen, setCommentsOpen] = useState(false)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(2, 3, 15, 0.7)',
        backdropFilter: 'blur(14px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 16px 90px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '70vh',
          overflowY: 'auto',
          background: 'rgba(4, 6, 26, 0.98)',
          border: '1px solid rgba(100, 140, 255, 0.22)',
          borderRadius: 20,
          padding: '22px 20px 26px',
          boxShadow: '0 24px 80px rgba(0, 0, 60, 0.7)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ color: 'rgba(120, 160, 255, 0.55)', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>
              Sound Library
            </div>
            <div style={{ color: '#fff', fontFamily: 'Georgia, serif', fontSize: '1.15rem' }}>
              Sounds of space
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCommentsOpen(o => !o)} style={smallBtn}>
              💬 {commentsOpen ? 'Hide' : 'Comments'}
            </button>
            <button onClick={audio.toggleMute} style={smallBtn}>
              {audio.muted ? 'Unmute' : 'Mute'}
            </button>
            {audio.currentTrack && (
              <button onClick={audio.stopTrack} style={smallBtn}>Ambient</button>
            )}
            <button onClick={onClose} style={smallBtn}>✕</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
          {tracks.map(t => {
            const active = audio.currentTrack?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => active ? audio.stopTrack() : audio.playTrack(t)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 6,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: active ? 'rgba(100, 140, 255, 0.16)' : 'rgba(8, 12, 40, 0.7)',
                  border: `1px solid ${active ? 'rgba(140, 180, 255, 0.55)' : 'rgba(80, 110, 200, 0.18)'}`,
                  color: 'rgba(210, 225, 255, 0.85)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <span style={{ fontSize: '0.9rem', color: active ? '#ffdd44' : '#88bbff' }}>
                    {active ? '❚❚' : '▶'}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.25 }}>{t.title}</span>
                </div>
                <div style={{ fontSize: '0.66rem', color: 'rgba(140, 170, 255, 0.5)', letterSpacing: '0.04em' }}>
                  {t.source}
                </div>
              </button>
            )
          })}
        </div>

        <CommentSection
          targetType="sound"
          targetId={audio.currentTrack?.id || 'ambient'}
          open={commentsOpen}
          onClose={() => setCommentsOpen(false)}
        />

        <div style={{ marginTop: 16, fontSize: '0.66rem', color: 'rgba(140, 170, 255, 0.4)', lineHeight: 1.6 }}>
          Audio courtesy of NASA and the University of Iowa Radio and Plasma Wave Group.
        </div>
      </div>
    </div>
  )
}

const smallBtn = {
  background: 'rgba(80, 110, 200, 0.12)',
  border: '1px solid rgba(100, 140, 255, 0.25)',
  color: 'rgba(200, 220, 255, 0.8)',
  padding: '6px 12px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: '0.72rem',
  fontFamily: 'inherit',
}