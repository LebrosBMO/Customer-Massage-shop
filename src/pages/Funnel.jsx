import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { brand } from '../data/content.js'
import { funnelConfig, bookingSlots } from '../data/funnel.js'
import { useFunnel } from '../lib/useFunnel.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const fmtAmount = (n) => `${Number(n).toLocaleString('en-US')}₮`
// Real QPay payments go through the "qpay" Edge Function; without Supabase we stay in demo mode.
const QPAY_FN = supabaseConfigured ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qpay` : null

export default function Funnel() {
  const { questions, loading } = useFunnel()
  const [phase, setPhase] = useState('intro') // intro | question | contact | payment | declined | done
  const [currentId, setCurrentId] = useState(null)
  const [history, setHistory] = useState([])
  const [answers, setAnswers] = useState({}) // single: index | multi: [indexes] | text: string
  const [contact, setContact] = useState({ name: '', phone: '', date: '', time: '' })
  const [forcePay, setForcePay] = useState(false)
  const [paying, setPaying] = useState(false)
  const [invoice, setInvoice] = useState(null) // { submissionId, qrImage, shortUrl }
  const [payErr, setPayErr] = useState('')
  const pollRef = useRef(null)

  // Stop polling for payment when leaving the page
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

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
      amount: funnelConfig.depositAmount,
    })
  }

  function submitContact(e) {
    e.preventDefault()
    // forcePay answers go straight to prepayment; otherwise qualify normally.
    if (forcePay || evaluate()) setPhase('payment')
    else { saveSubmission(false, 'n/a'); setPhase('declined') }
  }

  // Create a real QPay invoice via the Edge Function, then poll until paid.
  async function payNow() {
    if (!QPAY_FN) { // demo mode (no Supabase configured)
      setPaying(true)
      await new Promise((r) => setTimeout(r, 1300))
      await saveSubmission(true, 'paid')
      setPaying(false)
      setPhase('done')
      return
    }
    setPaying(true)
    setPayErr('')
    try {
      const r = await fetch(QPAY_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: contact.name, phone: contact.phone, answers: buildAnswerLog() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.error || !j.submissionId) throw new Error(j.error || 'invoice')
      setInvoice(j)
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(() => checkPayment(j.submissionId, true), 4000)
    } catch {
      setPayErr('Нэхэмжлэл үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.')
    }
    setPaying(false)
  }

  async function checkPayment(subId, silent) {
    const id = subId || invoice?.submissionId
    if (!id || !QPAY_FN) return
    try {
      const r = await fetch(QPAY_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', submission_id: id }),
      })
      const j = await r.json().catch(() => ({}))
      if (j.paid) {
        if (pollRef.current) clearInterval(pollRef.current)
        setPhase('done')
      } else if (!silent) {
        setPayErr('Төлбөр хараахан бүртгэгдээгүй байна. Төлснөөс хойш хэдэн секунд хүлээгээд дахин шалгана уу.')
      }
    } catch {
      if (!silent) setPayErr('Шалгахад алдаа гарлаа. Дахин оролдоно уу.')
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
            <h1>{funnelConfig.intro.title}</h1>
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
            <div className="funnel__row">
              <label className="funnel__label">
                Өдөр
                <input type="date" required min={todayStr} value={contact.date} onChange={(e) => setContact({ ...contact, date: e.target.value })} />
              </label>
              <label className="funnel__label">
                Цаг
                <select required value={contact.time} onChange={(e) => setContact({ ...contact, time: e.target.value })}>
                  <option value="">— Цаг сонгох —</option>
                  {slots.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>
            <p className="funnel__hint">Ажлын цаг: {funnelConfig.booking.open}–{funnelConfig.booking.close} · Үйлчилгээ {funnelConfig.booking.serviceMin} мин</p>
            <div className="funnel__nav">
              <button type="button" className="btn btn--ghost btn--small" onClick={back}>← Буцах</button>
              <button type="submit" className="btn funnel__cta">Үргэлжлүүлэх →</button>
            </div>
          </form>
        ) : phase === 'payment' ? (
          <div className="funnel__screen funnel__center">
            <div className="funnel__badge funnel__badge--ok">✓</div>
            <h1>{funnelConfig.qualifyTitle}</h1>
            <p className="funnel__lead">{funnelConfig.qualifyText}</p>
            <div className="qpay">
              <div className="qpay__amount">{fmtAmount(funnelConfig.depositAmount)}</div>
              {invoice?.qrImage ? (
                <>
                  <img
                    src={`data:image/png;base64,${invoice.qrImage}`}
                    alt="QPay QR"
                    style={{ width: 210, height: 210, borderRadius: 12, background: '#fff', padding: 8, margin: '0 auto', display: 'block' }}
                  />
                  <p className="qpay__hint">Банкны аппаараа QR-ийг уншуулж төлнө үү — төлмөгц автоматаар үргэлжилнэ</p>
                  {invoice.shortUrl && (
                    <a className="btn btn--ghost btn--small" href={invoice.shortUrl} target="_blank" rel="noreferrer">
                      📱 Утаснаас банкны апп нээх
                    </a>
                  )}
                </>
              ) : (
                <>
                  <div className="qpay__qr" aria-label="QPay QR">
                    <div className="qpay__qrgrid" />
                    <span className="qpay__qrlabel">QPay QR</span>
                  </div>
                  {QPAY_FN
                    ? <p className="qpay__hint">Доорх товчийг дарж QPay нэхэмжлэл үүсгэнэ үү</p>
                    : <div className="qpay__demo">Туршилтын горим — доорх товчоор төлбөрийг дуурайна</div>}
                </>
              )}
              {payErr && <p style={{ color: '#e08585', fontSize: 13, marginTop: 10 }}>{payErr}</p>}
            </div>
            {invoice ? (
              <button className="btn funnel__cta" onClick={() => checkPayment()}>
                Төлбөр шалгах ✓
              </button>
            ) : (
              <button className="btn funnel__cta" onClick={payNow} disabled={paying}>
                {paying ? 'Түр хүлээнэ үү…' : `QPay-ээр ${fmtAmount(funnelConfig.depositAmount)} төлөх`}
              </button>
            )}
          </div>
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
