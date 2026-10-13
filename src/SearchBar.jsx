import { useState, useMemo } from 'react'

export default function SearchBar({ items, onSelect, placeholder = 'Search stars, planets…' }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    return items
      .filter(it => it.name.toLowerCase().includes(query))
      .slice(0, 10)
  }, [q, items])

  function pick(it) {
    onSelect(it)
    setQ('')
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 240 }}>
      <input
        type="text"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'rgba(4,6,26,0.85)',
          border: '1px solid rgba(100,140,255,0.25)',
          color: '#e5e9f5',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 13,
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
        }}
      />
      {open && matches.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: 'rgba(4,6,26,0.97)',
          border: '1px solid rgba(100,140,255,0.3)',
          borderRadius: 8,
          listStyle: 'none',
          padding: 4,
          margin: 0,
          maxHeight: 280,
          overflowY: 'auto',
          zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {matches.map(it => (
            <li
              key={it.name}
              onMouseDown={(e) => { e.preventDefault(); pick(it) }}
              style={{
                padding: '7px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                color: '#e5e9f5',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 8,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(100,140,255,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span>{it.name}</span>
              {it.category && <span style={{ color: '#7f8bb0', fontSize: 11 }}>{it.category}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}