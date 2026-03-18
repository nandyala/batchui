import { useQuery } from '@tanstack/react-query'
import { X, Hash, Clock, Tag, AlertCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { fetchJobDetail } from '../../api/client'
import StatusBadge    from './StatusBadge'
import LoadingSpinner from '../ui/LoadingSpinner'
import type { JobRow } from '../../types'

interface Props {
  clientId:   string
  executionId: number
  jobName:    string
  onClose:    () => void
}

function fmtDur(s: number) {
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${s}s`
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function MetaItem({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 font-mono break-all">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function JobDetailDrawer({ clientId, executionId, jobName, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['job-detail', clientId, executionId],
    queryFn:  () => fetchJobDetail(clientId, executionId),
  })

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[600px] max-w-full bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-mono">#{executionId}</p>
            <h2 className="text-base font-bold text-gray-900 mt-0.5 font-mono truncate">{jobName}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors ml-3 shrink-0"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1"><LoadingSpinner label="Loading job details…" /></div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">Job not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Job meta */}
            <div className="px-6 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <StatusBadge status={data.job.status} />
                <span className="text-sm text-gray-500">{fmtDur(data.job.duration_seconds)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <MetaItem icon={Hash}  label="Correlation ID" value={data.job.correlation_id} />
                <MetaItem icon={Tag}   label="Config Hash"    value={data.job.config_hash} />
                <MetaItem icon={Clock} label="Start Time"     value={data.job.start_time} />
                <MetaItem icon={Clock} label="End Time"       value={data.job.end_time} />
              </div>
            </div>

            {/* Totals */}
            <div className="px-6 py-4 bg-gray-50/60 border-b border-gray-100">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Read',     value: fmtNum(data.job.total_read),     color: 'text-blue-600' },
                  { label: 'Written',  value: fmtNum(data.job.total_written),  color: 'text-green-600' },
                  { label: 'Filtered', value: fmtNum(data.job.total_filtered), color: 'text-gray-500' },
                  { label: 'Errors',   value: fmtNum(data.job.total_errors),   color: data.job.total_errors > 0 ? 'text-red-600' : 'text-gray-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-lg border border-gray-100 p-3 text-center">
                    <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps Chart */}
            {data.steps.filter(s => s.step_name !== 'statisticsAndEmailStep').length > 0 && (
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Step Records</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={data.steps
                      .filter(s => s.step_name !== 'statisticsAndEmailStep')
                      .map(s => ({
                        name: s.step_name.length > 16 ? s.step_name.slice(0, 16) + '…' : s.step_name,
                        Read:    s.read_count,
                        Written: s.write_count,
                        Skipped: s.skip_count,
                      }))}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Read"    fill="#6366f1" radius={[3,3,0,0]} />
                    <Bar dataKey="Written" fill="#22c55e" radius={[3,3,0,0]} />
                    <Bar dataKey="Skipped" fill="#f59e0b" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Steps Table */}
            <div className="px-6 py-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Steps ({data.steps.length})</h3>
              <div className="space-y-2">
                {data.steps.map(step => (
                  <div
                    key={step.step_name}
                    className={`rounded-lg border p-3.5 ${
                      step.status === 'FAILED' ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-mono font-semibold text-gray-700 truncate">{step.step_name}</p>
                      <StatusBadge status={step.status} />
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[
                        { label: 'Read',     value: fmtNum(step.read_count) },
                        { label: 'Written',  value: fmtNum(step.write_count) },
                        { label: 'Filtered', value: fmtNum(step.filter_count) },
                        { label: 'Skipped',  value: fmtNum(step.skip_count) },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-gray-400">{label}</p>
                          <p className="font-semibold tabular-nums text-gray-700">{value}</p>
                        </div>
                      ))}
                    </div>
                    {step.error_detail && (
                      <div className="mt-2 flex items-start gap-1.5">
                        <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-600 break-words">{step.error_detail}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error summary */}
            {data.job.error_summary && (
              <div className="mx-6 mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-red-700 mb-1">Error Summary</p>
                    <p className="text-xs text-red-600 leading-relaxed">{data.job.error_summary}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
