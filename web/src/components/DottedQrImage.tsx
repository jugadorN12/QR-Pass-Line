import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export function drawDottedQr(ctx: CanvasRenderingContext2D, value: string, size: number) {
  // Use robust QR generation with medium error correction level
  let qr: any
  try {
    qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  } catch {
    try {
      qr = QRCode.create(value, { errorCorrectionLevel: 'L' })
    } catch {
      qr = QRCode.create(value)
    }
  }

  const matrixSize = qr.modules.size
  // Quiet zone margin of 1 module for optical distinction
  const margin = 1
  const totalGrid = matrixSize + margin * 2
  const cell = size / totalGrid

  // Clean solid background for maximum contrast
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#0f172a'

  const isFinder = (r: number, c: number) => {
    return (r < 7 && c < 7) || (r < 7 && c >= matrixSize - 7) || (r >= matrixSize - 7 && c < 7)
  }

  // Draw data modules as high-coverage rounded squares (preserves 100% optical readability)
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (isFinder(r, c)) continue
      if (qr.modules.get(r, c)) {
        const x = (c + margin) * cell + cell * 0.04
        const y = (r + margin) * cell + cell * 0.04
        const w = cell * 0.92
        const h = cell * 0.92
        const rad = cell * 0.22
        ctx.beginPath()
        ctx.roundRect(x, y, w, h, rad)
        ctx.fill()
      }
    }
  }

  // Draw standard-compliant finder patterns (7x7 outer square, 5x5 white ring, 3x3 inner square)
  const drawFinder = (startRow: number, startCol: number) => {
    const fx = (startCol + margin) * cell
    const fy = (startRow + margin) * cell
    const outerDim = 7 * cell
    const cornerRad = cell * 0.5

    // 1. Outer 7x7 dark square
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.roundRect(fx, fy, outerDim, outerDim, cornerRad)
    ctx.fill()

    // 2. Middle 5x5 white square
    ctx.fillStyle = '#ffffff'
    const midX = fx + cell
    const midY = fy + cell
    const midDim = 5 * cell
    ctx.beginPath()
    ctx.roundRect(midX, midY, midDim, midDim, cornerRad * 0.6)
    ctx.fill()

    // 3. Inner 3x3 dark square
    ctx.fillStyle = '#0f172a'
    const inX = fx + 2 * cell
    const inY = fy + 2 * cell
    const inDim = 3 * cell
    ctx.beginPath()
    ctx.roundRect(inX, inY, inDim, inDim, cornerRad * 0.4)
    ctx.fill()
  }

  // Draw the 3 corner finder patterns
  drawFinder(0, 0)
  drawFinder(0, matrixSize - 7)
  drawFinder(matrixSize - 7, 0)
}

export function DottedQrImage({ value, size = 220 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    drawDottedQr(ctx, value, size)
  }, [value, size])

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  )
}
