import type {
  ClientConfig, DashboardStats, JobDetail, JobRow,
  PagedResult, TopJobStat, TrendPoint, ConnectionStatus,
} from '../types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// Clients
export const fetchClients        = () => get<ClientConfig[]>('/clients')
export const testClientConnection = (id: string) => post<ConnectionStatus>(`/clients/${id}/test`)
export const saveClients         = (clients: ClientConfig[]) => put<void>('/clients', clients)

// Dashboard
export const fetchDashboard = (clientId: string) =>
  get<DashboardStats>(`/clients/${clientId}/dashboard`)

export const fetchTrends = (clientId: string) =>
  get<TrendPoint[]>(`/clients/${clientId}/trends`)

export const fetchTopJobs = (clientId: string) =>
  get<TopJobStat[]>(`/clients/${clientId}/top-jobs`)

// Jobs
export interface JobsParams {
  status?: string
  jobName?: string
  days?: number
  page?: number
  pageSize?: number
}
export const fetchJobs = (clientId: string, params: JobsParams = {}) => {
  const q = new URLSearchParams()
  if (params.status)   q.set('status',   params.status)
  if (params.jobName)  q.set('jobName',  params.jobName)
  if (params.days)     q.set('days',     String(params.days))
  if (params.page)     q.set('page',     String(params.page))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  const qs = q.toString()
  return get<PagedResult<JobRow>>(`/clients/${clientId}/jobs${qs ? `?${qs}` : ''}`)
}

export const fetchJobDetail = (clientId: string, executionId: number) =>
  get<JobDetail>(`/clients/${clientId}/jobs/${executionId}`)
