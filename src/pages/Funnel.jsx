import { useState } from 'react'
import { Link } from 'react-router-dom'
import { brand } from '../data/content.js'
import { funnelConfig } from '../data/funnel.js'
import { useFunnel } from '../lib/useFunnel.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const fmtAmount = (n) => `${Number(n).toLocaleString('en-US')}₮`

export default function Funnel() {
  const { questions, loading } = useFunnel()
  const [phase, setPhase] = useState('intro') // intro | question | contact | payment | declined | done
  const [currentId, setCurrentId] = useState(null)
  const [history, setHistory] = useState([]) // visited question ids (for Back)
  const [answers, setAnswers] = useState({}) // { [questionId]: choiceIndex }
  const [contact, setContact] = useState({ name: '', phone: '' })
  const [paying, setPaying] = useState(false)

  // Active questions, sorted — `ordered` drives the sequential fallback,
  // `byId` resolves branch jumps.
  const ordered = [...questions].sort((a, b) => a.sort_order - b.sort_order)
  const byId = Object.fromEntries(ordered.map((q) => [q.id, q]))
  const current = byId[currentId]

  function startFunnel() {
    if (!ordered.length) return
    setAnswers({})
    setHistory([])
    setCurrentId(ordered[0].id)
    setPhase('question')
  }

  // Where does this choice lead?
  function resolveNext(question, choice) {
    if (choice.next === 'end') return null
    if (choice.next && byId[choice.next]) return choice.next
    const idx = ordered.findIndex((q) => q.id === question.id)
    return ordered[idx + 1]?.id ?? null
  }

  function pick(choiceIndex) {
    const choice = current.choices[choiceIndex]
    setAnswers((a) => ({ ...a, [current.id]: choiceIndex }))
    const nextId = resolveNext(current, choice)
    // Brief delay so the selection is visible before advancing.
    setTimeout(() => {
      setHistory((h) => [...h, current.id])
      if (nextId) setCurrentId(nextId)
      else setPhase('contact')
    }, 220)
  }

  function back() {
    if (phase === 'contact') {
      // Return to the last answered question.
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

  // Qualified only if every ANSWERED question used a non-disqualifying choice.
  function evaluate() {
    return Object.entries(answers).every(([qid, ci]) => {
      const q = byId[qid]
      return q && !q.choices[ci]?.disqualifies
    })
  }

  async function saveSubmission(qualified, paymentStatus) {
    if (!supabaseConfigured) return
    const answerLog = Object.entries(answers).map(([qid, ci]) => ({
      question: byId[qid]?.question ?? qid,
      answer: byId[qid]?.choices[ci]?.label ?? null,
    }))
    await supabase.from('funnel_submissions').insert({
      name: contact.name,
      phone: contact.phone,
      answers: answerLog,
      qualified,
      payment_status: paymentStatus,
      amount: funnelConfig.depositAmount,
    })
  }

  function submitContact(e) {
    e.preventDefault()
    if (evaluate()) {
      setPhase('payment')
    } else {
      saveSubmission(false, 'n/a')
      setPhase('declined')
    }
  }

  async function payNow() {
    setPaying(true)
    // MOCK QPay — simulates a successful payment. Replace with a real QPay
    // invoice + status check once merchant credentials are connected.
    await new Promise((r) => setTimeout(r, 1300))
    await saveSubmission(true, 'paid')
    setPaying(false)
    setPhase('done')
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
              <h2>{current.question}</h2>
              <div className="funnel__choices">
                {current.choices.map((c, ci) => (
                  <button
                    key={ci}
                    className={`choice ${answers[current.id] === ci ? 'is-selected' : ''}`}
                    onClick={() => pick(ci)}
                  >
                    <span className="choice__dot" />
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="funnel__nav">
              <button className="btn btn--ghost btn--small" onClick={back}>← Буцах</button>
            </div>
          </div>
        ) : phase === 'contact' ? (
          <form className="funnel__screen" onSubmit={submitContact}>
            <h2>Холбоо барих мэдээлэл</h2>
            <p className="funnel__lead">Захиалгаа баталгаажуулахын тулд нэр, утсаа үлдээнэ үү.</p>
            <label className="funnel__label">
              Нэр
              <input required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </label>
            <label className="funnel__label">
              Утас
              <input required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </label>
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
              <div className="qpay__qr" aria-label="QPay QR">
                <div className="qpay__qrgrid" />
                <span className="qpay__qrlabel">QPay QR</span>
              </div>
              <p className="qpay__hint">Банкны аппаараа QR-ийг уншуулна уу</p>
              <div className="qpay__demo">Туршилтын горим — доорх товчоор төлбөрийг дуурайна</div>
            </div>
            <button className="btn funnel__cta" onClick={payNow} disabled={paying}>
              {paying ? 'Төлбөр шалгаж байна…' : `QPay-ээр ${fmtAmount(funnelConfig.depositAmount)} төлөх`}
            </button>
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
