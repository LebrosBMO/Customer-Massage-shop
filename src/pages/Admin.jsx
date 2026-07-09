import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { brand, locations } from '../data/content.js'
import { staticServiceList } from '../lib/useServices.js'
import { defaultQuestions } from '../data/funnel.js'

const STATUSES = ['new', 'confirmed', 'done', 'cancelled']
const STATUS_LABELS = {
  new: 'шинэ',
  confirmed: 'баталгаажсан',
  done: 'дууссан',
  cancelled: 'цуцалсан',
}

// Sample rows shown only in demo mode (no Supabase configured) so you can
// preview exactly what the admin dashboard looks like with data.
const DEMO_ROWS = [
  {
    id: 'demo-1',
    created_at: new Date().toISOString(),
    name: 'Eva Novak',
    phone: '+420 777 123 456',
    email: 'eva@example.com',
    location_id: 'centre',
    service: 'Тантрик массаж',
    masseuse: 'Миа',
    preferred_date: '2026-07-02',
    preferred_time: '18:00',
    notes: 'Анх удаа, бага зэрэг сандарч байгаа — тайван өрөө хүссэн.',
    status: 'new',
  },
  {
    id: 'demo-2',
    created_at: new Date(Date.now() - 3600e3 * 5).toISOString(),
    name: 'Tom Becker',
    phone: '+420 605 987 654',
    email: '',
    location_id: 'riverside',
    service: 'Хосуудын массаж',
    masseuse: 'Софиа',
    preferred_date: '2026-07-04',
    preferred_time: '20:30',
    notes: 'Ойн баярын захиалга, хоёулаа.',
    status: 'confirmed',
  },
  {
    id: 'demo-3',
    created_at: new Date(Date.now() - 3600e3 * 28).toISOString(),
    name: 'L. Horak',
    phone: '+420 720 444 222',
    email: 'lh@example.com',
    location_id: 'centre',
    service: 'Халуун чулуун эмчилгээ',
    masseuse: '',
    preferred_date: '2026-06-29',
    preferred_time: '14:00',
    notes: '',
    status: 'done',
  },
]

const locName = (id) => locations.find((l) => l.id === id)?.name ?? id ?? '—'

