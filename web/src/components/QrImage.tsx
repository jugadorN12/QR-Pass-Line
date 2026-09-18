import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrImage({ value }: { value: string }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let live = true
    QRCode.toDataURL(value, { margin: 1, width: 480, color: { dark: '#0a3d4d', light: '#ffffff' } }).then((url) => {
      if (live) setSrc(url)
    })
    return () => {
      live = false
    }
  }, [value])

  if (!src) return <p className="muted">Generando QR…</p>
  return <img src={src} alt="Código QR de acceso" />
}
