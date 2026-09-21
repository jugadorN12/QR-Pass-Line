import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export function DottedQrImage({ value, size = 220 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
      const matrixSize = qr.modules.size
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = size
      canvas.height = size

      const cell = size / matrixSize
      ctx.clearRect(0, 0, size, size)
      ctx.fillStyle = '#0f172a'

      const isFinder = (r: number, c: number) => {
        return (r < 7 && c < 7) || (r < 7 && c >= matrixSize - 7) || (r >= matrixSize - 7 && c < 7)
      }

      // Draw normal data modules as filled circles
      for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
          if (isFinder(r, c)) continue
          if (qr.modules.get(r, c)) {
            const cx = (c + 0.5) * cell
            const cy = (r + 0.5) * cell
            const radius = cell * 0.42
            ctx.beginPath()
            ctx.arc(cx, cy, radius, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Helper function to draw finder pattern (rounded square outer + inner filled circle)
      const drawFinder = (startRow: number, startCol: number) => {
        const x = startCol * cell
        const y = startRow * cell
        const outerDim = 7 * cell
        const radius = cell * 1.8

        // Draw outer thick rounded stroke
        ctx.beginPath()
        ctx.lineWidth = cell * 0.9
        ctx.strokeStyle = '#0f172a'

        const strokeOffset = ctx.lineWidth / 2
        const rx = x + strokeOffset
        const ry = y + strokeOffset
        const rw = outerDim - ctx.lineWidth
        const rh = outerDim - ctx.lineWidth

        ctx.roundRect(rx, ry, rw, rh, radius)
        ctx.stroke()

        // Draw inner filled circle
        const cx = x + outerDim / 2
        const cy = y + outerDim / 2
        const innerRadius = cell * 1.35
        ctx.beginPath()
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Draw the 3 corner finder patterns
      drawFinder(0, 0)
      drawFinder(0, matrixSize - 7)
      drawFinder(matrixSize - 7, 0)
    } catch (err) {
      console.error('Error drawing dotted QR:', err)
    }
  }, [value, size])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  )
}
