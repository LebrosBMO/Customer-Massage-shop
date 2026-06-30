import { useState } from 'react'
import { faq } from '../data/content.js'

export default function Faq() {
  const [open, setOpen] = useState(0)

  return (
    <div className="section container narrow">
      <header className="page-head">
        <h1>Түгээмэл асуултууд</h1>
        <p>Анхны зочлолтоосоо өмнө мэдэхийг хүсэж болох бүхэн.</p>
      </header>

      <div className="accordion">
        {faq.map((item, i) => (
          <div key={i} className={`accordion__item ${open === i ? 'is-open' : ''}`}>
            <button className="accordion__head" onClick={() => setOpen(open === i ? -1 : i)}>
              <span>{item.q}</span>
              <span className="accordion__icon">{open === i ? '−' : '+'}</span>
            </button>
            <div className="accordion__panel">
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