function fmt(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('mn-MN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  // Track auth state when Supabase is configured.
  useEffect(() => {
    if (!supabaseConfigured) {
      setChecking(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecking(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (checking) {
    return <div className="section container narrow"><p>Ачаалж байна…</p></div>
  }

  // Demo mode: skip auth, show the dashboard with sample data.
  if (!supabaseConfigured) return <Dashboard demo />

  // Configured but not signed in → show login.
  if (!session) return <Login />

  return <Dashboard session={session} />
}

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="section container narrow">
      <header className="page-head">
        <h1>Админ нэвтрэх</h1>
        <p>{brand.name}-ийн ажилтны хандалт. Supabase удирдлагад үүсгэсэн нэвтрэх мэдээллээ ашиглана уу.</p>
      </header>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Имэйл
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Нууц үг
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Нэвтэрч байна…' : 'Нэвтрэх'}
        </button>
        {error && <div className="banner banner--error">{error}</div>}
      </form>
      <p className="note"><Link to="/">← Сайт руу буцах</Link></p>
    </div>
  )
}

function Dashboard({ demo, session }) {
  const [tab, setTab] = useState('reservations')

  async function signOut() {
    if (!demo) await supabase.auth.signOut()
  }

  return (
    <div className="section container">
      <div className="admin-bar">
        <div>
          <h1>Удирдлагын хэсэг</h1>
          <p className="admin-sub">
            {demo
              ? 'Туршилтын горим — жишиг өгөгдөл. Жинхэнэ мэдээллийг харахын тулд Supabase холбоно уу.'
              : `Нэвтэрсэн: ${session?.user?.email}`}
          </p>
        </div>
        <div className="admin-actions">
          <button className="btn btn--small" onClick={signOut} disabled={demo}>
            {demo ? 'Туршилт' : 'Гарах'}
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'reservations' ? 'is-active' : ''} onClick={() => setTab('reservations')}>
          Захиалгууд
        </button>
        <button className={tab === 'services' ? 'is-active' : ''} onClick={() => setTab('services')}>
          Үйлчилгээ
        </button>
        <button className={tab === 'funnel' ? 'is-active' : ''} onClick={() => setTab('funnel')}>
          Асуулга
        </button>
      </div>

      {demo && (
        <div className="banner banner--info">
          Та админ хэсгийг <strong>туршилтын горимд</strong> жишиг өгөгдөлтэйгөөр үзэж байна. Хийсэн
          өөрчлөлт хадгалагдахгүй. Supabase холбогдсоны дараа бүх зүйл бодитоор хадгалагдана.
        </div>
      )}

      {tab === 'reservations' && <ReservationsPanel demo={demo} />}
      {tab === 'services' && <ServicesPanel demo={demo} />}
      {tab === 'funnel' && <FunnelPanel demo={demo} />}
    </div>
  )
}

function ReservationsPanel({ demo }) {
  const [rows, setRows] = useState(demo ? DEMO_ROWS : [])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    if (demo) return
    setLoading(true)
    const { data, error } = await supabase
      .from('salon_reservations')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setRows(data)
    setLoading(false)
  }, [demo])

  useEffect(() => { load() }, [load])

  async function setStatus(id, status) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    if (demo) return
    const { error } = await supabase.from('salon_reservations').update({ status }).eq('id', id)
    if (error) { setError(error.message); load() }
  }

  const visible = filter === 'all' ? rows : rows.filter((r) => r.status === filter)
  const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: rows.filter((r) => r.status === s).length }), {})

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-filters">
          <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>
            Бүгд ({rows.length})
          </button>
          {STATUSES.map((s) => (
            <button key={s} className={filter === s ? 'is-active' : ''} onClick={() => setFilter(s)}>
              {STATUS_LABELS[s]} ({counts[s]})
            </button>
          ))}
        </div>
        {!demo && <button className="btn btn--small btn--ghost" onClick={load}>Сэргээх</button>}
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {loading ? (
        <p>Ачаалж байна…</p>
      ) : visible.length === 0 ? (
        <p className="note">Энэ хэсэгт захиалга алга.</p>
      ) : (
        <div className="table-wrap">
          <table className="admintable">
            <thead>
              <tr>
                <th>Хүлээн авсан</th>
                <th>Зочин</th>
                <th>Холбоо барих</th>
                <th>Үйлчилгээ</th>
                <th>Хүссэн</th>
                <th>Салбар</th>
                <th>Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{fmt(r.created_at)}</td>
                  <td>
                    <strong>{r.name}</strong>
                    {r.masseuse && <div className="muted">{r.masseuse}-г хүссэн</div>}
                    {r.notes && <div className="muted note-cell">“{r.notes}”</div>}
                  </td>
                  <td className="nowrap">
                    <a href={`tel:${(r.phone || '').replace(/\s/g, '')}`}>{r.phone}</a>
                    {r.email && <div className="muted">{r.email}</div>}
                  </td>
                  <td>{r.service || '—'}</td>
                  <td className="nowrap">
                    {r.preferred_date || '—'}
                    {r.preferred_time && <div className="muted">{r.preferred_time}</div>}
                  </td>
                  <td>{locName(r.location_id)}</td>
                  <td>
                    <select
                      className={`status-select status--${r.status}`}
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value)}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const blankService = () => ({
  id: null,
  name: '',
  duration: '',
  price_60: '',
  price_90: '',
  blurb: '',
  image: '',
  active: true,
  sort_order: 0,
})

