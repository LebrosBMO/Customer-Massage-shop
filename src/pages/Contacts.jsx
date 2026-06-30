import { Link } from 'react-router-dom'
import { brand, locations } from '../data/content.js'

export default function Contacts() {
  return (
    <div className="section container">
      <header className="page-head">
        <h1>Холбоо барих</h1>
        <p>Хоёр студи, хоёулаа төвөөс ойрхон. Долоо хоногийн аль ч өдөр бидэнтэй холбогдоорой.</p>
      </header>

      <div className="grid grid--2">
        {locations.map((loc) => (
          <article key={loc.id} className="contact-card">
            <h2>{loc.name}</h2>
            <p className="contact-card__row">📍 {loc.address}</p>
            <p className="contact-card__row">
              📞 <a href={`tel:${loc.phone.replace(/\s/g, '')}`}>{loc.phone}</a>
            </p>
            <p className="contact-card__row">🕑 {loc.hours}</p>
            <a
              className="btn btn--small"
              href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
              target="_blank"
              rel="noreferrer"
            >
              Газрын зураг дээр нээх
            </a>
          </article>
        ))}
      </div>

      <div className="contact-extra">
        <p>
          Бичихийг илүүд үзвэл <a href={`mailto:${brand.email}`}>{brand.email}</a> хаягаар имэйл бичих эсвэл{' '}
          <a href={brand.instagram} target="_blank" rel="noreferrer">Instagram</a>-аар мессеж илгээгээрэй.
        </p>
        <Link to="/reservation" className="btn">Захиалга өгөх</Link>
      </div>
    </div>
  )
}
