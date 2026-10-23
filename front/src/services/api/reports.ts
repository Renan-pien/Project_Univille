import { api } from './client'

/**
 * ReportEventDTO JSON contract:
 * { id, event, course, date, status, participants }
 * ReportFiltersDTO JSON contract:
 * { periods: string[], courses: string[], statuses: string[] }
 */
export interface ReportEventDto {
  id: string
  event: string
  course: string
  date: string
  status: 'Realizado' | 'Agendado'
  participants: number
}

export interface ReportFiltersDto {
  periods: string[]
  courses: string[]
  statuses: string[]
}

export const fetchReportFilters = () => api<ReportFiltersDto>('/reports/filters')
export const fetchAnnualEvents = (params: { course: string; period: string; status: string }) =>
  api<ReportEventDto[]>(`/reports/annual-events?${new URLSearchParams(params).toString()}`)
