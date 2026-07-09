import { Link } from 'react-router-dom'
import { brand } from '../data/content.js'

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
          <h4>Цэс</h4>
          <p><Link to="/start">Форум бөглөх</Link></p>
          <p><a href={brand.instagram} target="_blank" rel="noreferrer">Instagram</a></p>
        </div>
      </div>
      <div className="footer__bottom container">
        © {new Date().getFullYear()} {brand.name}. Бүх эрх хуулиар хамгаалагдсан.
      </div>
    </footer>
  )
}
