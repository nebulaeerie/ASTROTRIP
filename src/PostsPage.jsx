import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { LANGUAGES } from './languages'

const META = {
  article:  { label: 'Articles',  eyebrow: 'From the Observatory',  empty: 'No articles published yet.' },
  research: { label: 'Research',  eyebrow: 'Scientific Findings',   empty: 'No research published yet.' },
}

function PostCard({ post, lang, onClick }) {
  const t = post.translations?.[lang.code] || post.translations?.en || {}
  const title = t.title || 'Untitled'
  const excerpt = (t.excerpt || t.body || '').slice(0, 180)
  const date = new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <article
      onClick={() => onClick(post)}
      style={{ background: 'rgba(8,12,40,0.7)', border: '1px solid rgba(80,110,200,0.15)', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s', direction: lang.dir }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(120,160,255,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(80,110,200,0.15)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {post.cover_image && <img src={post.cover_image} alt={title} style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '24px' }}>
        <time style={{ color: 'rgba(120,160,255,0.5)', fontSize: '0.72rem', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>{date}</time>
        <h2 style={{ color: '#e8f0ff', fontSize: '1.25rem', fontFamily: 'Georgia, serif', fontWeight: 400, margin: '0 0 12px', lineHeight: 1.3 }}>{title}</h2>
        {excerpt && <p style={{ color: 'rgba(170,190,240,0.65)', fontSize: '0.85rem', lineHeight: 1.7, margin: '0 0 16px' }}>{excerpt}{excerpt.length >= 180 ? '…' : ''}</p>}
        <span style={{ color: 'rgba(120,160,255,0.7)', fontSize: '0.8rem' }}>Read →</span>
      </div>
    </article>
  )
}

function PostModal({ post, lang, onClose }) {
  const t = post.translations?.[lang.code] || post.translations?.en || {}
  const title = t.title || 'Untitled'
  const body = t.body || ''
  const date = new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
  }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,10,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: 'clamp(16px,6vw,48px) clamp(8px,3vw,24px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'rgba(4,6,26,0.98)', border: '1px solid rgba(100,140,255,0.2)', borderRadius: '20px', maxWidth: '760px', width: '100%', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,60,0.7)', overflow: 'hidden', direction: lang.dir }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(80,110,200,0.15)', border: '1px solid rgba(100,140,255,0.2)', color: 'rgba(200,220,255,0.7)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem', zIndex: 10 }}>✕</button>
        {post.cover_image && <img src={post.cover_image} alt={title} style={{ width: '100%', maxHeight: '360px', objectFit: 'cover', display: 'block' }} />}
        <div style={{ padding: 'clamp(20px,5vw,40px) clamp(16px,5vw,48px) clamp(28px,7vw,56px)' }}>
          <time style={{ color: 'rgba(120,160,255,0.5)', fontSize: '0.72rem', letterSpacing: '0.12em', display: 'block', marginBottom: '10px' }}>{date}</time>
          <h1 style={{ color: '#fff', fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontFamily: 'Georgia, serif', fontWeight: 300, margin: '0 0 32px', lineHeight: 1.2 }}>{title}</h1>
          <div style={{ color: 'rgba(190,210,255,0.85)', fontSize: '1rem', lineHeight: 1.85 }} dangerouslySetInnerHTML={{ __html: body.replace(/\n/g, '<br/>') }} />
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
  const meta = META[type]

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
    <div style={{ minHeight: '100vh', background: '#02030f', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', rowGap: '8px', padding: '14px clamp(14px,4vw,48px)', background: 'rgba(2,3,15,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(80,110,200,0.12)' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(180,200,255,0.7)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}>← Solar System</button>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowLangMenu(s => !s)} style={{ background: 'rgba(80,110,200,0.1)', border: '1px solid rgba(100,140,255,0.25)', color: 'rgba(200,220,255,0.85)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit', minWidth: '140px', textAlign: 'left' }}>
            {lang.name} ▾
          </button>
          {showLangMenu && (
            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'rgba(4,6,26,0.98)', border: '1px solid rgba(100,140,255,0.2)', borderRadius: '12px', padding: '8px', zIndex: 200, maxHeight: '320px', overflowY: 'auto', minWidth: '180px', boxShadow: '0 16px 48px rgba(0,0,60,0.6)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
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

      {selected && <PostModal post={selected} lang={lang} onClose={() => setSelected(null)} />}
    </div>
  )
}