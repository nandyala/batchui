import type { JobStatus } from '../../types'

const STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100  text-green-800  ring-green-200',
  FAILED:    'bg-red-100    text-red-800    ring-red-200',
  STARTED:   'bg-blue-100   text-blue-800   ring-blue-200',
  STARTING:  'bg-blue-100   text-blue-800   ring-blue-200',
  STOPPED:   'bg-yellow-100 text-yellow-800 ring-yellow-200',
  STOPPING:  'bg-yellow-100 text-yellow-800 ring-yellow-200',
  ABANDONED: 'bg-gray-100   text-gray-600   ring-gray-200',
}

const DOTS: Record<string, string> = {
  COMPLETED: 'bg-green-500',
  FAILED:    'bg-red-500',
  STARTED:   'bg-blue-500 animate-pulse',
  STARTING:  'bg-blue-500 animate-pulse',
  STOPPED:   'bg-yellow-500',
  STOPPING:  'bg-yellow-500 animate-pulse',
  ABANDONED: 'bg-gray-400',
}

export default function StatusBadge({ status }: { status: JobStatus | string }) {
  const style = STYLES[status] ?? STYLES.ABANDONED
  const dot   = DOTS[status]   ?? DOTS.ABANDONED
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}
