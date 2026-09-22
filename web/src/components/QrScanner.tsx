import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

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
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [scanningFile, setScanningFile] = useState(false)

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
    },
  }))

  useEffect(() => {
    let mounted = true

    const initCamera = async () => {
      await new Promise((resolve) => setTimeout(resolve, 200))
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
            scanner
              .stop()
              .then(() => {
                try {
                  scanner.clear()
                } catch {}
              })
              .catch(() => undefined)
          } else {
            try {
              scanner.clear()
            } catch {}
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

      // Initialize Html5Qrcode specifically with QR_CODE format for maximum speed and accuracy
      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      })
      scannerRef.current = scanner

      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
        const qrboxSize = Math.floor(minEdge * 0.78)
        return {
          width: Math.max(200, qrboxSize),
          height: Math.max(200, qrboxSize),
        }
      }

      await scanner.start(
        { facingMode: mode },
        {
          fps: 20,
          qrbox: qrboxFunction,
          aspectRatio: 1.0,
        },
        (decodedText) => {
          const now = Date.now()
          // 2.0 second cooldown between scans to allow fluid reading without accidental duplicates
          if (now - lastScannedTimeRef.current < 2000) {
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
      setError('Cámara en pausa o sin permisos. Tocá "Activar cámara" o subí una imagen.')
    } finally {
      isStartingRef.current = false
    }
  }

  async function stop() {
    const scanner = scannerRef.current
    if (!scanner) return
    try {
      if (scanner.isScanning) await scanner.stop()
      try {
        scanner.clear()
      } catch {}
    } catch (e) {
      console.error(e)
    } finally {
      scannerRef.current = null
      setActive(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setScanningFile(true)
    setError('')

    try {
      const html5QrCode = new Html5Qrcode('qr-reader-file-temp', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })
      const decodedText = await html5QrCode.scanFile(file, true)
      if (decodedText) {
        onScan(decodedText)
      }
    } catch (err: any) {
      setError('No se detectó un código QR legible en la imagen seleccionada.')
    } finally {
      setScanningFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="scanner-block" style={{ position: 'relative', width: '100%' }}>
      {/* Hidden container for file scanning */}
      <div id="qr-reader-file-temp" style={{ display: 'none' }} />

      <div
        style={{
          width: '100%',
          minHeight: 380,
          borderRadius: 24,
          overflow: 'hidden',
          background: '#0a192f',
          position: 'relative',
        }}
      >
        {/* Isolated DOM container for live Html5Qrcode video */}
        <div id="qr-reader" key="static-qr-node" style={{ width: '100%', height: '100%', minHeight: 380 }} />

        {/* Overlay when camera is inactive */}
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
              pointerEvents: 'none',
              background: 'rgba(10, 25, 47, 0.9)',
              zIndex: 2,
            }}
          >
            <div>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📷</div>
              <strong style={{ display: 'block', fontSize: 18, color: '#fff', marginBottom: 6 }}>Escáner de Acceso QR</strong>
              <span style={{ fontSize: 13 }}>Apuntá al código QR del cliente para validarlo automáticamente.</span>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons below camera */}
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        {!active ? (
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => void start()}
            style={{ flex: 1, height: 44, borderRadius: 12, background: '#1e3a8a', color: '#fff', fontWeight: 700 }}
          >
            ▶ Activar cámara
          </button>
        ) : (
          <button
            className="btn"
            type="button"
            onClick={() => void stop()}
            style={{ flex: 1, height: 44, borderRadius: 12, background: '#f1f5f9', color: '#334155', fontWeight: 700, border: '1px solid #cbd5e1' }}
          >
            ⏸ Pausar cámara
          </button>
        )}

        <button
          className="btn"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanningFile}
          style={{ flex: 1, height: 44, borderRadius: 12, background: '#f8fafc', color: '#0860bd', fontWeight: 700, border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          {scanningFile ? 'Leyendo...' : 'Escanear Foto / Imagen'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>

      {error ? <p className="error" style={{ fontSize: 13, marginTop: 8, textAlign: 'center', color: '#ef4444' }}>{error}</p> : null}
    </div>
  )
})
