/**
 * Calcula la distancia en metros entre dos coordenadas geográficas (Haversine).
 */
export function distanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

/**
 * Extrae latitud y longitud de un link de Google Maps o de un texto "lat, lng".
 */
export function parseGoogleMapsCoords(raw: string): { lat: number; lng: number } | null {
  const text = (raw || '').trim()
  if (!text) return null

  // Patrones: @-34.744,-58.591  o  ?q=-34.744,-58.591  o  !3d-34.744!4d-58.591  o  "-34.744, -58.591"
  const atMatch = text.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) }

  const dMatch = text.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
  if (dMatch) return { lat: Number(dMatch[1]), lng: Number(dMatch[2]) }

  const plainMatch = text.match(/(-?\d{1,2}\.\d{4,})\s*[,\s]\s*(-?\d{1,3}\.\d{4,})/)
  if (plainMatch) return { lat: Number(plainMatch[1]), lng: Number(plainMatch[2]) }

  return null
}

export type GeoCheckResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout'; message: string }

/**
 * Obtiene la ubicación GPS actual del dispositivo de forma segura.
 */
export function getCurrentPositionSafe(timeoutMs: number = 8000): Promise<GeoCheckResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({
        ok: false,
        reason: 'unsupported',
        message: 'Este navegador o dispositivo no soporta geolocalización GPS.',
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          ok: true,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            ok: false,
            reason: 'denied',
            message: 'Tenés que habilitar el permiso de ubicación (GPS) en el navegador para poder escanear en puerta.',
          })
        } else if (err.code === err.TIMEOUT) {
          resolve({
            ok: false,
            reason: 'timeout',
            message: 'No se pudo obtener la señal GPS a tiempo. Verificá tener la ubicación activada e intentá de nuevo.',
          })
        } else {
          resolve({
            ok: false,
            reason: 'unavailable',
            message: 'No se pudo detectar tu ubicación GPS actual.',
          })
        }
      },
      {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 15000,
      }
    )
  })
}
