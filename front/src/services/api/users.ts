import { api } from './client'

/**
 * UserDTO JSON contract:
 * { id, name, email, role, coordination, active }
 * CreateUserPayload JSON contract:
 * { name, email, role, coordination, active }
 * UserFormOptionsDTO JSON contract:
 * { roles: string[], coordinations: string[] }
 */
export interface UserDto {
  id: string
  name: string
  email: string
  role: string
  coordination: string
  active: boolean
}

export type CreateUserPayload = Omit<UserDto, 'id'>
export interface UserFormOptionsDto {
  roles: string[]
  coordinations: string[]
}

export const fetchUsers = () => api<UserDto[]>('/users')
export const fetchUserFormOptions = () => api<UserFormOptionsDto>('/users/form-options')
export const createUser = (payload: CreateUserPayload) => api<UserDto>('/users', { method: 'POST', body: payload })
export const deleteUser = (id: string) => api<void>(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
