import { useState } from 'react'
import { brand } from '../data/content.js'
import { funnelConfig } from '../data/funnel.js'
import { useFunnel } from '../lib/useFunnel.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

export default function Funnel() {
  const { questions, groups, loading } = useFunnel()
  const groupById = Object.fromEntries((groups || []).map((g) => [g.id, g]))
  const [phase, setPhase] = useState('intro') // intro | question | declined | done
  const [currentId, setCurrentId] = useState(null)
  const [history, setHistory] = useState([])
  const [answers, setAnswers] = useState({}) // single: index | multi: [indexes] | text: string
  const [saving, setSaving] = useState(false)

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
    else finish(false)
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

  // Advance after a single choice. A choice with next==='pay' finishes the
  // questionnaire immediately (treated as automatically qualified), skipping
  // whatever questions remain.
  function advanceForChoice(choice) {
    if (choice.next === 'pay') {
      setHistory((h) => [...h, current.id])
      finish(true)
      return
    }
    goTo(computeNext(choice))
  }

  // Single-choice: select then auto-advance, same as every other choice.
  // Any explanation text is shown as a caption on the choice itself.
  function pickSingle(choiceIndex) {
    const choice = current.choices[choiceIndex]
    setAnswers((a) => ({ ...a, [current.id]: choiceIndex }))
    setTimeout(() => advanceForChoice(choice), 220)
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
  // ticked choices), each multiplied by that question's group multiplier
  // (e.g. Group 1 = x1, Group 2 = x1.5). No group assigned = x1. Text
  // answers and unanswered questions contribute 0.
  function computeScore() {
    return Object.entries(answers).reduce((total, [qid, val]) => {
      const q = byId[qid]
      if (!q) return total
      const mult = q.group_id && groupById[q.group_id] ? Number(groupById[q.group_id].multiplier) || 1 : 1
      const t = q.type || 'single'
      if (t === 'single') return total + (Number(q.choices[val]?.points) || 0) * mult
      if (t === 'multi' && Array.isArray(val)) {
        return total + val.reduce((s, i) => s + (Number(q.choices[i]?.points) || 0), 0) * mult
      }
      return total
    }, 0)
  }

  function buildAnswerLog() {
    return Object.entries(answers).map(([qid, val]) => {
      const q = byId[qid]
      const t = q?.type || 'single'
      let answer
      if (t === 'single') answer = q?.choices[val]?.label ?? null
      else if (t === 'multi') answer = (Array.isArray(val) ? val.map((i) => q.choices[i]?.label).filter(Boolean) : []).join(', ')
      else answer = val || null
      return { question: q?.question ?? qid, answer }
    })
  }

  // Find the Telegram username answer among the questions (matched by the
  // question text containing "телеграм"), regardless of its question id —
  // admins can freely edit/reorder questions without breaking this.
  function findTelegramAnswer() {
    const entry = Object.entries(answers).find(([qid]) => {
      const q = byId[qid]
      return q && /телеграм/i.test(q.question || '')
    })
    if (!entry) return null
    const [qid, val] = entry
    const q = byId[qid]
    const t = q?.type || 'single'
    if (t === 'text') return (val || '').trim() || null
    if (t === 'single') return q.choices[val]?.label ?? null
    return null
  }

  async function saveSubmission(qualified) {
    if (!supabaseConfigured) return
    await supabase.from('salon_funnel_submissions').insert({
      name: findTelegramAnswer(),
      phone: null,
      answers: buildAnswerLog(),
      qualified,
      payment_status: 'n/a',
      amount: null,
      score: computeScore(),
    })
  }

  // Register the person in the manager app's customer journal (customers
  // table), keyed by their Telegram username so repeat visits under the same
  // handle merge into one customer instead of duplicating.
  async function createJournalCustomer() {
    if (!supabaseConfigured) return
    try {
      const name = (findTelegramAnswer() || '').trim()
      if (!name) return
      // Skip the Telegram question itself in the Q&A list below — it's
      // already shown as the headline "Телеграм:" line, no need to repeat it.
      const tgQuestionText = Object.values(byId).find((q) => /телеграм/i.test(q.question || ''))?.question
      const qaLines = buildAnswerLog()
        .filter((a) => a.question !== tgQuestionText)
        .map((a, i) => `${i + 1}) ${a.question}\n    → ${a.answer || '—'}`)
        .join('\n\n')
      const noteText = 'Вэб анкетаас бүртгэгдсэн.\n' +
        'Телеграм: ' + name + '\n\n' +
        qaLines
      const note = { date: new Date().toISOString().slice(0, 10), text: noteText, by: 'Вэб' }
      // Goes through a security-definer RPC (not direct table access) so the
      // public anon key never needs read/write on the shared customers table —
      // see the register_funnel_lead function in the lockdown SQL.
      await supabase.rpc('register_funnel_lead', { p_name: name, p_note: note })
    } catch { /* best effort — the submission itself is already saved */ }
  }

  // Called when the questionnaire ends (no more questions, or a choice
  // jumped straight to the end). `force` = treat as qualified regardless of
  // disqualifying answers (used by the "pay" branch).
  async function finish(force) {
    if (saving) return
    setSaving(true)
    const qualified = force || evaluate()
    await saveSubmission(qualified)
    if (qualified) await createJournalCustomer()
    setSaving(false)
    setPhase(qualified ? 'done' : 'declined')
  }

  const progress =
    phase === 'intro' ? 0
    : phase === 'question' ? Math.min(95, Math.round(((history.length + 1) / (ordered.length || 1)) * 100))
    : 100

  return (
    <div className="funnel">
      <div className="funnel__card">
        <div className="funnel__top">
          <span className="funnel__brand">✦ {brand.name}</span>
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
                      disabled={saving}
                    >
                      <span className="choice__dot" />
                      <span className="choice__text">
                        {c.label}
                        {c.explain && c.explain.trim() && (
                          <span className="choice__caption">{c.explain}</span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
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
                <button className="btn funnel__cta" disabled={!canAdvance || saving} onClick={advanceSequential}>
                  {saving ? 'Илгээж байна…' : 'Цааш →'}
                </button>
              )}
            </div>
          </div>
        ) : phase === 'declined' ? (
          <div className="funnel__screen funnel__center">
            <div className="funnel__badge">!</div>
            <h1>{funnelConfig.declineTitle}</h1>
            <p className="funnel__lead">{funnelConfig.declineText}</p>
          </div>
        ) : (
          <div className="funnel__screen funnel__center">
            <div className="funnel__badge funnel__badge--ok">✓</div>
            <h1>{funnelConfig.doneTitle}</h1>
            <p className="funnel__lead">{funnelConfig.doneText}</p>
          </div>
        )}
      </div>
    </div>
  )
}
