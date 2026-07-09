import { Link } from 'react-router-dom'
import { useServices } from '../lib/useServices.js'

export default function PriceList() {
  const { services, loading } = useServices()

  return (
    <div className="section container">
      <header className="page-head">
        <h1>Үнийн жагсаалт</h1>
        <p>Ил тод үнэ. Төлбөрийг студид бэлэн мөнгө эсвэл картаар хүлээн авна.</p>
      </header>

      <div className="table-wrap">
        <table className="pricetable">
          <thead>
            <tr>
              <th>Үйлчилгээ</th>
              <th>60 мин</th>
              <th>90 мин</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.price_60 ?? '—'}</td>
                <td>{s.price_90 ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p className="note">Ачаалж байна…</p>}

      <div className="section__cta">
        <Link to="/start" className="btn">Форум бөглөх</Link>
      </div>
    </div>
  )
}
