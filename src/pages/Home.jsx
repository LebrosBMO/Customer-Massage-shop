import { Link } from 'react-router-dom'
import { brand, testimonials } from '../data/content.js'
import { useServices } from '../lib/useServices.js'

export default function Home() {
  const { services } = useServices()

  return (
    <>
      <section className="hero">
        <div className="hero__overlay" />
        <div className="container hero__content">
          <p className="hero__eyebrow">{brand.tagline}</p>
          <h1>{brand.name}</h1>
          <p className="hero__intro">{brand.intro}</p>
          <div className="hero__actions">
            <Link to="/reservation" className="btn">Цаг захиалах</Link>
            <Link to="/services" className="btn btn--ghost">Үйлчилгээ үзэх</Link>
          </div>
        </div>
      </section>

      <section className="section container">
        <header className="section__head">
          <h2>Онцлох үйлчилгээ</h2>
          <p>Гүн, яаруугүй амралтад зориулан бүтээсэн зан үйлийн цомирлог цэс.</p>
        </header>
        <div className="grid grid--3">
          {services.slice(0, 3).map((s) => (
            <article key={s.id} className="card">
              <div className="card__media" style={{ backgroundImage: `url(${s.image})` }} />
              <div className="card__body">
                <h3>{s.name}</h3>
                <span className="pill">{s.duration}</span>
                <p>{s.blurb}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="section__cta">
          <Link to="/services" className="btn btn--ghost">Бүх үйлчилгээг үзэх</Link>
        </div>
      </section>

      <section className="section section--alt">
        <div className="container">
          <header className="section__head">
            <h2>Зочдын сэтгэгдэл</h2>
          </header>
          <div className="grid grid--3">
            {testimonials.map((t, i) => (
              <blockquote key={i} className="quote">
                <p>“{t.text}”</p>
                <cite>— {t.name}</cite>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container band__inner">
          <h2>Амрахад бэлэн үү?</h2>
          <p>Хэдхэн товшилтоор тайван агшнаа захиалаарай.</p>
          <Link to="/reservation" className="btn">Захиалга өгөх</Link>
        </div>
      </section>
    </>
  )
}
