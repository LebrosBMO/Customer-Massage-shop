import { Link } from 'react-router-dom'
import { brand } from '../data/content.js'
import { useSiteContent } from '../lib/useSiteContent.js'

export default function Home() {
  const { content: site } = useSiteContent()

  return (
    <>
      <section className="hero" style={{ backgroundImage: `url(${site.hero_image})` }}>
        <div className="hero__overlay" />
        <div className="container hero__content">
          <p className="hero__eyebrow">{site.tagline}</p>
          <h1>{brand.name}</h1>
          <p className="hero__intro">{site.intro}</p>
          <div className="hero__actions">
            <Link to="/start" className="btn">Форум бөглөх</Link>
          </div>
          <div className="hero__meta">
            <span className="chip">🕐 Өдөр бүр <b>12:00–22:00</b></span>
            <span className="chip">✦ Бүрэн нууцлал</span>
            <span className="chip">📱 Онлайн захиалга</span>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container band__inner">
          <h2>Амрахад бэлэн үү?</h2>
          <p>Хэдхэн товшилтоор тайван агшнаа захиалаарай.</p>
          <Link to="/start" className="btn">Форум бөглөх</Link>
        </div>
      </section>
    </>
  )
}