function ServicesPanel({ demo }) {
  const [rows, setRows] = useState(demo ? staticServiceList() : [])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // service object being edited/created
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (demo) return
    setLoading(true)
    const { data, error } = await supabase
      .from('salon_services')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) setError(error.message)
    else setRows(data)
    setLoading(false)
  }, [demo])

  useEffect(() => { load() }, [load])

  function startNew() {
    setError('')
    setEditing({ ...blankService(), sort_order: rows.length })
  }

  function startEdit(svc) {
    setError('')
    setEditing({ ...svc })
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const isNew = !editing.id
    const payload = {
      name: editing.name,
      duration: editing.duration || null,
      price_60: editing.price_60 || null,
      price_90: editing.price_90 || null,
      blurb: editing.blurb || null,
      image: editing.image || null,
      active: editing.active,
      sort_order: Number(editing.sort_order) || 0,
    }

    if (demo) {
      setRows((rs) =>
        isNew
          ? [...rs, { ...payload, id: crypto.randomUUID() }]
          : rs.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)),
      )
      setEditing(null)
      setSaving(false)
      return
    }

    // .select() returns the affected rows — if the session expired, RLS
    // silently matches 0 rows with no error, so we must check the count.
    const { data, error } = isNew
      ? await supabase.from('salon_services').insert(payload).select('id')
      : await supabase.from('salon_services').update(payload).eq('id', editing.id).select('id')

    setSaving(false)
    if (error) { setError(error.message); return }
    if (!data || data.length === 0) {
      setError('Хадгалагдсангүй — таны нэвтрэлтийн хугацаа дууссан байж магадгүй. Гараад дахин нэвтэрч, дараа нь дахин оролдоно уу.')
      return
    }
    setEditing(null)
    load()
  }

  async function remove(svc) {
    if (!window.confirm(`«${svc.name}» үйлчилгээг устгах уу?`)) return
    if (demo) {
      setRows((rs) => rs.filter((r) => r.id !== svc.id))
      return
    }
    const { data, error } = await supabase.from('salon_services').delete().eq('id', svc.id).select('id')
    if (error) setError(error.message)
    else if (!data || data.length === 0) setError('Устгагдсангүй — гараад дахин нэвтэрч үзнэ үү.')
    else load()
  }

  async function toggleActive(svc) {
    const next = !svc.active
    setRows((rs) => rs.map((r) => (r.id === svc.id ? { ...r, active: next } : r)))
    if (demo) return
    const { data, error } = await supabase.from('salon_services').update({ active: next }).eq('id', svc.id).select('id')
    if (error) { setError(error.message); load() }
    else if (!data || data.length === 0) { setError('Өөрчлөгдсөнгүй — гараад дахин нэвтэрч үзнэ үү.'); load() }
  }

  const upd = (field, value) => setEditing((s) => ({ ...s, [field]: value }))

  return (
    <>
      <div className="admin-toolbar">
        <p className="admin-sub">Нийт {rows.length} үйлчилгээ</p>
        <div className="admin-actions">
          {!demo && <button className="btn btn--small btn--ghost" onClick={load}>Сэргээх</button>}
          <button className="btn btn--small" onClick={startNew}>+ Үйлчилгээ нэмэх</button>
        </div>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {editing && (
        <form className="form svc-editor" onSubmit={save}>
          <h3>{editing.id ? 'Үйлчилгээ засах' : 'Шинэ үйлчилгээ'}</h3>
          <label>
            Нэр *
            <input required value={editing.name} onChange={(e) => upd('name', e.target.value)} />
          </label>
          <div className="form__row">
            <label>
              Үргэлжлэх хугацаа
              <input value={editing.duration} placeholder="90 мин" onChange={(e) => upd('duration', e.target.value)} />
            </label>
            <label>
              Эрэмбэ
              <input type="number" value={editing.sort_order} onChange={(e) => upd('sort_order', e.target.value)} />
            </label>
          </div>
          <div className="form__row">
            <label>
              60 мин үнэ
              <input value={editing.price_60} placeholder="150,000₮" onChange={(e) => upd('price_60', e.target.value)} />
            </label>
            <label>
              90 мин үнэ
              <input value={editing.price_90} placeholder="200,000₮" onChange={(e) => upd('price_90', e.target.value)} />
            </label>
          </div>
          <label>
            Зургийн холбоос (URL)
            <input value={editing.image} placeholder="https://…" onChange={(e) => upd('image', e.target.value)} />
          </label>
          <label>
            Тайлбар
            <textarea rows={3} value={editing.blurb} onChange={(e) => upd('blurb', e.target.value)} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={editing.active} onChange={(e) => upd('active', e.target.checked)} />
            Сайт дээр харуулах
          </label>
          <div className="admin-actions">
            <button className="btn btn--small" type="submit" disabled={saving}>
              {saving ? 'Хадгалж байна…' : 'Хадгалах'}
            </button>
            <button className="btn btn--small btn--ghost" type="button" onClick={() => setEditing(null)}>
              Болих
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Ачаалж байна…</p>
      ) : rows.length === 0 ? (
        <p className="note">Үйлчилгээ алга. «+ Үйлчилгээ нэмэх» дарж эхлүүлээрэй.</p>
      ) : (
        <div className="table-wrap">
          <table className="admintable">
            <thead>
              <tr>
                <th></th>
                <th>Нэр</th>
                <th>Хугацаа</th>
                <th>60 мин</th>
                <th>90 мин</th>
                <th>Төлөв</th>
                <th>Үйлдэл</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={s.active ? '' : 'is-hidden-row'}>
                  <td>
                    {s.image
                      ? <div className="svc-thumb" style={{ backgroundImage: `url(${s.image})` }} />
                      : <div className="svc-thumb svc-thumb--empty" />}
                  </td>
                  <td>
                    <strong>{s.name}</strong>
                    {s.blurb && <div className="muted note-cell">{s.blurb}</div>}
                  </td>
                  <td className="nowrap">{s.duration || '—'}</td>
                  <td className="nowrap">{s.price_60 || '—'}</td>
                  <td className="nowrap">{s.price_90 || '—'}</td>
                  <td>
                    <button
                      className={`toggle ${s.active ? 'toggle--on' : ''}`}
                      onClick={() => toggleActive(s)}
                      title="Харагдах байдлыг солих"
                    >
                      {s.active ? 'Идэвхтэй' : 'Нуусан'}
                    </button>
                  </td>
                  <td className="nowrap">
                    <button className="link-btn" onClick={() => startEdit(s)}>Засах</button>
                    <button className="link-btn link-btn--danger" onClick={() => remove(s)}>Устгах</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

const blankQuestion = () => ({
  id: null,
  question: '',
  type: 'single',
  required: true,
  choices: [
    { label: '', disqualifies: false, points: 0 },
    { label: '', disqualifies: false, points: 0 },
  ],
  active: true,
  sort_order: 0,
})

const QTYPES = [
  { v: 'single', label: 'Нэг сонголт' },
  { v: 'multi', label: 'Олон сонголт' },
  { v: 'text', label: 'Текст бичих' },
]

function FunnelPanel({ demo }) {
  const [rows, setRows] = useState(demo ? defaultQuestions : [])
  const [loading, setLoading] = useState(!demo)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (demo) return
    setLoading(true)
    const { data, error } = await supabase
      .from('salon_funnel_questions')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) setError(error.message)
    else setRows(data)
    setLoading(false)
  }, [demo])

  useEffect(() => { load() }, [load])

  function startNew() {
    setError('')
    setEditing({ ...blankQuestion(), sort_order: rows.length })
  }
  function startEdit(q) {
    setError('')
    setEditing({
      ...q,
      type: q.type || 'single',
      required: q.required ?? false,
      choices: (q.choices || []).map((c) => ({ points: 0, ...c })),
    })
  }

  // One-click duplicate: inserts an exact copy (same choices/branching/points)
  // at the end of the list, so it can be tweaked without rebuilding it.
  async function duplicate(q) {
    setError('')
    const payload = {
      question: q.question + ' (хуулбар)',
      type: q.type || 'single',
      required: !!q.required,
      choices: (q.choices || []).map((c) => ({ ...c })),
      active: q.active,
      sort_order: rows.length,
    }
    if (demo) {
      setRows((rs) => [...rs, { ...payload, id: crypto.randomUUID() }])
      return
    }
    const { data, error } = await supabase.from('salon_funnel_questions').insert(payload).select('id')
    if (error) { setError(error.message); return }
    if (!data || data.length === 0) { setError('Хуулагдсангүй — гараад дахин нэвтэрч үзнэ үү.'); return }
    load()
  }

  const upd = (field, value) => setEditing((s) => ({ ...s, [field]: value }))
  const updChoice = (i, field, value) =>
    setEditing((s) => ({
      ...s,
      choices: s.choices.map((c, ci) => (ci === i ? { ...c, [field]: value } : c)),
    }))
  const addChoice = () =>
    setEditing((s) => ({ ...s, choices: [...s.choices, { label: '', disqualifies: false, points: 0 }] }))
  const removeChoice = (i) =>
    setEditing((s) => ({ ...s, choices: s.choices.filter((_, ci) => ci !== i) }))

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const isNew = !editing.id
    const payload = {
      question: editing.question,
      type: editing.type || 'single',
      required: !!editing.required,
      choices: editing.type === 'text'
        ? []
        : editing.choices.filter((c) => c.label.trim()).map((c) => ({ ...c, points: Number(c.points) || 0 })),
      active: editing.active,
      sort_order: Number(editing.sort_order) || 0,
    }

    if (demo) {
      setRows((rs) =>
        isNew
          ? [...rs, { ...payload, id: crypto.randomUUID() }]
          : rs.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)),
      )
      setEditing(null)
      setSaving(false)
      return
    }

    // .select() returns the affected rows — if the session expired, RLS
    // silently matches 0 rows with no error, so we must check the count.
    const { data, error } = isNew
      ? await supabase.from('salon_funnel_questions').insert(payload).select('id')
      : await supabase.from('salon_funnel_questions').update(payload).eq('id', editing.id).select('id')
    setSaving(false)
    if (error) { setError(error.message); return }
    if (!data || data.length === 0) {
      setError('Хадгалагдсангүй — таны нэвтрэлтийн хугацаа дууссан байж магадгүй. Гараад дахин нэвтэрч, дараа нь дахин оролдоно уу.')
      return
    }
    setEditing(null)
    load()
  }

  async function remove(q) {
    if (!window.confirm('Энэ асуултыг устгах уу?')) return
    if (demo) { setRows((rs) => rs.filter((r) => r.id !== q.id)); return }
    const { data, error } = await supabase.from('salon_funnel_questions').delete().eq('id', q.id).select('id')
    if (error) setError(error.message)
    else if (!data || data.length === 0) setError('Устгагдсангүй — гараад дахин нэвтэрч үзнэ үү.')
    else load()
  }

  async function toggleActive(q) {
    const next = !q.active
    setRows((rs) => rs.map((r) => (r.id === q.id ? { ...r, active: next } : r)))
    if (demo) return
    const { data, error } = await supabase.from('salon_funnel_questions').update({ active: next }).eq('id', q.id).select('id')
    if (error) { setError(error.message); load() }
    else if (!data || data.length === 0) { setError('Өөрчлөгдсөнгүй — гараад дахин нэвтэрч үзнэ үү.'); load() }
  }

  return (
    <>
      <div className="banner banner--info">
        Энэ нь хуваалцах холбоосны (<code>/start</code>) алхам алхмаар асуулга. Сонголтыг
        «Тэнцэхгүй» гэж тэмдэглэвэл түүнийг сонгосон үйлчлүүлэгчид төлбөрийн цонх гарахгүй.
      </div>

      <div className="admin-toolbar">
        <p className="admin-sub">Нийт {rows.length} асуулт</p>
        <div className="admin-actions">
          {!demo && <button className="btn btn--small btn--ghost" onClick={load}>Сэргээх</button>}
          <button className="btn btn--small" onClick={startNew}>+ Асуулт нэмэх</button>
        </div>
      </div>

      {error && <div className="banner banner--error">{error}</div>}

      {editing && (
        <form className="form svc-editor" onSubmit={save}>
          <h3>{editing.id ? 'Асуулт засах' : 'Шинэ асуулт'}</h3>
          <label>
            Асуулт *
            <input required value={editing.question} onChange={(e) => upd('question', e.target.value)} />
          </label>

          <div className="form__row">
            <label>
              Хариултын төрөл
              <select value={editing.type} onChange={(e) => upd('type', e.target.value)}>
                {QTYPES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={editing.required} onChange={(e) => upd('required', e.target.checked)} />
              Заавал хариулах
            </label>
          </div>

          {editing.type === 'text' ? (
            <p className="note">Үйлчлүүлэгч чөлөөт текст бичнэ — сонголт нэмэх шаардлагагүй.</p>
          ) : (
            <div className="choices-edit">
              <span className="choices-edit__title">Хариултын сонголтууд</span>
              {editing.choices.map((c, i) => (
                <div key={i} className="choice-edit-wrap">
                  <div className="choice-edit">
                    <input
                      placeholder={`Сонголт ${i + 1}`}
                      value={c.label}
                      onChange={(e) => updChoice(i, 'label', e.target.value)}
                    />
                    {editing.type === 'single' && (
                      <label className="choice-edit__next" title="Энэ хариултыг сонгосны дараа очих асуулт">
                        <span>→</span>
                        <select
                          value={c.next ?? ''}
                          onChange={(e) => updChoice(i, 'next', e.target.value || undefined)}
                        >
                          <option value="">Дараагийн асуулт</option>
                          <option value="pay">Цаг сонгож, төлбөр төлүүлэх</option>
                          <option value="end">Асуулга дуусгах</option>
                          {rows
                            .filter((r) => r.id !== editing.id)
                            .map((r, ri) => (
                              <option key={r.id} value={r.id}>
                                {ri + 1}. {r.question.length > 30 ? r.question.slice(0, 30) + '…' : r.question}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <label className="choice-edit__points" title="Энэ хариултын оноо (жишээ: 1–5)">
                      <span>★</span>
                      <input
                        type="number"
                        min="0"
                        value={c.points ?? 0}
                        onChange={(e) => updChoice(i, 'points', e.target.value)}
                      />
                    </label>
                    <label className="choice-edit__flag" title="Сонгосон үед төлбөр гарахгүй">
                      <input
                        type="checkbox"
                        checked={c.disqualifies}
                        onChange={(e) => updChoice(i, 'disqualifies', e.target.checked)}
                      />
                      Тэнцэхгүй
                    </label>
                    <button type="button" className="link-btn link-btn--danger" onClick={() => removeChoice(i)}>✕</button>
                  </div>
                  <textarea
                    className="choice-explain"
                    rows={2}
                    placeholder="Тайлбар (заавал биш) — энэ хариултыг сонгоход үйлчлүүлэгчид харагдана"
                    value={c.explain || ''}
                    onChange={(e) => updChoice(i, 'explain', e.target.value)}
                  />
                </div>
              ))}
              <button type="button" className="link-btn" onClick={addChoice}>+ Сонголт нэмэх</button>
            </div>
          )}

          <div className="form__row">
            <label>
              Эрэмбэ
              <input type="number" value={editing.sort_order} onChange={(e) => upd('sort_order', e.target.value)} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={editing.active} onChange={(e) => upd('active', e.target.checked)} />
              Идэвхтэй
            </label>
          </div>

          <div className="admin-actions">
            <button className="btn btn--small" type="submit" disabled={saving}>
              {saving ? 'Хадгалж байна…' : 'Хадгалах'}
            </button>
            <button className="btn btn--small btn--ghost" type="button" onClick={() => setEditing(null)}>
              Болих
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Ачаалж байна…</p>
      ) : rows.length === 0 ? (
        <p className="note">Асуулт алга. «+ Асуулт нэмэх» дарж эхлүүлээрэй.</p>
      ) : (
        <div className="qlist">
          {rows.map((q, idx) => (
            <div key={q.id} className={`qcard ${q.active ? '' : 'is-hidden-row'}`}>
              <div className="qcard__head">
                <strong>
                  <span className="qcard__num">{idx + 1}.</span> {q.question}
                  {q.required && <span className="funnel__req"> *</span>}
                  <span className="qtype-badge">{(QTYPES.find((t) => t.v === (q.type || 'single')) || {}).label}</span>
                </strong>
                <div className="nowrap">
                  <button
                    className={`toggle ${q.active ? 'toggle--on' : ''}`}
                    onClick={() => toggleActive(q)}
                  >
                    {q.active ? 'Идэвхтэй' : 'Нуусан'}
                  </button>
                  <button className="link-btn" onClick={() => duplicate(q)}>Хуулах</button>
                  <button className="link-btn" onClick={() => startEdit(q)}>Засах</button>
                  <button className="link-btn link-btn--danger" onClick={() => remove(q)}>Устгах</button>
                </div>
              </div>
              <div className="qcard__choices">
                {q.choices.map((c, ci) => {
                  const target =
                    c.next === 'end' ? 'дуусгах'
                    : c.next === 'pay' ? 'төлбөр'
                    : c.next ? (rows.find((r) => r.id === c.next)?.question?.slice(0, 16) ?? 'асуулт')
                    : null
                  return (
                    <span
                      key={ci}
                      className={`qchoice ${c.disqualifies ? 'qchoice--bad' : ''} ${c.next ? 'qchoice--branch' : ''}`}
                    >
                      {c.label}{c.points > 0 && ` ★${c.points}`}{c.disqualifies && ' ✕'}{target && ` → ${target}`}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
