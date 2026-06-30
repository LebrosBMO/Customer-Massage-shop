import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { brand } from '../data/content.js'

const links = [
  { to: '/', label: 'Нүүр', end: true },
  { to: '/prices', label: 'Үнийн жагсаалт' },
  { to: '/services', label: 'Үйлчилгээ' },
  { to: '/faq', label: 'Түгээмэл асуулт' },
  { to: '/blog', label: 'Блог' },
  { to: '/contacts', label: 'Холбоо барих' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="navbar__inner container">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand__mark">✦</span>
          <span className="brand__name">{brand.name}</span>
        </Link>

        <button
          className="navbar__toggle"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>

        <nav className={`navbar__nav ${open ? 'is-open' : ''}`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'is-active' : '')}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
          <Link to="/reservation" className="btn btn--small" onClick={() => setOpen(false)}>
            Захиалга
          </Link>
        </nav>
      </div>
    </header>
  )
}
