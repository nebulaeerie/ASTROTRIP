import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const COUNTRIES = [
  { n: 'Afghanistan', d: '+93', code: 'AF' }, { n: 'Albania', d: '+355', code: 'AL' },
  { n: 'Algeria', d: '+213', code: 'DZ' }, { n: 'Andorra', d: '+376', code: 'AD' },
  { n: 'Angola', d: '+244', code: 'AO' }, { n: 'Antigua and Barbuda', d: '+1268', code: 'AG' },
  { n: 'Argentina', d: '+54', code: 'AR' }, { n: 'Armenia', d: '+374', code: 'AM' },
  { n: 'Australia', d: '+61', code: 'AU' }, { n: 'Austria', d: '+43', code: 'AT' },
  { n: 'Azerbaijan', d: '+994', code: 'AZ' }, { n: 'Bahamas', d: '+1242', code: 'BS' },
  { n: 'Bahrain', d: '+973', code: 'BH' }, { n: 'Bangladesh', d: '+880', code: 'BD' },
  { n: 'Barbados', d: '+1246', code: 'BB' }, { n: 'Belarus', d: '+375', code: 'BY' },
  { n: 'Belgium', d: '+32', code: 'BE' }, { n: 'Belize', d: '+501', code: 'BZ' },
  { n: 'Benin', d: '+229', code: 'BJ' }, { n: 'Bhutan', d: '+975', code: 'BT' },
  { n: 'Bolivia', d: '+591', code: 'BO' }, { n: 'Bosnia and Herzegovina', d: '+387', code: 'BA' },
  { n: 'Botswana', d: '+267', code: 'BW' }, { n: 'Brazil', d: '+55', code: 'BR' },
  { n: 'Brunei', d: '+673', code: 'BN' }, { n: 'Bulgaria', d: '+359', code: 'BG' },
  { n: 'Burkina Faso', d: '+226', code: 'BF' }, { n: 'Burundi', d: '+257', code: 'BI' },
  { n: 'Cambodia', d: '+855', code: 'KH' }, { n: 'Cameroon', d: '+237', code: 'CM' },
  { n: 'Canada', d: '+1', code: 'CA' }, { n: 'Cape Verde', d: '+238', code: 'CV' },
  { n: 'Central African Republic', d: '+236', code: 'CF' }, { n: 'Chad', d: '+235', code: 'TD' },
  { n: 'Chile', d: '+56', code: 'CL' }, { n: 'China', d: '+86', code: 'CN' },
  { n: 'Colombia', d: '+57', code: 'CO' }, { n: 'Comoros', d: '+269', code: 'KM' },
  { n: 'Congo', d: '+242', code: 'CG' }, { n: 'Congo (DRC)', d: '+243', code: 'CD' },
  { n: 'Costa Rica', d: '+506', code: 'CR' }, { n: 'Croatia', d: '+385', code: 'HR' },
  { n: 'Cuba', d: '+53', code: 'CU' }, { n: 'Cyprus', d: '+357', code: 'CY' },
  { n: 'Czechia', d: '+420', code: 'CZ' }, { n: 'Denmark', d: '+45', code: 'DK' },
  { n: 'Djibouti', d: '+253', code: 'DJ' }, { n: 'Dominica', d: '+1767', code: 'DM' },
  { n: 'Dominican Republic', d: '+1', code: 'DO' }, { n: 'Ecuador', d: '+593', code: 'EC' },
  { n: 'Egypt', d: '+20', code: 'EG' }, { n: 'El Salvador', d: '+503', code: 'SV' },
  { n: 'Equatorial Guinea', d: '+240', code: 'GQ' }, { n: 'Eritrea', d: '+291', code: 'ER' },
  { n: 'Estonia', d: '+372', code: 'EE' }, { n: 'Eswatini', d: '+268', code: 'SZ' },
  { n: 'Ethiopia', d: '+251', code: 'ET' }, { n: 'Fiji', d: '+679', code: 'FJ' },
  { n: 'Finland', d: '+358', code: 'FI' }, { n: 'France', d: '+33', code: 'FR' },
  { n: 'Gabon', d: '+241', code: 'GA' }, { n: 'Gambia', d: '+220', code: 'GM' },
  { n: 'Georgia', d: '+995', code: 'GE' }, { n: 'Germany', d: '+49', code: 'DE' },
  { n: 'Ghana', d: '+233', code: 'GH' }, { n: 'Greece', d: '+30', code: 'GR' },
  { n: 'Grenada', d: '+1473', code: 'GD' }, { n: 'Guatemala', d: '+502', code: 'GT' },
  { n: 'Guinea', d: '+224', code: 'GN' }, { n: 'Guinea-Bissau', d: '+245', code: 'GW' },
  { n: 'Guyana', d: '+592', code: 'GY' }, { n: 'Haiti', d: '+509', code: 'HT' },
  { n: 'Honduras', d: '+504', code: 'HN' }, { n: 'Hungary', d: '+36', code: 'HU' },
  { n: 'Iceland', d: '+354', code: 'IS' }, { n: 'India', d: '+91', code: 'IN' },
  { n: 'Indonesia', d: '+62', code: 'ID' }, { n: 'Iran', d: '+98', code: 'IR' },
  { n: 'Iraq', d: '+964', code: 'IQ' }, { n: 'Ireland', d: '+353', code: 'IE' },
  { n: 'Israel', d: '+972', code: 'IL' }, { n: 'Italy', d: '+39', code: 'IT' },
  { n: 'Jamaica', d: '+1876', code: 'JM' }, { n: 'Japan', d: '+81', code: 'JP' },
  { n: 'Jordan', d: '+962', code: 'JO' }, { n: 'Kazakhstan', d: '+7', code: 'KZ' },
  { n: 'Kenya', d: '+254', code: 'KE' }, { n: 'Kiribati', d: '+686', code: 'KI' },
  { n: 'Kuwait', d: '+965', code: 'KW' }, { n: 'Kyrgyzstan', d: '+996', code: 'KG' },
  { n: 'Laos', d: '+856', code: 'LA' }, { n: 'Latvia', d: '+371', code: 'LV' },
  { n: 'Lebanon', d: '+961', code: 'LB' }, { n: 'Lesotho', d: '+266', code: 'LS' },
  { n: 'Liberia', d: '+231', code: 'LR' }, { n: 'Libya', d: '+218', code: 'LY' },
  { n: 'Liechtenstein', d: '+423', code: 'LI' }, { n: 'Lithuania', d: '+370', code: 'LT' },
  { n: 'Luxembourg', d: '+352', code: 'LU' }, { n: 'Madagascar', d: '+261', code: 'MG' },
  { n: 'Malawi', d: '+265', code: 'MW' }, { n: 'Malaysia', d: '+60', code: 'MY' },
  { n: 'Maldives', d: '+960', code: 'MV' }, { n: 'Mali', d: '+223', code: 'ML' },
  { n: 'Malta', d: '+356', code: 'MT' }, { n: 'Marshall Islands', d: '+692', code: 'MH' },
  { n: 'Mauritania', d: '+222', code: 'MR' }, { n: 'Mauritius', d: '+230', code: 'MU' },
  { n: 'Mexico', d: '+52', code: 'MX' }, { n: 'Micronesia', d: '+691', code: 'FM' },
  { n: 'Moldova', d: '+373', code: 'MD' }, { n: 'Monaco', d: '+377', code: 'MC' },
  { n: 'Mongolia', d: '+976', code: 'MN' }, { n: 'Montenegro', d: '+382', code: 'ME' },
  { n: 'Morocco', d: '+212', code: 'MA' }, { n: 'Mozambique', d: '+258', code: 'MZ' },
  { n: 'Myanmar', d: '+95', code: 'MM' }, { n: 'Namibia', d: '+264', code: 'NA' },
  { n: 'Nauru', d: '+674', code: 'NR' }, { n: 'Nepal', d: '+977', code: 'NP' },
  { n: 'Netherlands', d: '+31', code: 'NL' }, { n: 'New Zealand', d: '+64', code: 'NZ' },
  { n: 'Nicaragua', d: '+505', code: 'NI' }, { n: 'Niger', d: '+227', code: 'NE' },
  { n: 'Nigeria', d: '+234', code: 'NG' }, { n: 'North Korea', d: '+850', code: 'KP' },
  { n: 'North Macedonia', d: '+389', code: 'MK' }, { n: 'Norway', d: '+47', code: 'NO' },
  { n: 'Oman', d: '+968', code: 'OM' }, { n: 'Pakistan', d: '+92', code: 'PK' },
  { n: 'Palau', d: '+680', code: 'PW' }, { n: 'Palestine', d: '+970', code: 'PS' },
  { n: 'Panama', d: '+507', code: 'PA' }, { n: 'Papua New Guinea', d: '+675', code: 'PG' },
  { n: 'Paraguay', d: '+595', code: 'PY' }, { n: 'Peru', d: '+51', code: 'PE' },
  { n: 'Philippines', d: '+63', code: 'PH' }, { n: 'Poland', d: '+48', code: 'PL' },
  { n: 'Portugal', d: '+351', code: 'PT' }, { n: 'Qatar', d: '+974', code: 'QA' },
  { n: 'Romania', d: '+40', code: 'RO' }, { n: 'Russia', d: '+7', code: 'RU' },
  { n: 'Rwanda', d: '+250', code: 'RW' }, { n: 'Saint Kitts and Nevis', d: '+1869', code: 'KN' },
  { n: 'Saint Lucia', d: '+1758', code: 'LC' }, { n: 'Saint Vincent and the Grenadines', d: '+1784', code: 'VC' },
  { n: 'Samoa', d: '+685', code: 'WS' }, { n: 'San Marino', d: '+378', code: 'SM' },
  { n: 'Sao Tome and Principe', d: '+239', code: 'ST' }, { n: 'Saudi Arabia', d: '+966', code: 'SA' },
  { n: 'Senegal', d: '+221', code: 'SN' }, { n: 'Serbia', d: '+381', code: 'RS' },
  { n: 'Seychelles', d: '+248', code: 'SC' }, { n: 'Sierra Leone', d: '+232', code: 'SL' },
  { n: 'Singapore', d: '+65', code: 'SG' }, { n: 'Slovakia', d: '+421', code: 'SK' },
  { n: 'Slovenia', d: '+386', code: 'SI' }, { n: 'Solomon Islands', d: '+677', code: 'SB' },
  { n: 'Somalia', d: '+252', code: 'SO' }, { n: 'South Africa', d: '+27', code: 'ZA' },
  { n: 'South Korea', d: '+82', code: 'KR' }, { n: 'South Sudan', d: '+211', code: 'SS' },
  { n: 'Spain', d: '+34', code: 'ES' }, { n: 'Sri Lanka', d: '+94', code: 'LK' },
  { n: 'Sudan', d: '+249', code: 'SD' }, { n: 'Suriname', d: '+597', code: 'SR' },
  { n: 'Sweden', d: '+46', code: 'SE' }, { n: 'Switzerland', d: '+41', code: 'CH' },
  { n: 'Syria', d: '+963', code: 'SY' }, { n: 'Taiwan', d: '+886', code: 'TW' },
  { n: 'Tajikistan', d: '+992', code: 'TJ' }, { n: 'Tanzania', d: '+255', code: 'TZ' },
  { n: 'Thailand', d: '+66', code: 'TH' }, { n: 'Timor-Leste', d: '+670', code: 'TL' },
  { n: 'Togo', d: '+228', code: 'TG' }, { n: 'Tonga', d: '+676', code: 'TO' },
  { n: 'Trinidad and Tobago', d: '+1868', code: 'TT' }, { n: 'Tunisia', d: '+216', code: 'TN' },
  { n: 'Turkey', d: '+90', code: 'TR' }, { n: 'Turkmenistan', d: '+993', code: 'TM' },
  { n: 'Tuvalu', d: '+688', code: 'TV' }, { n: 'Uganda', d: '+256', code: 'UG' },
  { n: 'Ukraine', d: '+380', code: 'UA' }, { n: 'United Arab Emirates', d: '+971', code: 'AE' },
  { n: 'United Kingdom', d: '+44', code: 'GB' }, { n: 'United States', d: '+1', code: 'US' },
  { n: 'Uruguay', d: '+598', code: 'UY' }, { n: 'Uzbekistan', d: '+998', code: 'UZ' },
  { n: 'Vanuatu', d: '+678', code: 'VU' }, { n: 'Vatican City', d: '+379', code: 'VA' },
  { n: 'Venezuela', d: '+58', code: 'VE' }, { n: 'Vietnam', d: '+84', code: 'VN' },
  { n: 'Yemen', d: '+967', code: 'YE' }, { n: 'Zambia', d: '+260', code: 'ZM' },
  { n: 'Zimbabwe', d: '+263', code: 'ZW' },
]

