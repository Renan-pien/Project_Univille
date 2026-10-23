import { api } from './client'

/**
 * EventDTO JSON contract:
 * { id, day, weekday, month, title, theme, time, location, speaker, color }
 * EventFormOptionsDTO JSON contract:
 * { coordinations: [{ name, costCenter }], environments: [{ id, name }] }
 */
export type EventColor = 'green' | 'blue' | 'amber' | 'purple'

export interface EventDto {
  id: string
  day: string
  weekday: string
  month: string
  title: string
  theme: string
  time: string
  location: string
  speaker: string
  color: EventColor
}

export interface EventFormOptionsDto {
  coordinations: Array<{ name: string; costCenter: string }>
  environments: Array<{ id: string; name: string }>
}

export interface CreateEventPayload {
  name: string
  theme: string
  coordination: string
  speaker: string
  audienceSize: number
  description: string
  environment: string
  date: string
  startTime: string
  endTime: string
  accessible: boolean
  publicEvent: boolean
}

export const fetchEvents = () => api<EventDto[]>('/events')
export const fetchEventFormOptions = () => api<EventFormOptionsDto>('/events/form-options')
export const createEvent = (payload: CreateEventPayload) => api<{ protocol: string }>('/events', { method: 'POST', body: payload })
export const saveEventDraft = (payload: CreateEventPayload) => api<{ protocol: string }>('/events?draft=true', { method: 'POST', body: payload })
export const checkEventConflict = (payload: Pick<CreateEventPayload, 'environment' | 'date' | 'startTime' | 'endTime'>) =>
  api<{ hasConflict: boolean }>('/events/conflict', { method: 'POST', body: payload })
