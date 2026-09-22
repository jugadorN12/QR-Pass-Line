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
  if (!text) return null
  if (text.startsWith('QPL1|')) return text.slice(5).trim().toUpperCase()

  // Extract from URL query parameters (e.g. ?c=..., ?code=..., ?t=...)
  try {
    if (text.includes('?') || text.includes('://')) {
      const url = new URL(text.startsWith('http') ? text : `http://dummy.com/${text}`)
      const paramCode = url.searchParams.get('c') || url.searchParams.get('code') || url.searchParams.get('ticket') || url.searchParams.get('t')
      if (paramCode) return paramCode.trim().toUpperCase()
    }
  } catch {}

  // Match /t/CODE path
  const fromUrl = text.match(/\/t\/([A-Z0-9_-]{4,64})/i)
  if (fromUrl) return fromUrl[1].toUpperCase()

  // Match standalone 8-character ticketCode
  const match = text.match(/\b([A-Z0-9]{8})\b/i) || text.match(/([A-Z0-9]{8})/i)
  if (match) return match[1].toUpperCase()

  // Return clean alphanumeric string
  const clean = text.replace(/[^a-zA-Z0-9_-]/g, '')
  if (clean.length >= 4 && clean.length <= 64) return clean.toUpperCase()

  return text.toUpperCase()
}
