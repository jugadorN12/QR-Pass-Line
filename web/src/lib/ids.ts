export function uid(prefix = 'id'): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

export function ticketCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function newSalt(): string {
  return crypto.randomUUID()
}

export function formatDate(iso: string): string {
  if (!iso) return 'Sin fecha'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function qrPayload(code: string): string {
  return `QPL1|${code}`
}

export function parseQrPayload(raw: string): string | null {
  if (!raw) return null
  const text = raw.trim()
  if (text.startsWith('QPL1|')) return text.slice(5).trim().toUpperCase()
  const fromUrl = text.match(/\/t\/([A-Z0-9]{4,32})/i)
  if (fromUrl) return fromUrl[1].toUpperCase()
  const match = text.match(/\b([A-Z0-9]{8})\b/i) || text.match(/([A-Z0-9]{8})/i)
  if (match) return match[1].toUpperCase()
  if (text.length >= 4 && text.length <= 32) return text.toUpperCase()
  return null
}
