import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DashboardStats } from '../../types'

interface Props { stats: DashboardStats }

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280']

export default function StatusPieChart({ stats }: Props) {
  const stopped  = stats.totalRuns - stats.completedRuns - stats.failedRuns
  const data = [
    { name: 'Completed', value: stats.completedRuns },
    { name: 'Failed',    value: stats.failedRuns    },
    { name: 'Stopped',   value: Math.max(0, stopped) },
  ].filter(d => d.value > 0)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-1">Status Distribution</h3>
      <p className="text-xs text-gray-400 mb-3">Last 7 days · {stats.totalRuns} total runs</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}
            formatter={(value: number) => [value, '']}
          />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
