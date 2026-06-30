import { Link } from 'react-router-dom'
import { brand, locations } from '../data/content.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <div className="brand brand--footer">
            <span className="brand__mark">✦</span>
            <span className="brand__name">{brand.name}</span>
          </div>
          <p className="footer__tagline">{brand.tagline}</p>
          <p className="footer__notice">{brand.ageNotice}</p>
        </div>

        <div>
          <h4>Салбарууд</h4>
          {locations.map((loc) => (
            <p key={loc.id} className="footer__loc">
              <strong>{loc.name}</strong><br />
              {loc.address}<br />
              <a href={`tel:${loc.phone.replace(/\s/g, '')}`}>{loc.phone}</a>
            </p>
          ))}
        </div>

        <div>
          <h4>Цэс</h4>
          <p><Link to="/services">Үйлчилгээ</Link></p>
          <p><Link to="/prices">Үнийн жагсаалт</Link></p>
          <p><Link to="/faq">Түгээмэл асуулт</Link></p>
          <p><Link to="/reservation">Захиалга өгөх</Link></p>
          <p><a href={brand.instagram} target="_blank" rel="noreferrer">Instagram</a></p>
        </div>
      </div>
      <div className="footer__bottom container">
        © {new Date().getFullYear()} {brand.name}. Бүх эрх хуулиар хамгаалагдсан.
      </div>
    </footer>
  )
}
