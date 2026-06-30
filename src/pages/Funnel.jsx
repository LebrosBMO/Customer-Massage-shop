import { useState } from 'react'
import { Link } from 'react-router-dom'
import { brand } from '../data/content.js'
import { funnelConfig } from '../data/funnel.js'
import { useFunnel } from '../lib/useFunnel.js'
import { supabase, supabaseConfigured } from '../lib/supabase.js'

const chunk = (arr, n) => {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

const fmtAmount = (n) => `${Number(n).toLocaleString('en-US')}₮`

export default function Funnel() {
  const { questions, loading } = useFunnel()
  const [phase, setPhase] = useState('intro') // intro | questions | contact | payment | declined | done
  const [qStep, setQStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [contact, setContact] = useState({ name: '', phone: '' })
  const [paying, setPaying] = useState(false)

  const perStep = funnelConfig.perStep || 2
  const chunks = chunk(questions, perStep)
  const currentChunk = chunks[qStep] || []
  const chunkAnswered = currentChunk.every((q) => answers[q.id] != null)
  const totalSteps = chunks.length + 1 // questions chunks + contact

  function pick(qid, ci) {
    setAnswers((a) => ({ ...a, [qid]: ci }))
  }

  function nextFromQuestions() {
    if (qStep < chunks.length - 1) setQStep(qStep + 1)
    else setPhase('contact')
  }
  function backFromQuestions() {
    if (qStep > 0) setQStep(qStep - 1)
    else setPhase('intro')
  }

  // Customer qualifies only if every question is answered with a
  // non-disqualifying choice.
  function evaluate() {
    return questions.every((q) => {
      const ci = answers[q.id]
      return ci != null && !q.choices[ci]?.disqualifies
    })
  }

  async function saveSubmission(qualified, paymentStatus) {
    if (!supabaseConfigured) return
    const answerLog = questions.map((q) => ({
      question: q.question,
      answer: q.choices[answers[q.id]]?.label ?? null,
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
    phase === 'questions'
      ? Math.round(((qStep + 0.5) / totalSteps) * 100)
      : phase === 'contact'
      ? Math.round((chunks.length / totalSteps) * 100)
      : phase === 'intro'
      ? 0
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
            <button className="btn funnel__cta" onClick={() => setPhase('questions')}>
              {funnelConfig.intro.cta}
            </button>
          </div>
        ) : phase === 'questions' ? (
          <div className="funnel__screen">
            {currentChunk.map((q) => (
              <div key={q.id} className="funnel__q">
                <h2>{q.question}</h2>
                <div className="funnel__choices">
                  {q.choices.map((c, ci) => (
                    <button
                      key={ci}
                      className={`choice ${answers[q.id] === ci ? 'is-selected' : ''}`}
                      onClick={() => pick(q.id, ci)}
                    >
                      <span className="choice__dot" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="funnel__nav">
              <button className="btn btn--ghost btn--small" onClick={backFromQuestions}>← Буцах</button>
              <button className="btn funnel__cta" disabled={!chunkAnswered} onClick={nextFromQuestions}>
                Цааш →
              </button>
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
              <button type="button" className="btn btn--ghost btn--small" onClick={() => setPhase('questions')}>← Буцах</button>
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
