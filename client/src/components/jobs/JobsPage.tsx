import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { fetchJobs } from '../../api/client'
import JobsTable from './JobsTable'
import JobDetailDrawer from './JobDetailDrawer'
import LoadingSpinner from '../ui/LoadingSpinner'
import type { JobRow } from '../../types'

const STATUS_OPTIONS = ['', 'COMPLETED', 'FAILED', 'STARTED', 'STOPPED', 'ABANDONED']
const DAYS_OPTIONS   = [1, 3, 7, 14, 30]

interface Props {
  clientId:   string
  clientName: string
}

export default function JobsPage({ clientId, clientName }: Props) {
  const [status,    setStatus]    = useState('')
  const [jobName,   setJobName]   = useState('')
  const [days,      setDays]      = useState(7)
  const [page,      setPage]      = useState(1)
  const [selected,  setSelected]  = useState<JobRow | null>(null)

  // Reset to page 1 when filters change — handled via queryKey
  const { data, isLoading } = useQuery({
    queryKey: ['jobs', clientId, status, jobName, days, page],
    queryFn:  () => fetchJobs(clientId, { status: status || undefined, jobName: jobName || undefined, days, page, pageSize: 25 }),
    enabled:  !!clientId,
  })

  function handleFilterChange(fn: () => void) {
    fn()
    setPage(1)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="shrink-0 px-6 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Job Runs</h1>
            {clientName && (
              <p className="text-sm text-gray-500 mt-0.5">{clientName}</p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search by name */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by job name…"
              value={jobName}
              onChange={e => handleFilterChange(() => setJobName(e.target.value))}
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal size={14} className="text-gray-400" />
            <select
              value={status}
              onChange={e => handleFilterChange(() => setStatus(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s || 'All statuses'}</option>
              ))}
            </select>
          </div>

          {/* Days filter */}
          <div className="flex items-center gap-1">
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => handleFilterChange(() => setDays(d))}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  days === d
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          {/* Result count */}
          {data && (
            <span className="ml-auto text-xs text-gray-400">
              {data.total} result{data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Table area */}
      <div className="flex-1 overflow-hidden bg-white">
        {!clientId ? (
          <div className="flex h-full items-center justify-center text-gray-400">Select a client to view jobs</div>
        ) : isLoading ? (
          <LoadingSpinner label="Loading jobs…" />
        ) : !data ? (
          <div className="flex h-full items-center justify-center text-gray-400">No data</div>
        ) : (
          <JobsTable
            data={data}
            page={page}
            onPageChange={setPage}
            onRowClick={setSelected}
          />
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <JobDetailDrawer
          clientId={clientId}
          executionId={selected.job_execution_id}
          jobName={selected.job_name}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
