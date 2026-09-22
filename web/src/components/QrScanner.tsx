import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type QrScannerProps = {
  onScan: (value: string) => void
}

export type QrScannerRef = {
  flipCamera: () => Promise<void>
  restartCamera: () => Promise<void>
}

export const QrScanner = forwardRef<QrScannerRef, QrScannerProps>(({ onScan }, ref) => {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isStartingRef = useRef(false)
  const lastScannedTimeRef = useRef<number>(0)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  useImperativeHandle(ref, () => ({
    async flipCamera() {
      const nextMode = facingMode === 'environment' ? 'user' : 'environment'
      setFacingMode(nextMode)
      await stop()
      await start(nextMode)
    },
    async restartCamera() {
      await stop()
      await start(facingMode)
    }
  }))

  useEffect(() => {
    let mounted = true

    const initCamera = async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
      if (!mounted) return
      await start('environment')
    }

    void initCamera()

    return () => {
      mounted = false
      const scanner = scannerRef.current
      if (scanner) {
        try {
          if (scanner.isScanning) {
            scanner.stop().then(() => {
              try { scanner.clear() } catch {}
            }).catch(() => undefined)
          } else {
            try { scanner.clear() } catch {}
          }
        } catch {
          // ignore cleanup errors
        }
        scannerRef.current = null
      }
    }
  }, [])

  async function start(mode: 'environment' | 'user' = facingMode) {
    if (isStartingRef.current) return
    isStartingRef.current = true
    setError('')

    const qrElement = document.getElementById('qr-reader')
    if (!qrElement) {
      isStartingRef.current = false
      return
    }

    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop()
          }
          scannerRef.current.clear()
        } catch {
          // ignore
        }
        scannerRef.current = null
      }

      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: mode },
        { fps: 15, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          const now = Date.now()
          // 2.5 second cooldown between scans to allow continuous live video
          if (now - lastScannedTimeRef.current < 2500) {
            return
          }
          lastScannedTimeRef.current = now
          try {
            onScan(decodedText)
          } catch (e) {
            console.error('Error handling scan callback:', e)
          }
        },
        () => undefined
      )
      setActive(true)
    } catch (err: any) {
      console.warn('Notice starting camera:', err)
      scannerRef.current = null
      setActive(false)
      setError('Cámara en pausa. Tocá "Activar cámara" para iniciar la lectura.')
    } finally {
      isStartingRef.current = false
    }
  }

  async function stop() {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      if (scanner.isScanning) await scanner.stop()
      try { scanner.clear() } catch {}
    } catch (e) {
      console.error(e)
    } finally {
      scannerRef.current = null
      setActive(false)
    }
  }

  return (
    <div className="scanner-block" style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          width: '100%',
          minHeight: 400,
          borderRadius: 24,
          overflow: 'hidden',
          background: '#0a192f',
          position: 'relative'
        }}
      >
        {/* Isolated DOM container for Html5Qrcode */}
        <div id="qr-reader" key="static-qr-node" style={{ width: '100%', height: '100%', minHeight: 400 }} />

        {/* React Conditional Copy Overlay */}
        {!active && (
          <div
            className="scanner-copy"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              color: '#94a3b8',
              padding: 24,
              pointerEvents: 'none'
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: 18, color: '#fff', marginBottom: 6 }}>Escáner QR</strong>
              <span>Iniciando la cámara...</span>
            </div>
          </div>
        )}
      </div>

      {!active && (
        <button
          className="btn btn-secondary btn-block"
          type="button"
          onClick={() => void start()}
          style={{ marginTop: 12, height: 44, borderRadius: 12, background: '#1e3a8a', color: '#fff', fontWeight: 700 }}
        >
          Activar cámara
        </button>
      )}

      {error ? <p className="error" style={{ fontSize: 12, marginTop: 8 }}>{error}</p> : null}
    </div>
  )
})
