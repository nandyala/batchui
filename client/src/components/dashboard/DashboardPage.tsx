import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, TrendingUp, Clock,
  DatabaseZap, ArrowUpDown, Zap, RefreshCw,
} from 'lucide-react'
import { fetchDashboard, fetchTrends, fetchTopJobs } from '../../api/client'
import StatCard    from './StatCard'
import TrendChart  from './TrendChart'
import StatusPieChart from './StatusPieChart'
import TopJobsTable from './TopJobsTable'
import LoadingSpinner from '../ui/LoadingSpinner'
import EmptyState     from '../ui/EmptyState'

interface Props { clientId: string; clientName: string }

function fmtRecords(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtDur(s: number) {
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${s}s`
}

export default function DashboardPage({ clientId, clientName }: Props) {
  const enabled = Boolean(clientId)

  const { data: stats, isLoading: loadingStats, refetch } = useQuery({
    queryKey: ['dashboard', clientId],
    queryFn:  () => fetchDashboard(clientId),
    enabled,
    refetchInterval: 60_000,
  })
  const { data: trends = [], isLoading: loadingTrends } = useQuery({
    queryKey: ['trends', clientId],
    queryFn:  () => fetchTrends(clientId),
    enabled,
    refetchInterval: 60_000,
  })
  const { data: topJobs = [], isLoading: loadingTop } = useQuery({
    queryKey: ['top-jobs', clientId],
    queryFn:  () => fetchTopJobs(clientId),
    enabled,
  })

  if (!clientId) return (
    <div className="flex-1 overflow-y-auto p-8">
      <EmptyState title="No client selected" description="Choose a client from the sidebar to view its dashboard." />
    </div>
  )

  if (loadingStats || loadingTrends) return (
    <div className="flex-1 overflow-y-auto">
      <LoadingSpinner label="Loading dashboard…" />
    </div>
  )

  if (!stats) return null

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="px-8 py-5 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{clientName}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Dashboard · Last 7 days</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="p-8 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Runs"
            value={stats.totalRuns}
            sub="last 7 days"
            icon={TrendingUp}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.successRate}%`}
            sub={`${stats.completedRuns} completed`}
            icon={CheckCircle2}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            title="Failed Jobs"
            value={stats.failedRuns}
            sub={stats.failedRuns > 0 ? 'needs attention' : 'all clear'}
            icon={XCircle}
            iconBg={stats.failedRuns > 0 ? 'bg-red-50' : 'bg-gray-50'}
            iconColor={stats.failedRuns > 0 ? 'text-red-500' : 'text-gray-400'}
          />
          <StatCard
            title="Active Now"
            value={stats.activeJobs}
            sub="currently running"
            icon={Zap}
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Records Read"
            value={fmtRecords(stats.totalRecordsRead)}
            sub="across all jobs"
            icon={DatabaseZap}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          />
          <StatCard
            title="Records Written"
            value={fmtRecords(stats.totalRecordsWritten)}
            sub="successfully persisted"
            icon={ArrowUpDown}
            iconBg="bg-teal-50"
            iconColor="text-teal-600"
          />
          <StatCard
            title="Avg Duration"
            value={fmtDur(stats.avgDurationSeconds)}
            sub="per job execution"
            icon={Clock}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            title="Write Rate"
            value={stats.totalRecordsRead > 0
              ? `${((stats.totalRecordsWritten / stats.totalRecordsRead) * 100).toFixed(1)}%`
              : '—'}
            sub="written vs read"
            icon={CheckCircle2}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <TrendChart data={trends} />
          </div>
          <div>
            <StatusPieChart stats={stats} />
          </div>
        </div>

        {/* Top Jobs */}
        {!loadingTop && topJobs.length > 0 && (
          <TopJobsTable data={topJobs} />
        )}
      </div>
    </div>
  )
}
