import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './Auth'

export default function CommentSection({ targetType, targetId, open, onClose }) {
  const { user } = useAuth()
  const displayName = user ? (user.user_metadata?.username || user.email.split('@')[0]) : ''
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    supabase
      .from('comments')
      .select('*')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setComments(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [targetType, targetId, open])

  async function submit(e) {
    e.preventDefault()
    if (!author.trim() || !body.trim() || submitting) return
    setSubmitting(true)
    const { data, error } = await supabase
  .from('comments')
  .insert({
    target_type: targetType,
    target_id: targetId,
    author: author.trim().slice(0, 40),
    body: body.trim().slice(0, 2000),
    user_id: user?.id || null,
  })
  .select()
  .single()
    if (!error && data) {
      setComments(c => [...c, data])
      setBody('')
    }
    setSubmitting(false)
  }

  if (!open) return null

  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(80,110,200,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ color: 'rgba(120,160,255,0.55)', fontSize: '0.68rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Comments {comments.length > 0 && `· ${comments.length}`}
        </div>
        <button onClick={onClose} style={smallBtn}>✕</button>
      </div>

      {loading && <div style={{ color: 'rgba(160,185,255,0.4)', fontSize: '0.8rem', padding: '12px 0' }}>Loading…</div>}

      {!loading && comments.length === 0 && (
        <div style={{ color: 'rgba(160,185,255,0.4)', fontSize: '0.82rem', padding: '8px 0 16px', fontStyle: 'italic' }}>
          No comments yet. Be the first.
        </div>
      )}

      {!loading && comments.map(c => (
        <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid rgba(80,110,200,0.08)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
            <span style={{ color: '#c8d8ff', fontSize: '0.82rem', fontWeight: 500 }}>{c.author}</span>
            <span style={{ color: 'rgba(140,170,255,0.4)', fontSize: '0.68rem' }}>
              {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <div style={{ color: 'rgba(200,215,255,0.8)', fontSize: '0.86rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {c.body}
          </div>
        </div>
      ))}

      <form onSubmit={submit} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
               {user ? (
          <div style={{ fontSize: '0.78rem', color: 'rgba(160,185,255,0.6)', padding: '4px 2px' }}>
            Commenting as <span style={{ color: '#c8d8ff' }}>{displayName}</span>
          </div>
        ) : (
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Your name"
            maxLength={40}
            style={inputStyle}
          />
        )}
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Share a thought…"
          maxLength={2000}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
        />
        <button
          type="submit"
          disabled={!author.trim() || !body.trim() || submitting}
          style={{
            background: 'rgba(100,140,255,0.15)',
            border: '1px solid rgba(100,140,255,0.35)',
            color: '#c8d8ff',
            padding: '8px 18px',
            borderRadius: 8,
            cursor: (!author.trim() || !body.trim() || submitting) ? 'not-allowed' : 'pointer',
            opacity: (!author.trim() || !body.trim() || submitting) ? 0.5 : 1,
            fontSize: '0.82rem',
            fontFamily: 'inherit',
            alignSelf: 'flex-start',
          }}
        >
          {submitting ? 'Posting…' : 'Post comment'}
        </button>
      </form>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(8,12,40,0.6)',
  border: '1px solid rgba(100,140,255,0.2)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#ddeaff',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const smallBtn = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(160,185,255,0.5)',
  cursor: 'pointer',
  fontSize: '0.9rem',
  padding: '4px 8px',
}