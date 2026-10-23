import { api } from './client'

/**
 * EnvironmentDTO JSON contract:
 * { id, name, capacity, location, type, accessible, externalEvents, active }
 * EnvironmentOptionsDTO JSON contract:
 * { types: string[] }
 */
export interface EnvironmentDto {
  id: string
  name: string
  capacity: number
  location: string
  type: string
  accessible: boolean
  externalEvents: boolean
  active: boolean
}

export interface EnvironmentOptionsDto {
  types: string[]
}

export const fetchEnvironments = () => api<EnvironmentDto[]>('/environments')
export const fetchEnvironmentOptions = () => api<EnvironmentOptionsDto>('/environments/options')
export const updateEnvironment = (id: string, payload: Partial<EnvironmentDto>) =>
  api<EnvironmentDto>(`/environments/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload })
