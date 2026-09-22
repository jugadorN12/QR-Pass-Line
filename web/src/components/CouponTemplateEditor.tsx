import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { CouponTemplateConfig } from '../types'
import { DottedQrImage } from './DottedQrImage'
import { formatCouponSchedule } from '../lib/dateUtils'

export function CouponTemplateEditor() {
  const { couponTemplate, saveCouponTemplate, qrCatalog, events } = useApp()
  const [message, setMessage] = useState('')

  // Template Editor State
  const [templateConfig, setTemplateConfig] = useState<CouponTemplateConfig>(() => {
    if (couponTemplate) {
      return {
        ...couponTemplate,
        bgZoom: couponTemplate.bgZoom ?? 100,
        bgPosX: couponTemplate.bgPosX ?? 0,
        bgPosY: couponTemplate.bgPosY ?? 0,
      }
    }
    const saved = localStorage.getItem('qr-pass-line.coupon-template')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          ...parsed,
          bgZoom: parsed.bgZoom ?? 100,
          bgPosX: parsed.bgPosX ?? 0,
          bgPosY: parsed.bgPosY ?? 0,
        }
      } catch {}
    }
    return {
      qrY: 180,
      qrSize: 180,
      qrRadius: 24,
      brightness: 1,
      shadow: true,
      bgZoom: 100,
      bgPosX: 0,
      bgPosY: 0,
    }
  })

  async function handleSave() {
    try {
      await saveCouponTemplate(templateConfig)
      setMessage('¡Plantilla de cupón guardada con éxito en la nube y aplicada a todos los dispositivos!')
      setTimeout(() => setMessage(''), 4000)
    } catch (err: any) {
      setMessage('Error al guardar: ' + (err?.message || 'Error desconocido'))
    }
  }

  const sampleCoupon = qrCatalog.find((q) => q.backgroundImage) || qrCatalog[0]
  const activeEvent = events.find((e) => e.status === 'activo') || events[0]
  const posterBg =
    sampleCoupon?.backgroundImage ||
    (activeEvent as any)?.backgroundImage ||
    (activeEvent as any)?.imageUrl ||
    localStorage.getItem('qr-pass-line.poster') ||
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80'

  const scale = (templateConfig.bgZoom || 100) / 100
  const posX = templateConfig.bgPosX || 0
  const posY = templateConfig.bgPosY || 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, alignItems: 'start' }}>
      {/* Left Column: Controls */}
      <div
        className="role-card"
        style={{
          padding: 24,
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #dce4ed',
          boxShadow: '0 4px 16px rgba(15,23,52,.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0b192c', margin: '0 0 4px' }}>Editor de Plantilla de Cupón</h2>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Ajustá el zoom del afiche, movelo con los cursores direccionales y calibrá el tamaño y posición del QR. Todos los cambios se sincronizan en la nube para todos los vendedores y clientes.
          </p>
        </div>

        {/* Afiche / Background Control Group */}
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 14, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: 14, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Ajuste y Encuadre del Afiche
            </strong>
            <button
              type="button"
              onClick={() => setTemplateConfig({ ...templateConfig, bgZoom: 100, bgPosX: 0, bgPosY: 0 })}
              style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}
            >
              🎯 Centrar / Reset
            </button>
          </div>

          {/* Zoom Slider with - / + buttons */}
          <div className="field" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>Zoom del Afiche: {templateConfig.bgZoom || 100}%</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setTemplateConfig((c) => ({ ...c, bgZoom: Math.max(100, (c.bgZoom || 100) - 10) }))}
                  style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 800, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                  title="Reducir Zoom"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateConfig((c) => ({ ...c, bgZoom: Math.min(300, (c.bgZoom || 100) + 10) }))}
                  style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontWeight: 800, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                  title="Aumentar Zoom"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={100}
              max={300}
              step={1}
              value={templateConfig.bgZoom || 100}
              onChange={(e) => setTemplateConfig({ ...templateConfig, bgZoom: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Directional D-Pad Cursors */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, alignItems: 'center' }}>
            {/* Visual D-Pad */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                onClick={() => setTemplateConfig((c) => ({ ...c, bgPosY: (c.bgPosY || 0) - 5 }))}
                style={{ width: 38, height: 34, borderRadius: 8, background: '#1e3a8a', color: '#fff', border: 0, fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                title="Mover afiche hacia Arriba"
              >
                ▲
              </button>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setTemplateConfig((c) => ({ ...c, bgPosX: (c.bgPosX || 0) - 5 }))}
                  style={{ width: 38, height: 34, borderRadius: 8, background: '#1e3a8a', color: '#fff', border: 0, fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  title="Mover afiche a la Izquierda"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateConfig((c) => ({ ...c, bgPosX: 0, bgPosY: 0 }))}
                  style={{ width: 38, height: 34, borderRadius: 8, background: '#e2e8f0', color: '#0f172a', border: '1px solid #cbd5e1', fontWeight: 900, fontSize: 11, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                  title="Centrar posición"
                >
                  ●
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateConfig((c) => ({ ...c, bgPosX: (c.bgPosX || 0) + 5 }))}
                  style={{ width: 38, height: 34, borderRadius: 8, background: '#1e3a8a', color: '#fff', border: 0, fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  title="Mover afiche a la Derecha"
                >
                  ▶
                </button>
              </div>
              <button
                type="button"
                onClick={() => setTemplateConfig((c) => ({ ...c, bgPosY: (c.bgPosY || 0) + 5 }))}
                style={{ width: 38, height: 34, borderRadius: 8, background: '#1e3a8a', color: '#fff', border: 0, fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                title="Mover afiche hacia Abajo"
              >
                ▼
              </button>
            </div>

            {/* Sliders for exact X and Y offsets */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Posición Horizontal (X): {templateConfig.bgPosX || 0}px</span>
                <input
                  type="range"
                  min={-150}
                  max={150}
                  step={1}
                  value={templateConfig.bgPosX || 0}
                  onChange={(e) => setTemplateConfig({ ...templateConfig, bgPosX: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Posición Vertical (Y): {templateConfig.bgPosY || 0}px</span>
                <input
                  type="range"
                  min={-150}
                  max={150}
                  step={1}
                  value={templateConfig.bgPosY || 0}
                  onChange={(e) => setTemplateConfig({ ...templateConfig, bgPosY: Number(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* QR and Styling Parameters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>Calibración del Código QR y Colores</strong>

          <label className="field" style={{ margin: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Posición vertical QR (Y): {templateConfig.qrY}px</span>
            <input
              type="range"
              min={50}
              max={320}
              value={templateConfig.qrY}
              onChange={(e) => setTemplateConfig({ ...templateConfig, qrY: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </label>

          <label className="field" style={{ margin: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Tamaño del QR: {templateConfig.qrSize}px</span>
            <input
              type="range"
              min={120}
              max={280}
              value={templateConfig.qrSize}
              onChange={(e) => setTemplateConfig({ ...templateConfig, qrSize: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </label>

          <label className="field" style={{ margin: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Radio de esquinas QR (Bordes): {templateConfig.qrRadius}px</span>
            <input
              type="range"
              min={0}
              max={50}
              value={templateConfig.qrRadius}
              onChange={(e) => setTemplateConfig({ ...templateConfig, qrRadius: Number(e.target.value) })}
              style={{ width: '100%' }}
            />
          </label>

          <label className="field" style={{ margin: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Brillo del Afiche: {Math.round(templateConfig.brightness * 100)}%</span>
            <input
              type="range"
              min={50}
              max={150}
              value={Math.round(templateConfig.brightness * 100)}
              onChange={(e) => setTemplateConfig({ ...templateConfig, brightness: Number(e.target.value) / 100 })}
              style={{ width: '100%' }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Sombras de texto y contenedor</span>
            <input
              type="checkbox"
              checked={templateConfig.shadow}
              onChange={(e) => setTemplateConfig({ ...templateConfig, shadow: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
          </div>
        </div>

        {message && <p className="flash flash-ok" style={{ fontSize: 13, padding: 10, borderRadius: 8 }}>{message}</p>}

        <button
          className="btn btn-primary btn-block"
          type="button"
          onClick={handleSave}
          style={{ height: 48, borderRadius: 12, background: '#1e3a8a', fontWeight: 800, fontSize: 15 }}
        >
          GUARDAR CONFIGURACIÓN DE CUPÓN
        </button>
      </div>

      {/* Right Column: Real-Time Live Preview */}
      <div
        className="role-card"
        style={{
          padding: 24,
          background: '#f8fafc',
          borderRadius: 16,
          border: '1px solid #dce4ed',
          boxShadow: '0 4px 16px rgba(15,23,42,.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          position: 'sticky',
          top: 20,
        }}
      >
        <strong style={{ fontSize: 14, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vista Preliminar en Tiempo Real</strong>

        <div
          style={{
            width: 360,
            height: 520,
            borderRadius: 24,
            position: 'relative',
            overflow: 'hidden',
            padding: '20px',
            color: '#fff',
            boxShadow: templateConfig.shadow ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
            background: '#0f172a',
          }}
        >
          {/* Background Layer with Zoom and Position Transform */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              zIndex: 0,
            }}
          >
            <img
              src={posterBg}
              alt="Afiche"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: `scale(${scale}) translate(${posX}px, ${posY}px)`,
                transformOrigin: 'center center',
                filter: `brightness(${templateConfig.brightness})`,
                pointerEvents: 'none',
                transition: 'transform 0.05s ease-out',
              }}
            />
          </div>

          {/* Gradient Sombra Base */}
          <div style={{ position: 'absolute', inset: '240px 0 0 0', background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.92))', pointerEvents: 'none', zIndex: 1 }} />

          {/* QR Box with Live Template Config */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: `${templateConfig.qrY}px`,
              width: `${templateConfig.qrSize}px`,
              height: `${templateConfig.qrSize}px`,
              borderRadius: `${templateConfig.qrRadius}px`,
              background: 'rgba(255, 255, 255, 0.78)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              padding: 10,
              display: 'grid',
              placeItems: 'center',
              zIndex: 2,
              boxShadow: templateConfig.shadow ? '0 8px 32px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            <div style={{ width: templateConfig.qrSize - 20, height: templateConfig.qrSize - 20 }}>
              <DottedQrImage value="DEMO-QR-CODE" size={templateConfig.qrSize - 20} />
            </div>
          </div>

          {/* Bottom Details */}
          <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, padding: '0 20px', zIndex: 2, textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.4)', borderBottom: '1px solid rgba(255,255,255,0.4)', padding: '8px 0', margin: '0 auto 10px', width: '92%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                <span>Cupón</span>
                <span>Cant.</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 800 }}>
                <span>INGRESO GENERAL 2AM</span>
                <span style={{ color: '#ff4d4d' }}>1</span>
              </div>
            </div>

            <p style={{ fontSize: 12, margin: '0 0 4px', color: 'rgba(255,255,255,0.9)', textShadow: templateConfig.shadow ? '0 1px 3px rgba(0,0,0,0.9)' : 'none' }}>
              {formatCouponSchedule(activeEvent, sampleCoupon)}
            </p>

            <strong style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: templateConfig.shadow ? '0 2px 4px rgba(0,0,0,0.9)' : 'none' }}>
              RR.PP: JOSE
            </strong>
          </div>
        </div>
      </div>
    </div>
  )
}
