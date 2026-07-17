import { useState, useRef } from 'react'
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
  // Refs, not state — a ref is one shared mutable value, so every closure
  // (including a stale one from a setTimeout scheduled a render or two ago)
  // reads/writes the SAME up-to-date flag/value.
  //
  // answersRef mirrors `answers` and is what finish()/evaluate()/computeScore()
  // /buildAnswerLog() actually read from. This is the fix for the real bug:
  // pickSingle's auto-advance goes through `setTimeout(() => advanceForChoice(...), 220)`.
  // That timeout callback is the closure captured at the moment of THIS click —
  // it closes over THIS render's `answers`, not the answers-with-this-answer-
  // just-added, because `setAnswers` only takes effect on a LATER render. So on
  // the LAST question, finish() always ran with the answers as they were
  // BEFORE the final pick — the very last answer was silently dropped from
  // every single submission, every time, not just on a double-tap. A ref
  // sidesteps this entirely: mutating answersRef.current is visible
  // immediately to any closure, stale or not.
  const answersRef = useRef({})
  // Guards against a fast double-tap firing pickSingle/finish twice — two
  // overlapping calls used to be able to write two near-simultaneous
  // submissions to the DB. Still worth keeping alongside the fix above.
  const advancingRef = useRef(false)
  const submittingRef = useRef(false)

  // Use this instead of setAnswers directly — keeps answersRef in lockstep.
  function updateAnswers(updater) {
    setAnswers((a) => {
      const next = updater(a)
      answersRef.current = next
      return next
    })
  }

  const ordered = [...questions].sort((a, b) => a.sort_order - b.sort_order)
  const byId = Object.fromEntries(ordered.map((q) => [q.id, q]))
  const current = byId[currentId]
  const qtype = current?.type || 'single'

  function startFunnel() {
    if (!ordered.length) return
    answersRef.current = {}
    setAnswers({})
    setHistory([])
    setCurrentId(ordered[0].id)
    setPhase('question')
  }

  function goTo(nextId) {
    setHistory((h) => [...h, current.id])
    advancingRef.current = false // landing on a new question (or finishing) — allow the next pick
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
    if (advancingRef.current) return // already picked for this question — ignore a fast double-tap
    advancingRef.current = true
    const choice = current.choices[choiceIndex]
    updateAnswers((a) => ({ ...a, [current.id]: choiceIndex }))
    setTimeout(() => advanceForChoice(choice), 220)
  }

  function toggleMulti(choiceIndex) {
    updateAnswers((a) => {
      const cur = Array.isArray(a[current.id]) ? a[current.id] : []
      const next = cur.includes(choiceIndex)
        ? cur.filter((x) => x !== choiceIndex)
        : [...cur, choiceIndex]
      return { ...a, [current.id]: next }
    })
  }

  function setText(value) {
    updateAnswers((a) => ({ ...a, [current.id]: value }))
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
  // Reads answersRef (not the `answers` state) — see the comment on
  // answersRef's declaration for why: this runs from inside finish(), which
  // can be called from a stale closure that doesn't include the final pick.
  function evaluate() {
    return Object.entries(answersRef.current).every(([qid, val]) => {
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
    return Object.entries(answersRef.current).reduce((total, [qid, val]) => {
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
    return Object.entries(answersRef.current).map(([qid, val]) => {
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
    const entry = Object.entries(answersRef.current).find(([qid]) => {
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
    const { error } = await supabase.from('salon_funnel_submissions').insert({
      name: findTelegramAnswer(),
      phone: null,
      answers: buildAnswerLog(),
      qualified,
      payment_status: 'n/a',
      amount: null,
      score: computeScore(),
    })
    // This used to fail silently for every fractional score (e.g. 72.5, from
    // a x1.5 group multiplier) because the `score` column was `int` — Postgres
    // rejected the insert and the error was never checked, so it just vanished.
    // Logged (not thrown) so a real customer's submission still completes even
    // if this table write fails for some other reason in the future.
    if (error) console.error('saveSubmission failed:', error.message)
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
      const score = computeScore()
      const noteText = 'Вэб анкетаас бүртгэгдсэн.\n' +
        'Телеграм: ' + name + '\n' +
        (score > 0 ? '★ Оноо: ' + score + '\n' : '') +
        '\n' + qaLines
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
    // A ref, not the `saving` state, is the real guard here: `saving` is read
    // from whichever render's closure called finish(), so two near-
    // simultaneous calls from two different closures can both see saving as
    // still false and both slip through. submittingRef is one shared mutable
    // flag every closure reads/writes the same copy of.
    if (submittingRef.current) return
    submittingRef.current = true
    setSaving(true)
    const qualified = force || evaluate()
    await saveSubmission(qualified)
    if (qualified) await createJournalCustomer()
    setSaving(false)
    submittingRef.current = false
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
