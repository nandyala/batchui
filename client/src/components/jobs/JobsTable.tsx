import { ChevronLeft, ChevronRight } from 'lucide-react'
import StatusBadge from './StatusBadge'
import type { JobRow, PagedResult } from '../../types'

function fmtDur(s: number) {
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${s}s`
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtTime(s: string) {
  if (!s) return '—'
  return s.replace('T', ' ').substring(0, 16)
}

interface Props {
  data: PagedResult<JobRow>
  page: number
  onPageChange: (p: number) => void
  onRowClick: (row: JobRow) => void
}

export default function JobsTable({ data, page, onPageChange, onRowClick }: Props) {
  const totalPages = Math.ceil(data.total / data.pageSize)
  const start = (page - 1) * data.pageSize + 1
  const end   = Math.min(page * data.pageSize, data.total)

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Job Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Start Time</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Duration</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Read</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Written</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Errors</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-400">No jobs found</td>
              </tr>
            ) : data.rows.map(row => (
              <tr
                key={row.job_execution_id}
                onClick={() => onRowClick(row)}
                className="border-b border-gray-100 hover:bg-indigo-50/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">{row.job_execution_id}</td>
                <td className="px-4 py-3">
                  <p className="font-mono font-medium text-gray-800">{row.job_name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{row.correlation_id}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 font-mono">{fmtTime(row.start_time)}</td>
                <td className="px-4 py-3 text-right text-xs text-gray-600 tabular-nums">{fmtDur(row.duration_seconds)}</td>
                <td className="px-4 py-3 text-right text-xs text-blue-600 font-semibold tabular-nums">{fmtNum(row.total_read)}</td>
                <td className="px-4 py-3 text-right text-xs text-green-600 font-semibold tabular-nums">{fmtNum(row.total_written)}</td>
                <td className="px-4 py-3 text-right text-xs tabular-nums">
                  <span className={row.total_errors > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                    {row.total_errors}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white shrink-0">
          <p className="text-xs text-gray-500">
            Showing <span className="font-medium text-gray-700">{start}–{end}</span> of{' '}
            <span className="font-medium text-gray-700">{data.total}</span> jobs
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} className="text-gray-600" />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number
              if (totalPages <= 7) {
                p = i + 1
              } else if (page <= 4) {
                p = i + 1
              } else if (page >= totalPages - 3) {
                p = totalPages - 6 + i
              } else {
                p = page - 3 + i
              }
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`min-w-[30px] h-7 rounded-md text-xs font-medium transition-colors ${
                    p === page
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
