import type { AppData } from '../types'

const KEY = 'qr-pass-line.v1'

const empty: AppData = {
  users: [],
  events: [],
  tickets: [],
  qrCatalog: [],
  limitations: [],
  venues: [],
  session: null,
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty
    return { ...empty, ...JSON.parse(raw) }
  } catch {
    return empty
  }
}

export function saveData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data))
}
