import type { TopJobStat } from '../../types'

interface Props { data: TopJobStat[] }

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fmtDur(s: number) {
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${s}s`
}

export default function TopJobsTable({ data }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Job Performance (7 days)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Job Name</th>
              <th className="text-right px-4 py-3 font-medium">Runs</th>
              <th className="text-right px-4 py-3 font-medium">Failures</th>
              <th className="text-right px-4 py-3 font-medium">Avg Read</th>
              <th className="text-right px-4 py-3 font-medium">Avg Written</th>
              <th className="text-right px-5 py-3 font-medium">Avg Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map(row => {
              const failRate = row.runs > 0 ? (row.failures / row.runs) * 100 : 0
              return (
                <tr key={row.job_name} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-800 font-mono text-xs">{row.job_name}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.runs}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`tabular-nums font-medium ${failRate > 15 ? 'text-red-600' : failRate > 5 ? 'text-yellow-600' : 'text-gray-500'}`}>
                      {row.failures}
                      {row.failures > 0 && (
                        <span className="ml-1 text-xs font-normal opacity-70">
                          ({failRate.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{fmtNum(row.avg_read)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">{fmtNum(row.avg_written)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-gray-600">{fmtDur(row.avg_duration)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
