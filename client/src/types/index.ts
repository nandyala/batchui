export interface ClientConfig {
  id: string
  name: string
  color: string
  server: string
  port: number
  database: string
  username: string
  password: string
  encrypt: boolean
  trustServerCertificate: boolean
}

export type JobStatus = 'COMPLETED' | 'FAILED' | 'STARTED' | 'STOPPED' | 'ABANDONED'

export interface JobRow {
  job_execution_id: number
  job_instance_id: number
  job_name: string
  status: JobStatus
  exit_code: string
  start_time: string
  end_time: string
  duration_seconds: number
  correlation_id: string
  config_hash: string
  total_read: number
  total_written: number
  total_filtered: number
  total_errors: number
  error_summary: string | null
}

export interface StepRow {
  step_name: string
  status: string
  read_count: number
  write_count: number
  filter_count: number
  skip_count: number
  error_detail: string | null
}

export interface JobDetail {
  job: JobRow
  steps: StepRow[]
}

export interface PagedResult<T> {
  rows: T[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardStats {
  totalRuns: number
  completedRuns: number
  failedRuns: number
  successRate: number
  totalRecordsRead: number
  totalRecordsWritten: number
  avgDurationSeconds: number
  activeJobs: number
}

export interface TrendPoint {
  date: string
  completed: number
  failed: number
  stopped: number
}

export interface TopJobStat {
  job_name: string
  runs: number
  failures: number
  avg_read: number
  avg_written: number
  avg_duration: number
}

export interface ConnectionStatus {
  connected: boolean
  message: string
  dataSource: string
}
