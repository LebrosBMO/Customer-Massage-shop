import { useState, useEffect } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { masseuses, locations } from '../data/content.js'
import { useServices } from '../lib/useServices.js'

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  location_id: locations[0]?.id ?? '',
  service: '',
  masseuse: '',
  date: '',
  time: '',
  notes: '',
}

export default function Reservation() {
  const { services } = useServices()
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState({ type: 'idle', message: '' })

  // Default the service dropdown to the first available service once loaded.
  useEffect(() => {
    if (!form.service && services.length) {
      setForm((f) => (f.service ? f : { ...f, service: services[0].name }))
    }
  }, [services, form.service])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ type: 'loading', message: 'Хүсэлтийг тань илгээж байна…' })

    if (!supabaseConfigured) {
      // Demo mode: no backend wired up yet.
      setStatus({
        type: 'success',
        message:
          'Туршилтын горим — таны хүсэлтийг түр хадгаллаа. Захиалгыг бодитоор хадгалахын тулд .env дотор Supabase мэдээллээ нэмнэ үү.',
      })
      setForm(emptyForm)
      return
    }

    const { error } = await supabase.from('reservations').insert({
      name: form.name,
      phone: form.phone,
      email: form.email || null,
      location_id: form.location_id,
      service: form.service,
      masseuse: form.masseuse || null,
      preferred_date: form.date || null,
      preferred_time: form.time || null,
      notes: form.notes || null,
      status: 'new',
    })

    if (error) {
      setStatus({ type: 'error', message: `Алдаа гарлаа: ${error.message}` })
      return
    }

    setStatus({
      type: 'success',
      message: 'Баярлалаа! Таны захиалгын хүсэлтийг хүлээн авлаа. Бид удахгүй баталгаажуулна.',
    })
    setForm(emptyForm)
  }

  return (
    <div className="section container narrow">
      <header className="page-head">
        <h1>Захиалга</h1>
        <p>Юу, хэзээ хүсэж буйгаа бидэнд хэлээрэй. Бид утсаар эсвэл мессежээр баталгаажуулна.</p>
      </header>

      {!supabaseConfigured && (
        <div className="banner banner--info">
          <strong>Туршилтын горимд</strong> ажиллаж байна — захиалга одоогоор хадгалагдахгүй. Жинхэнэ
          захиалгыг идэвхжүүлэхийн тулд <code>.env</code> дотор Supabase түлхүүрээ нэмнэ үү.
        </div>
      )}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form__row">
          <label>
            Нэр *
            <input required value={form.name} onChange={(e) => update('name', e.target.value)} />
          </label>
          <label>
            Утас *
            <input required value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </label>
        </div>

        <label>
          Имэйл
          <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
        </label>

        <div className="form__row">
          <label>
            Салбар
            <select value={form.location_id} onChange={(e) => update('location_id', e.target.value)}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </label>
          <label>
            Үйлчилгээ
            <select value={form.service} onChange={(e) => update('service', e.target.value)}>
              {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </label>
        </div>

        <div className="form__row">
          <label>
            Сонгох мастер
            <select value={form.masseuse} onChange={(e) => update('masseuse', e.target.value)}>
              <option value="">Хамаагүй</option>
              {masseuses.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </label>
          <label>
            Огноо
            <input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
          </label>
          <label>
            Цаг
            <input type="time" value={form.time} onChange={(e) => update('time', e.target.value)} />
          </label>
        </div>

        <label>
          Нэмэлт тэмдэглэл
          <textarea
            rows={4}
            value={form.notes}
            onChange={(e) => update('notes', e.target.value)}
            placeholder="Бидний мэдвэл зохих зүйл бий юу?"
          />
        </label>

        <button className="btn" type="submit" disabled={status.type === 'loading'}>
          {status.type === 'loading' ? 'Илгээж байна…' : 'Захиалга илгээх'}
        </button>

        {status.type !== 'idle' && status.type !== 'loading' && (
          <div className={`banner banner--${status.type === 'error' ? 'error' : 'success'}`}>
            {status.message}
          </div>
        )}
      </form>
    </div>
  )
}
