import { DottedQrImage } from './DottedQrImage'

export function QrImage({ value }: { value: string }) {
  return (
    <div style={{ width: 220, height: 220, margin: '0 auto' }}>
      <DottedQrImage value={value} size={220} />
    </div>
  )
}
