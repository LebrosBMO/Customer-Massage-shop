import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import PriceList from './pages/PriceList.jsx'
import Services from './pages/Services.jsx'
import Faq from './pages/Faq.jsx'
import Blog from './pages/Blog.jsx'
import Contacts from './pages/Contacts.jsx'
import Reservation from './pages/Reservation.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="prices" element={<PriceList />} />
        <Route path="services" element={<Services />} />
        <Route path="faq" element={<Faq />} />
        <Route path="blog" element={<Blog />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="reservation" element={<Reservation />} />
      </Route>
      <Route path="/admin" element={<Admin />} />
    </Routes>
  )
}
