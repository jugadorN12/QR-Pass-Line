import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export function NewEventPage() {
  const { createEvent, currentUser } = useApp()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  if (currentUser?.role === 'canjeador') {
    return (
      <main className="page">
        <div className="card">El canjeador no crea fechas.</div>
      </main>
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      const event = await createEvent({
        name: String(form.get('name')),
        venue: String(form.get('venue')),
        date: String(form.get('date')),
        doorsOpen: String(form.get('doorsOpen')),
        notes: String(form.get('notes')),
        status: 'activo',
      })
      navigate(`/fechas/${event.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear.')
    }
  }

  return (
    <main className="page">
      <div>
        <p className="kicker">Nueva noche</p>
        <h1>Crear fecha</h1>
      </div>
      <form className="card stack" onSubmit={onSubmit}>
        <label className="field">
          <span>Nombre</span>
          <input name="name" required placeholder="Viernes 20" />
        </label>
        <label className="field">
          <span>Salón / sala</span>
          <input name="venue" required placeholder="Sala principal" />
        </label>
        <label className="field">
          <span>Fecha y hora</span>
          <input name="date" type="datetime-local" required />
        </label>
        <label className="field">
          <span>Apertura de puerta</span>
          <input name="doorsOpen" type="time" required />
        </label>
        <label className="field">
          <span>Notas</span>
          <textarea name="notes" rows={3} placeholder="Dress code, cortesías, etc." />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary btn-block">Guardar fecha</button>
      </form>
    </main>
  )
}
