const BASE = String(import.meta.env.VITE_API_URL || 'http://localhost:3333').replace(/\/$/, '')
export const TOKEN_KEY = 'agenda_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string | null) => (token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY))

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor.')
  }
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Erro inesperado no servidor.')
  return data as T
}
