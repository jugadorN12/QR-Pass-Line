export type QrCatalogItem = {
  id: string
  name: string
  description: string
  kind: 'viral' | 'consumible'
  from: string
  duration: string
  icon?: string
  publicAccess?: boolean
  active?: boolean
  days?: string[]
  scheduleMode?: 'full' | 'end' | 'hidden'
  backgroundImage?: string
}

const KEY = 'qr-pass-line.qr-catalog.v1'

const demos: QrCatalogItem[] = [
  { id: 'demo-general', name: 'INGRESO GENERAL', description: 'Acceso general al evento', kind: 'consumible', from: '08:00 del día corriente', duration: '23:59', },
  { id: 'demo-vip', name: 'INGRESO S/C + VIP', description: 'Acceso sin cargo y sector VIP', kind: 'consumible', from: '08:00 del día corriente', duration: '23:59', },
  { id: 'demo-late', name: 'INGRESO S/C 2:30', description: 'Acceso sin cargo hasta las 02:30', kind: 'viral', from: '08:00 del día corriente', duration: '02:30', },
]

export function loadQrCatalog(): QrCatalogItem[] {
  try {
    const saved = localStorage.getItem(KEY)
    return saved ? JSON.parse(saved) as QrCatalogItem[] : demos
  } catch {
    return demos
  }
}

export function saveQrCatalog(items: QrCatalogItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function defaultQrCatalog() {
  return demos
}
