import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { brand } from '../data/content.js'
import { funnelConfig, bookingSlots } from '../data/funnel.js'
import { useFunnel } from '../lib/useFunnel.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

export default function Funnel() {
  const { questions, loading } = useFunnel()
  const [phase, setPhase] = useState('intro') // intro | question | contact | declined | done
  const [currentId, setCurrentId] = useState(null)
  const [history, setHistory] = useState([])
  const [answers, setAnswers] = useState({}) // single: index | multi: [indexes] | text: string
  const [contact, setContact] = useState({ name: '', phone: '', date: '', time: '' })
  const [forcePay, setForcePay] = useState(false)
  const [saving, setSaving] = useState(false)
  const [takenSlots, setTakenSlots] = useState([]) // times already booked for the chosen date
  const [loadingSlots, setLoadingSlots] = useState(false)

  // When the chosen date changes, load which time slots are already taken.
  // Only the date + time are read here (no personal details), so it's safe.
  useEffect(() => {
    let alive = true
    if (!supabaseConfigured || !contact.date) { setTakenSlots([]); return }
    setLoadingSlots(true)
    supabase
      .from('salon_booked_slots')
      .select('time')
      .eq('date', contact.date)
      .neq('status', 'cancelled')
      .then(({ data }) => {
        if (!alive) return
        const taken = (data || []).map((r) => r.time)
        setTakenSlots(taken)
        setLoadingSlots(false)
        // If the currently selected time just became unavailable, clear it.
        setContact((c) => (taken.includes(c.time) ? { ...c, time: '' } : c))
      })
    return () => { alive = false }
  }, [contact.date])

  // Record a booked slot (safe table: date/time/status only) once paid.
  async function reserveSlot() {
    if (!supabaseConfigured || !contact.date || !contact.time) return
    await supabase.from('salon_booked_slots').insert({ date: contact.date, time: contact.time, status: 'booked' })
  }

  const slots = bookingSlots()
  const todayStr = new Date().toISOString().slice(0, 10)

  const ordered = [...questions].sort((a, b) => a.sort_order - b.sort_order)
  const byId = Object.fromEntries(ordered.map((q) => [q.id, q]))
  const current = byId[currentId]
  const qtype = current?.type || 'single'

  function startFunnel() {
    if (!ordered.length) return
    setAnswers({})
    setHistory([])
    setCurrentId(ordered[0].id)
    setPhase('question')
  }

  function goTo(nextId) {
    setHistory((h) => [...h, current.id])
    if (nextId) setCurrentId(nextId)
    else setPhase('contact')
  }

  function sequentialNextId() {
    const idx = ordered.findIndex((q) => q.id === current.id)
    return ordered[idx + 1]?.id ?? null
  }

  function computeNext(choice) {
    if (choice.next === 'end') return null
    if (choice.next && byId[choice.next]) return choice.next
    return sequentialNextId()
  }

  // Advance after a single choice. A choice with next==='pay' jumps straight
  // to the booking + prepayment step, skipping the remaining questions.
  function advanceForChoice(choice) {
    if (choice.next === 'pay') {
      setForcePay(true)
      setHistory((h) => [...h, current.id])
      setPhase('contact')
      return
    }
    goTo(computeNext(choice))
  }

  // Single-choice: select then auto-advance — UNLESS the choice has an
  // explanation, in which case pause and show it with a Continue button.
  function pickSingle(choiceIndex) {
    const choice = current.choices[choiceIndex]
    setAnswers((a) => ({ ...a, [current.id]: choiceIndex }))
    if (choice.explain && choice.explain.trim()) return
    setTimeout(() => advanceForChoice(choice), 220)
  }

  function continueSingle() {
    advanceForChoice(current.choices[answers[current.id]])
  }

  function toggleMulti(choiceIndex) {
    setAnswers((a) => {
      const cur = Array.isArray(a[current.id]) ? a[current.id] : []
      const next = cur.includes(choiceIndex)
        ? cur.filter((x) => x !== choiceIndex)
        : [...cur, choiceIndex]
      return { ...a, [current.id]: next }
    })
  }

  function setText(value) {
    setAnswers((a) => ({ ...a, [current.id]: value }))
  }

  // Next button for multi/text questions.
  function advanceSequential() {
    goTo(sequentialNextId())
  }

  function back() {
    if (phase === 'contact') {
      const last = history[history.length - 1]
      if (last) { setHistory((h) => h.slice(0, -1)); setCurrentId(last); setPhase('question') }
      else setPhase('intro')
      return
    }
    if (history.length) {
      const last = history[history.length - 1]
      setHistory((h) => h.slice(0, -1))
      setCurrentId(last)
    } else {
      setPhase('intro')
    }
  }

  // Has the current question been answered (for the required check)?
  const answered = (() => {
    const v = answers[current?.id]
    if (qtype === 'multi') return Array.isArray(v) && v.length > 0
    if (qtype === 'text') return typeof v === 'string' && v.trim().length > 0
    return v != null
  })()
  const canAdvance = !current?.required || answered

  // For single-choice: the selected choice and whether it has an explanation.
  const selChoice = qtype === 'single' && answers[current?.id] != null ? current.choices[answers[current.id]] : null
  const selHasExplain = !!(selChoice && selChoice.explain && selChoice.explain.trim())

  // Qualified only if every answered choice-question used a valid choice.
  function evaluate() {
    return Object.entries(answers).every(([qid, val]) => {
      const q = byId[qid]
      if (!q) return true
      const t = q.type || 'single'
      if (t === 'single') return !q.choices[val]?.disqualifies
      if (t === 'multi') return !(Array.isArray(val) && val.some((i) => q.choices[i]?.disqualifies))
      return true // text never disqualifies
    })
  }

  // Sum the points of every selected choice (single: one choice, multi: all
  // ticked choices). Text answers and unanswered questions contribute 0.
  function computeScore() {
    return Object.entries(answers).reduce((total, [qid, val]) => {
      const q = byId[qid]
      if (!q) return total
      const t = q.type || 'single'
      if (t === 'single') return total + (Number(q.choices[val]?.points) || 0)
      if (t === 'multi' && Array.isArray(val)) {
        return total + val.reduce((s, i) => s + (Number(q.choices[i]?.points) || 0), 0)
      }
      return total
    }, 0)
  }

  function buildAnswerLog() {
    const answerLog = Object.entries(answers).map(([qid, val]) => {
      const q = byId[qid]
      const t = q?.type || 'single'
      let answer
      if (t === 'single') answer = q?.choices[val]?.label ?? null
      else if (t === 'multi') answer = (Array.isArray(val) ? val.map((i) => q.choices[i]?.label).filter(Boolean) : []).join(', ')
      else answer = val || null
      return { question: q?.question ?? qid, answer }
    })
    // Record the chosen booking time alongside the answers.
    if (contact.date || contact.time) {
      answerLog.push({ question: 'Захиалсан цаг', answer: `${contact.date || ''} ${contact.time || ''}`.trim() })
    }
    return answerLog
  }

  async function saveSubmission(qualified, paymentStatus) {
    if (!supabaseConfigured) return
    await supabase.from('salon_funnel_submissions').insert({
      name: contact.name,
      phone: contact.phone,
      answers: buildAnswerLog(),
      qualified,
      payment_status: paymentStatus,
      amount: null,
      score: computeScore(),
    })
  }

  // Register the person in the manager app's customer journal (customers table):
  // existing name → append a note; new name → create with a unique SLA code.
  async function createJournalCustomer() {
    if (!supabaseConfigured) return
    try {
      const name = (contact.name || '').trim()
      if (!name) return
      const noteText = 'Вэб анкетаас бүртгэгдсэн.\nУтас: ' + (contact.phone || '—') +
        '\nЗахиалсан цаг: ' + `${contact.date || ''} ${contact.time || ''}`.trim() + '\n' +
        buildAnswerLog().filter((a) => a.question !== 'Захиалсан цаг').map((a) => `${a.question}: ${a.answer ?? ''}`).join('\n')
      const note = { date: new Date().toISOString().slice(0, 10), text: noteText, by: 'Вэб' }
      const { data: ex } = await supabase.from('customers').select('id,notes').ilike('name', name).limit(1)
      if (ex && ex.length) {
        const c = ex[0]
        await supabase.from('customers').update({ notes: [...(Array.isArray(c.notes) ? c.notes : []), note] }).eq('id', c.id)
        return
      }
      const { data: codes } = await supabase.from('customers').select('code')
      const used = new Set((codes || []).map((r) => r.code))
      let code
      do { code = 'SLA-' + Math.floor(1000 + Math.random() * 9000) } while (used.has(code))
      await supabase.from('customers').insert({ id: 'cu' + Date.now(), code, name, notes: [note] })
    } catch { /* best effort — the submission itself is already saved */ }
  }

  async function submitContact(e) {
    e.preventDefault()
    if (saving) return
    if (forcePay || evaluate()) {
      setSaving(true)
      await saveSubmission(true, 'n/a')
      await reserveSlot()
      await createJournalCustomer()
      setSaving(false)
      setPhase('done')
    } else {
      saveSubmission(false, 'n/a')
      setPhase('declined')
    }
  }

  const progress =
    phase === 'intro' ? 0
    : phase === 'question' ? Math.min(95, Math.round(((history.length + 1) / (ordered.length + 1)) * 100))
    : phase === 'contact' ? 92
    : 100

  return (
    <div className="funnel">
      <div className="funnel__card">
        <div className="funnel__top">
          <span className="funnel__brand">✦ {brand.name}</span>
          <Link to="/" className="funnel__exit">Сайт үзэх</Link>
        </div>

        {phase !== 'intro' && phase !== 'done' && phase !== 'declined' && (
          <div className="funnel__progress"><span style={{ width: `${progress}%` }} /></div>
        )}

        {loading ? (
          <p className="funnel__loading">Ачаалж байна…</p>
        ) : phase === 'intro' ? (
          <div className="funnel__screen funnel__center">
            <div className="funnel__icon">✦</div>
            {funnelConfig.intro.title && <h1>{funnelConfig.intro.title}</h1>}
            <p className="funnel__lead">{funnelConfig.intro.text}</p>
            <button className="btn funnel__cta" onClick={startFunnel}>{funnelConfig.intro.cta}</button>
          </div>
        ) : phase === 'question' && current ? (
          <div className="funnel__screen">
            <div className="funnel__q">
              <h2>{current.question}{current.required && <span className="funnel__req"> *</span>}</h2>

              {qtype === 'single' && (
                <div className="funnel__choices">
                  {current.choices.map((c, ci) => (
                    <button
                      key={ci}
                      className={`choice ${answers[current.id] === ci ? 'is-selected' : ''}`}
                      onClick={() => pickSingle(ci)}
                    >
                      <span className="choice__dot" />{c.label}
                    </button>
                  ))}
                </div>
              )}

              {qtype === 'single' && selHasExplain && (
                <div className="funnel__explain">{selChoice.explain}</div>
              )}

              {qtype === 'multi' && (
                <div className="funnel__choices">
                  {current.choices.map((c, ci) => {
                    const sel = Array.isArray(answers[current.id]) && answers[current.id].includes(ci)
                    return (
                      <button
                        key={ci}
                        className={`choice ${sel ? 'is-selected' : ''}`}
                        onClick={() => toggleMulti(ci)}
                      >
                        <span className="choice__box">{sel && '✓'}</span>{c.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {qtype === 'text' && (
                <textarea
                  className="funnel__text"
                  rows={4}
                  value={answers[current.id] || ''}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Энд бичнэ үү…"
                />
              )}
            </div>

            <div className="funnel__nav">
              <button className="btn btn--ghost btn--small" onClick={back}>← Буцах</button>
              {qtype !== 'single' && (
                <button className="btn funnel__cta" disabled={!canAdvance} onClick={advanceSequential}>
                  Цааш →
                </button>
              )}
              {qtype === 'single' && selHasExplain && (
                <button className="btn funnel__cta" onClick={continueSingle}>
                  Үргэлжлүүлэх →
                </button>
              )}
            </div>
          </div>
        ) : phase === 'contact' ? (
          <form className="funnel__screen" onSubmit={submitContact}>
            <h2>Цаг сонгож, мэдээллээ үлдээнэ үү</h2>
            <p className="funnel__lead">Захиалгаа баталгаажуулахын тулд нэр, утас, зочлох цагаа сонгоно уу.</p>
            <label className="funnel__label">
              Нэр
              <input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </label>
            <label className="funnel__label">
              Утас
              <input required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </label>
            <label className="funnel__label">
              Өдөр
              <input type="date" required min={todayStr} value={contact.date} onChange={(e) => setContact({ ...contact, date: e.target.value, time: '' })} />
            </label>

            {contact.date && (
              <div className="slotbox">
                <div className="slotbox__head">
                  <span>Цаг сонгох</span>
                  {loadingSlots && <span className="slotbox__loading">шалгаж байна…</span>}
                </div>
                <div className="slotgrid">
                  {slots.map((s) => {
                    const taken = takenSlots.includes(s)
                    return (
                      <button
                        type="button"
                        key={s}
                        className={`slot ${contact.time === s ? 'is-selected' : ''} ${taken ? 'is-taken' : ''}`}
                        disabled={taken}
                        onClick={() => setContact({ ...contact, time: s })}
                      >
                        {s}
                        {taken && <span className="slot__tag">Захиалсан</span>}
                      </button>
                    )
                  })}
                </div>
                <p className="funnel__hint">Ажлын цаг: {funnelConfig.booking.open}–{funnelConfig.booking.close} · Үйлчилгээ {funnelConfig.booking.serviceMin} мин</p>
              </div>
            )}

            <div className="funnel__nav">
              <button type="button" className="btn btn--ghost btn--small" onClick={back}>← Буцах</button>
              <button type="submit" className="btn funnel__cta" disabled={!contact.date || !contact.time || saving}>{saving ? 'Илгээж байна…' : 'Захиалах →'}</button>
            </div>
          </form>
        ) : phase === 'declined' ? (
          <div className="funnel__screen funnel__center">
            <div className="funnel__badge">!</div>
            <h1>{funnelConfig.declineTitle}</h1>
            <p className="funnel__lead">{funnelConfig.declineText}</p>
            <Link to="/" className="btn btn--ghost">Үйлчилгээ үзэх</Link>
          </div>
        ) : (
          <div className="funnel__screen funnel__center">
            <div className="funnel__badge funnel__badge--ok">✓</div>
            <h1>{funnelConfig.doneTitle}</h1>
            <p className="funnel__lead">{funnelConfig.doneText}</p>
            <Link to="/" className="btn">Нүүр хуудас</Link>
          </div>
        )}
      </div>
    </div>
  )
}