function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = COUNTRIES.find(c => c.d === value)
  const filtered = COUNTRIES.filter(c =>
    c.n.toLowerCase().includes(search.toLowerCase()) || c.d.includes(search)
  )

  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 150 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          ...input,
          width: '100%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          textAlign: 'left',
        }}
      >
        {selected ? (
          <>
            <img
              src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`}
              alt=""
              width="20"
              height="15"
              style={{ borderRadius: 2, objectFit: 'cover' }}
            />
            <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{selected.d}</span>
          </>
        ) : (
          <span style={{ color: 'rgba(160,185,255,0.5)' }}>Country</span>
        )}
        <span style={{ marginLeft: 'auto', opacity: 0.4, fontSize: '0.55rem' }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 290,
            maxHeight: 320,
            background: 'rgba(4,6,26,0.99)',
            border: '1px solid rgba(100,140,255,0.28)',
            borderRadius: 12,
            zIndex: 999,
            boxShadow: '0 20px 60px rgba(0,0,60,0.9)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country…"
              style={{
                ...input,
                border: 'none',
                borderBottom: '1px solid rgba(100,140,255,0.15)',
                borderRadius: 0,
                fontSize: '0.8rem',
                padding: '10px 14px',
              }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filtered.length === 0 ? (
                <div style={{ padding: 16, color: 'rgba(160,185,255,0.4)', fontSize: '0.8rem', textAlign: 'center' }}>
                  No results
                </div>
              ) : filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.d); setOpen(false); setSearch('') }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    background: value === c.d ? 'rgba(100,140,255,0.15)' : 'transparent',
                    border: 'none',
                    color: 'rgba(210,225,255,0.85)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontSize: '0.82rem',
                  }}
                  onMouseEnter={e => { if (value !== c.d) e.currentTarget.style.background = 'rgba(100,140,255,0.08)' }}
                  onMouseLeave={e => { if (value !== c.d) e.currentTarget.style.background = 'transparent' }}
                >
                  <img
                    src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                    alt=""
                    width="20"
                    height="15"
                    style={{ borderRadius: 2, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.n}</span>
                  <span style={{ color: 'rgba(140,170,255,0.5)', fontSize: '0.72rem', fontFamily: 'monospace' }}>{c.d}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState('signin')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const saveFavorite = async (objectName) => {
    if (!user) return false
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: user.id, object_name: objectName })
    return !error
  }

  const removeFavorite = async (objectName) => {
    if (!user) return false
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('object_name', objectName)
    return !error
  }

  const loadFavorites = async () => {
    if (!user) return []
    const { data } = await supabase
      .from('user_favorites')
      .select('object_name')
      .eq('user_id', user.id)
    return (data || []).map(r => r.object_name)
  }

  const submitGameScore = async (gameId, score) => {
    if (!user) return null
    const { data: existing } = await supabase
      .from('game_scores')
      .select('high_score, plays')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .maybeSingle()
    const newHigh = Math.max(score, existing?.high_score || 0)
    const newPlays = (existing?.plays || 0) + 1
    await supabase.from('game_scores').upsert({
      user_id: user.id,
      game_id: gameId,
      high_score: newHigh,
      plays: newPlays,
      updated_at: new Date().toISOString(),
    })
    return { high_score: newHigh, plays: newPlays }
  }

  const loadGameScores = async () => {
    if (!user) return {}
    const { data } = await supabase
      .from('game_scores')
      .select('game_id, high_score, plays')
      .eq('user_id', user.id)
    const map = {}
    ;(data || []).forEach(r => { map[r.game_id] = r })
    return map
  }

  const unlockAchievement = async (achievementId) => {
    if (!user) return
    await supabase.from('user_achievements').insert({
      user_id: user.id,
      achievement_id: achievementId,
    })
  }

  const loadAchievements = async () => {
    if (!user) return []
    const { data } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', user.id)
    return data || []
  }

  const value = {
    user,
    loading,
    modalOpen,
    mode,
    openSignIn: () => { setMode('signin'); setModalOpen(true) },
    openSignUp: () => { setMode('signup'); setModalOpen(true) },
    closeModal: () => setModalOpen(false),
    setMode,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password, username) => supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    }),
    signInWithProvider: (provider) => supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    }),
    signInWithPhone: (phone) => supabase.auth.signInWithOtp({ phone }),
    verifyPhoneOtp: (phone, token) => supabase.auth.verifyOtp({ phone, token, type: 'sms' }),
    signOut: () => supabase.auth.signOut(),
    saveFavorite,
    removeFavorite,
    loadFavorites,
    submitGameScore,
    loadGameScores,
    unlockAchievement,
    loadAchievements,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthButton() {
  const auth = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (auth.loading) return null

  if (!auth.user) {
    return (
      <button onClick={auth.openSignIn} style={navBtn}>
        Sign in
      </button>
    )
  }

  const display = auth.user.user_metadata?.username || auth.user.email?.split('@')[0] || 'User'

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setMenuOpen(o => !o)} style={{ ...navBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(100,140,255,0.35)',
          border: '1px solid rgba(140,180,255,0.55)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', color: '#ddeaff',
        }}>
          {display[0].toUpperCase()}
        </span>
        {display}
      </button>
      {menuOpen && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: 'rgba(4,6,26,0.98)', border: '1px solid rgba(100,140,255,0.2)',
          borderRadius: 10, padding: 8, minWidth: 160, zIndex: 100,
          boxShadow: '0 16px 48px rgba(0,0,60,0.6)',
        }}>
          <div style={{ color: 'rgba(160,185,255,0.6)', fontSize: '0.72rem', padding: '4px 10px 8px', borderBottom: '1px solid rgba(80,110,200,0.15)', marginBottom: 4, wordBreak: 'break-all' }}>
            {auth.user.email || auth.user.phone}
          </div>
          <button
            onClick={async () => { setMenuOpen(false); await auth.signOut() }}
            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'rgba(200,220,255,0.85)', padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export function AuthModal() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (auth.modalOpen) {
      setError(null); setInfo(null)
      setOtpSent(false); setOtp('')
      setCountryCode(''); setPhoneDigits('')
      setShowPassword(false)
    }
  }, [auth.modalOpen, auth.mode])

  if (!auth.modalOpen) return null

  const isPhoneMode = auth.mode === 'phone'
  const isSignup = auth.mode === 'signup'

  async function submitEmail(e) {
    e.preventDefault()
    setError(null); setInfo(null)
    if (isSignup) {
      const name = username.trim()
      if (!name) { setError('Please choose a username.'); return }
      if (name.length < 3) { setError('Username must be at least 3 characters.'); return }
      if (!/^[a-zA-Z0-9_]+$/.test(name)) { setError('Username: letters, numbers, underscore only.'); return }
    }
    setBusy(true)
    if (isSignup) {
      const { error } = await auth.signUp(email.trim(), password, username.trim())
      if (error) {
        const msg = error.message || ''
        if (msg.includes('User already registered')) setError('An account with this email already exists. Please sign in instead.')
        else if (msg.includes('Password should be at least')) setError('Password (must be at least 6 characters)')
        else setError(msg)
      } else {
        setInfo('Check your email to confirm your account.')
        setEmail(''); setPassword(''); setUsername('')
      }
    } else {
      const { error } = await auth.signIn(email.trim(), password)
      if (error) {
        const msg = error.message || ''
        if (msg.includes('Invalid login credentials')) setError('Password or email is invalid.')
        else if (msg.includes('Email not confirmed')) setError('Please check your email to confirm your account before signing in.')
        else setError(msg)
      } else auth.closeModal()
    }
    setBusy(false)
  }

  async function sendOtp(e) {
    e.preventDefault()
    setError(null); setInfo(null)
    if (!countryCode) { setError('Please choose a country.'); return }
    if (phoneDigits.length < 6) { setError('Enter a valid phone number.'); return }
    const fullPhone = `${countryCode}${phoneDigits}`
    setBusy(true)
    const { error } = await auth.signInWithPhone(fullPhone)
    if (error) setError(error.message)
    else { setOtpSent(true); setInfo('Code sent to ' + fullPhone) }
    setBusy(false)
  }

  async function verifyOtp(e) {
    e.preventDefault()
    setError(null); setInfo(null)
    const fullPhone = `${countryCode}${phoneDigits}`
    setBusy(true)
    const { error } = await auth.verifyPhoneOtp(fullPhone, otp.trim())
    if (error) setError(error.message)
    else auth.closeModal()
    setBusy(false)
  }

  function social(provider) {
    setError(null)
    auth.signInWithProvider(provider)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,10,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        maxHeight: '90vh', overflowY: 'auto',
        background: 'rgba(4,6,26,0.98)',
        border: '1px solid rgba(100,140,255,0.22)',
        borderRadius: 18, padding: '28px 24px',
        boxShadow: '0 24px 80px rgba(0,0,60,0.7)',
        fontFamily: 'Inter, system-ui, sans-serif',
        position: 'relative',
      }}>
        <button
          type="button"
          onClick={auth.closeModal}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(80,110,200,0.15)',
            border: '1px solid rgba(100,140,255,0.25)',
            color: 'rgba(200,220,255,0.7)',
            cursor: 'pointer', fontSize: '0.85rem',
            fontFamily: 'inherit', padding: 0,
          }}
        >✕</button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ color: '#fff', fontFamily: 'Georgia, serif', fontSize: '1.35rem', marginBottom: 6 }}>
            {isPhoneMode ? 'Sign in with phone number' : isSignup ? 'Create account' : 'Welcome back to space'}
          </div>
          <div style={{ color: 'rgba(160,185,255,0.55)', fontSize: '0.8rem' }}>
            {isPhoneMode ? 'We will text you a 6-digit code' : isSignup ? 'Join the TRIP' : 'Save favorites, comment, and track progress'}
          </div>
        </div>

        {!isPhoneMode && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              <button type="button" onClick={() => social('github')} style={socialBtn}>Continue with GitHub</button>
              <button type="button" onClick={() => social('google')} style={socialBtn}>Continue with Google</button>
              <button type="button" onClick={() => social('discord')} style={socialBtn}>Continue with Discord</button>
              <button type="button" onClick={() => social('spotify')} style={socialBtn}>Continue with Spotify</button>
              <button type="button" onClick={() => social('facebook')} style={socialBtn}>Continue with Facebook</button>
              <button type="button" onClick={() => social('twitter')} style={socialBtn}>Continue with X</button>
              <button type="button" onClick={() => social('apple')} style={socialBtn}>Continue with Apple</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(80,110,200,0.2)' }} />
              <div style={{ color: 'rgba(140,170,255,0.4)', fontSize: '0.7rem', letterSpacing: '0.15em' }}>OR</div>
              <div style={{ flex: 1, height: 1, background: 'rgba(80,110,200,0.2)' }} />
            </div>

            <form onSubmit={submitEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {isSignup && (
                <input
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Username"
                  maxLength={24}
                  minLength={3}
                  style={input}
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                style={input}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password (must be at least 6 characters)"
                  style={{ ...input, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(160,185,255,0.6)',
                    cursor: 'pointer',
                    padding: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {error && <div style={{ color: '#ff7777', fontSize: '0.78rem', padding: '4px 0' }}>{error}</div>}
              {info && <div style={{ color: '#88ffcc', fontSize: '0.78rem', padding: '4px 0' }}>{info}</div>}
              <button type="submit" disabled={busy} style={{ ...submitBtn, opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button type="button" onClick={() => auth.setMode('phone')} style={linkBtn}>
                Sign in with phone number
              </button>
            </div>
          </>
        )}

        {isPhoneMode && (
          <div>
            {!otpSent ? (
              <form onSubmit={sendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <CountrySelect value={countryCode} onChange={setCountryCode} />
                  <input
                    required
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phoneDigits}
                    onChange={e => setPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder="555 123 4567"
                    style={{ ...input, flex: 1 }}
                  />
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(160,185,255,0.45)', marginTop: -2 }}>
                  Digits only. Include area code.
                </div>
                {error && <div style={{ color: '#ff7777', fontSize: '0.78rem' }}>{error}</div>}
                <button type="submit" disabled={busy} style={{ ...submitBtn, opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Sending…' : 'Send code'}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ color: 'rgba(160,185,255,0.7)', fontSize: '0.82rem', textAlign: 'center' }}>
                  Code sent to {countryCode}{phoneDigits}
                </div>
                <input
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  style={input}
                />
                {error && <div style={{ color: '#ff7777', fontSize: '0.78rem' }}>{error}</div>}
                {info && <div style={{ color: '#88ffcc', fontSize: '0.78rem' }}>{info}</div>}
                <button type="submit" disabled={busy} style={{ ...submitBtn, opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Verifying…' : 'Verify code'}
                </button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(null); setInfo(null) }} style={linkBtn}>
                  Use a different number
                </button>
              </form>
            )}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button type="button" onClick={() => auth.setMode('signin')} style={linkBtn}>
                Sign in with email
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.78rem', color: 'rgba(160,185,255,0.55)' }}>
          {isSignup ? (
            <>Have an account? <a onClick={() => auth.setMode('signin')} style={link}>Sign in</a></>
          ) : !isPhoneMode ? (
            <>No account? <a onClick={() => auth.setMode('signup')} style={link}>Sign up</a></>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const input = {
  width: '100%',
  background: 'rgba(8,12,40,0.6)',
  border: '1px solid rgba(100,140,255,0.2)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#ddeaff',
  fontSize: '0.88rem',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const submitBtn = {
  background: 'rgba(100,140,255,0.22)',
  border: '1px solid rgba(100,140,255,0.45)',
  color: '#ddeaff',
  padding: '11px 18px',
  borderRadius: 10,
  fontSize: '0.88rem',
  fontFamily: 'inherit',
  marginTop: 6,
}

const navBtn = {
  background: 'rgba(80,110,200,0.1)',
  border: '1px solid rgba(100,140,255,0.25)',
  color: 'rgba(200,220,255,0.85)',
  padding: 'clamp(5px,1.5vw,7px) clamp(8px,2.5vw,14px)',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 'clamp(0.68rem,2.2vw,0.8rem)',
  letterSpacing: '0.06em',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

const link = {
  color: '#aac4ff',
  cursor: 'pointer',
  textDecoration: 'underline',
}

const linkBtn = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(160,185,255,0.7)',
  cursor: 'pointer',
  fontSize: '0.78rem',
  fontFamily: 'inherit',
  textDecoration: 'underline',
  padding: 0,
}

const socialBtn = {
  background: 'rgba(80,110,200,0.08)',
  border: '1px solid rgba(100,140,255,0.2)',
  color: 'rgba(200,220,255,0.85)',
  padding: '10px 16px',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: '0.84rem',
  fontFamily: 'inherit',
  width: '100%',
  textAlign: 'center',
}