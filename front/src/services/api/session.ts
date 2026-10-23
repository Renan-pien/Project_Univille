import { api } from './client'

/**
 * SessionUserDTO JSON contract:
 * { id, name, initials, role, roleLabel }
 */
export type SessionRole = 'public' | 'requester' | 'admin'

export interface SessionUserDto {
  id: string
  name: string
  initials: string
  role: SessionRole
  roleLabel: string
}

import { setToken } from './client'

export async function login(email: string, password: string): Promise<SessionUserDto> {
  const { token, user } = await api<{ token: string; user: SessionUserDto }>('/auth/login', { method: 'POST', body: { email, password } })
  setToken(token)
  return user
}

export const logout = () => setToken(null)

/**
 * MODO DEMO (temporário): enquanto o <Login> do App.tsx não chama login(),
 * os botões "Solicitante/Administrador" e o seletor de perfil entram com as contas
 * definidas em VITE_DEMO_*. Remova isso quando ligar o formulário de login de verdade.
 */
const demo: Partial<Record<SessionRole, { email?: string; password?: string }>> = {
  requester: { email: import.meta.env.VITE_DEMO_REQUESTER_EMAIL, password: import.meta.env.VITE_DEMO_REQUESTER_PASSWORD },
  admin: { email: import.meta.env.VITE_DEMO_ADMIN_EMAIL, password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD },
}

export async function fetchSessionUser(role: SessionRole): Promise<SessionUserDto> {
  if (role === 'public') {
    logout()
    return api<SessionUserDto>('/session/me')
  }
  const current = await api<SessionUserDto>('/session/me').catch(() => null)
  if (current && current.role === role) return current
  const creds = demo[role]
  if (!creds?.email || !creds?.password) throw new Error('Faça login para continuar.')
  return login(creds.email, creds.password)
}
