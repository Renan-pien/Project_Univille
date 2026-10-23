import { api } from './client'

/**
 * AdminRequestDTO JSON contract:
 * { id, event, theme, requester, date, time, location, audience, justification, status, receivedAt }
 * MyRequestDTO JSON contract:
 * { id, event, theme, date, location, status, updatedAt }
 * RejectRequestPayload JSON contract:
 * { reason, allowReadjustment }
 */
export type AdminRequestStatus = 'Pendente' | 'Aceita' | 'Negada'
export type MyRequestStatus = 'Aprovado' | 'Em análise' | 'Rejeitado' | 'Rascunho'

export interface AdminRequestDto {
  id: string
  event: string
  theme: string
  requester: string
  date: string
  time: string
  location: string
  audience: string
  justification: string
  status: AdminRequestStatus
  receivedAt: string
}

export interface MyRequestDto {
  id: string
  event: string
  theme: string
  date: string
  location: string
  status: MyRequestStatus
  updatedAt: string
}

export interface RejectRequestPayload {
  reason: string
  allowReadjustment: boolean
}

const q = (id: string) => encodeURIComponent(id)
export const fetchRequests = (status: AdminRequestStatus) => api<AdminRequestDto[]>(`/requests?status=${encodeURIComponent(status)}`)
export const approveRequest = (id: string) => api<AdminRequestDto>(`/requests/${q(id)}/approve`, { method: 'POST' })
export const rejectRequest = (id: string, payload: RejectRequestPayload) => {
  if (!payload.reason.trim()) return Promise.reject(new Error('A justificativa da rejeição é obrigatória.'))
  return api<AdminRequestDto>(`/requests/${q(id)}/reject`, { method: 'POST', body: payload })
}
export const fetchMyRequests = () => api<MyRequestDto[]>('/requests/mine')
export const deleteMyRequest = (id: string) => api<void>(`/requests/mine/${q(id)}`, { method: 'DELETE' })
