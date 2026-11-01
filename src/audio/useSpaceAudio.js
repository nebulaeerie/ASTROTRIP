import { useEffect, useRef, useState, useCallback } from 'react'

const AMBIENT_URL = '/audio/space/ambient-bed.mp3'
const LS_KEY = 'astroSoundMuted'

export default function useSpaceAudio() {
  const ambientRef = useRef(null)
  const trackRef = useRef(null)
  const [unlocked, setUnlocked] = useState(false)
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === '1' } catch { return false }
  })
  const [currentTrack, setCurrentTrack] = useState(null)
  const [playing, setPlaying] = useState(false)

  // Create the ambient element once
  useEffect(() => {
    const a = new Audio(AMBIENT_URL)
    a.loop = true
    a.volume = 0
    a.preload = 'auto'
    ambientRef.current = a
    return () => { a.pause(); a.src = '' }
  }, [])

  // Unlock on first gesture
  useEffect(() => {
    if (unlocked) return
    const unlock = () => {
      setUnlocked(true)
      if (!muted && ambientRef.current) {
        ambientRef.current.play().catch(() => {})
        fadeTo(ambientRef.current, muted ? 0 : 0.18, 2500)
      }
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [unlocked, muted])

  // Persist mute
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, muted ? '1' : '0') } catch {}
    if (ambientRef.current) {
      if (muted) fadeTo(ambientRef.current, 0, 600)
      else if (unlocked) fadeTo(ambientRef.current, currentTrack ? 0.05 : 0.18, 600)
    }
  }, [muted, unlocked, currentTrack])

  // Pause when the tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        ambientRef.current?.pause()
        trackRef.current?.pause()
      } else if (unlocked && !muted) {
        if (currentTrack) trackRef.current?.play().catch(() => {})
        else ambientRef.current?.play().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [unlocked, muted, currentTrack])

  const playTrack = useCallback((track) => {
    if (!unlocked) return
    setMuted(false)
    setCurrentTrack(track)

    // Duck the ambient bed
    if (ambientRef.current) fadeTo(ambientRef.current, 0.03, 400)

    if (trackRef.current) {
      trackRef.current.pause()
      trackRef.current.src = ''
    }
    const a = new Audio(track.url)
    a.volume = 0
    a.preload = 'auto'
    trackRef.current = a
    a.play().then(() => {
      fadeTo(a, 0.65, 500)
      setPlaying(true)
    }).catch(() => setPlaying(false))
    a.onended = () => {
      setPlaying(false)
      setCurrentTrack(null)
      if (ambientRef.current) fadeTo(ambientRef.current, 0.18, 1200)
    }
  }, [unlocked])

  const stopTrack = useCallback(() => {
    if (trackRef.current) {
      const t = trackRef.current
      fadeTo(t, 0, 300, () => { t.pause(); t.src = '' })
      trackRef.current = null
    }
    setCurrentTrack(null)
    setPlaying(false)
    if (ambientRef.current) fadeTo(ambientRef.current, 0.18, 800)
  }, [])

  const toggleMute = useCallback(() => setMuted(m => !m), [])

  return {
    unlocked, muted, playing, currentTrack,
    playTrack, stopTrack, toggleMute,
  }
}

function fadeTo(audio, target, duration, onDone) {
  if (!audio) return
  if (audio.__fadeRAF) cancelAnimationFrame(audio.__fadeRAF)
  const start = Math.max(0, Math.min(1, audio.volume || 0))
  const safeTarget = Math.max(0, Math.min(1, target))
  const startTime = performance.now()
  const step = (now) => {
    const raw = (now - startTime) / duration
    const t = Math.max(0, Math.min(1, raw))
    const v = Math.max(0, Math.min(1, start + (safeTarget - start) * t))
    try { audio.volume = v } catch {}
    if (t < 1) audio.__fadeRAF = requestAnimationFrame(step)
    else { audio.__fadeRAF = null; if (onDone) onDone() }
  }
  audio.__fadeRAF = requestAnimationFrame(step)
}