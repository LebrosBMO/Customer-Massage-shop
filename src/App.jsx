import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Reservation from './pages/Reservation.jsx'
import Admin from './pages/Admin.jsx'
import Funnel from './pages/Funnel.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="reservation" element={<Reservation />} />
      </Route>
      <Route path="/admin" element={<Admin />} />
      <Route path="/start" element={<Funnel />} />
    </Routes>
  )
}
