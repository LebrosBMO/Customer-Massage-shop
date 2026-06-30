import { Link } from 'react-router-dom'
import { useServices } from '../lib/useServices.js'

export default function Services() {
  const { services, loading } = useServices()

  return (
    <div className="section container">
      <header className="page-head">
        <h1>Үйлчилгээ</h1>
        <p>Зан үйл бүрийг танд тааруулна. Та яарах хэрэггүй, бусдыг нь бид хариуцна.</p>
      </header>

      {loading && <p className="note">Ачаалж байна…</p>}

      <div className="grid grid--3">
        {services.map((s) => (
          <article key={s.id} className="card">
            <div className="card__media" style={{ backgroundImage: `url(${s.image})` }} />
            <div className="card__body">
              <h2>{s.name}</h2>
              <span className="pill">{s.duration}</span>
              <p>{s.blurb}</p>
              <Link to="/reservation" className="link-arrow">Үүнийг захиалах →</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
