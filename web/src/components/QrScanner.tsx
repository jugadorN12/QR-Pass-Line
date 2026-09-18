import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type QrScannerProps = {
  onScan: (value: string) => void
}

export function QrScanner({ onScan }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => {
    const scanner = scannerRef.current
    if (scanner?.isScanning) {
      void scanner.stop().catch(() => undefined)
    }
  }, [])

  async function start() {
    setError('')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          onScan(decodedText)
          void stop()
        },
        () => undefined,
      )
      setActive(true)
    } catch {
      scannerRef.current = null
      setError('No se pudo abrir la cámara. Revisá el permiso del navegador o usá el ingreso manual.')
    }
  }

  async function stop() {
    const scanner = scannerRef.current
    if (!scanner) return
    if (scanner.isScanning) await scanner.stop()
    scanner.clear()
    scannerRef.current = null
    setActive(false)
  }

  return (
    <div className="scanner-block">
      <div id="qr-reader" className={active ? 'scanner-camera' : 'scanner'}>
        {!active ? <div className="scanner-copy"><strong>Escáner QR</strong><span>Activá la cámara para leer un acceso.</span></div> : null}
      </div>
      <button className="btn btn-secondary btn-block" type="button" onClick={() => (active ? void stop() : void start())}>
        {active ? 'Apagar cámara' : 'Activar cámara'}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
