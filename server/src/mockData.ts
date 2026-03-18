// ---------------------------------------------------------------------------
// Mock data — used when USE_MOCK_DATA=true or SQL Server is unreachable.
// Generates realistic Spring Batch execution history per client.
// ---------------------------------------------------------------------------

export type JobStatus = 'COMPLETED' | 'FAILED' | 'STARTED' | 'STOPPED' | 'ABANDONED';

export interface JobRow {
  job_execution_id: number;
  job_instance_id: number;
  job_name: string;
  status: JobStatus;
  exit_code: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  correlation_id: string;
  config_hash: string;
  total_read: number;
  total_written: number;
  total_filtered: number;
  total_errors: number;
  error_summary: string | null;
}

export interface StepRow {
  step_name: string;
  status: string;
  read_count: number;
  write_count: number;
  filter_count: number;
  skip_count: number;
  error_detail: string | null;
}

export interface DashboardStats {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  successRate: number;
  totalRecordsRead: number;
  totalRecordsWritten: number;
  avgDurationSeconds: number;
  activeJobs: number;
}

export interface TrendPoint {
  date: string;
  completed: number;
  failed: number;
  stopped: number;
}

export interface TopJobStat {
  job_name: string;
  runs: number;
  failures: number;
  avg_read: number;
  avg_written: number;
  avg_duration: number;
}

// ---------------------------------------------------------------------------
// Per-client personality — different health profiles
// ---------------------------------------------------------------------------
const clientProfiles: Record<string, { failRate: number; volume: 'low' | 'med' | 'high' }> = {
  'acme-corp':   { failRate: 0.05, volume: 'high' },
  'techco':      { failRate: 0.18, volume: 'med'  },
  'retail-plus': { failRate: 0.10, volume: 'high' },
};

const JOB_DEFS: { name: string; steps: string[]; readBase: number }[] = [
  { name: 'invoiceJob',              steps: ['processInvoicesStep', 'statisticsAndEmailStep'],                                       readBase: 8500  },
  { name: 'dbToFileJob',             steps: ['exportCustomerReportStep', 'statisticsAndEmailStep'],                                  readBase: 42000 },
  { name: 'fileToDbJob',             steps: ['importTransactionsStep', 'statisticsAndEmailStep'],                                    readBase: 15000 },
  { name: 'multithreadedJob',        steps: ['processWorkItemsStep', 'statisticsAndEmailStep'],                                      readBase: 75000 },
  { name: 'partitionedDbToFileJob',  steps: ['partitionManagerStep:p0','partitionManagerStep:p1','partitionManagerStep:p2','partitionManagerStep:p3','statisticsAndEmailStep'], readBase: 200000 },
  { name: 'mtFileToDbJob',           steps: ['importStep', 'statisticsAndEmailStep'],                                               readBase: 30000 },
  { name: 'sampleJob',               steps: ['readAndProcessStep', 'statisticsAndEmailStep'],                                       readBase: 1000  },
];

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randId()  { return Math.random().toString(16).substring(2, 10).toUpperCase(); }
function randHash(){ return Math.random().toString(16).substring(2, 12).toUpperCase(); }

function addMinutes(base: Date, mins: number) {
  return new Date(base.getTime() + mins * 60_000);
}

function isoStr(d: Date) { return d.toISOString().replace('T', ' ').substring(0, 19); }

// Build per-day executions going back 7 days
function generateJobs(clientId: string): JobRow[] {
  const profile = clientProfiles[clientId] ?? { failRate: 0.1, volume: 'med' };
  const runsPerDay = profile.volume === 'high' ? randInt(8, 12) : profile.volume === 'med' ? randInt(4, 8) : randInt(2, 4);
  const rows: JobRow[] = [];
  let execId = 1000 + randInt(1, 200);

  for (let d = 6; d >= 0; d--) {
    const dayBase = new Date();
    dayBase.setDate(dayBase.getDate() - d);
    dayBase.setHours(0, 0, 0, 0);

    for (let r = 0; r < runsPerDay; r++) {
      const def = JOB_DEFS[randInt(0, JOB_DEFS.length - 1)];
      const startMins = randInt(60, 22 * 60);
      const startTime = addMinutes(dayBase, startMins);
      const durationSec = randInt(30, 600);
      const endTime = addMinutes(startTime, Math.ceil(durationSec / 60));

      const failed = Math.random() < profile.failRate;
      const stopped = !failed && Math.random() < 0.02;
      const status: JobStatus = failed ? 'FAILED' : stopped ? 'STOPPED' : 'COMPLETED';

      const readBase = def.readBase;
      const totalRead    = Math.floor(readBase * (0.8 + Math.random() * 0.4));
      const totalWritten = failed ? Math.floor(totalRead * 0.3) : Math.floor(totalRead * (0.95 + Math.random() * 0.05));
      const totalFiltered= Math.floor(totalRead * 0.01);
      const totalErrors  = failed ? randInt(1, 20) : randInt(0, 3);

      rows.push({
        job_execution_id: execId++,
        job_instance_id:  execId + 500,
        job_name:         def.name,
        status,
        exit_code:        status === 'COMPLETED' ? 'COMPLETED' : status,
        start_time:       isoStr(startTime),
        end_time:         isoStr(endTime),
        duration_seconds: durationSec,
        correlation_id:   randId(),
        config_hash:      randHash(),
        total_read:       totalRead,
        total_written:    totalWritten,
        total_filtered:   totalFiltered,
        total_errors:     totalErrors,
        error_summary:    totalErrors > 0
          ? `IllegalArgumentException: invalid amount format | SQLTransientException: connection timeout`
          : null,
      });
    }
  }

  // Sort descending by start_time
  return rows.sort((a, b) => b.start_time.localeCompare(a.start_time));
}

// Stable per-client cache so the data doesn't regenerate on every request
const cache = new Map<string, JobRow[]>();

function getJobs(clientId: string): JobRow[] {
  if (!cache.has(clientId)) cache.set(clientId, generateJobs(clientId));
  return cache.get(clientId)!;
}

// ---------------------------------------------------------------------------
// Public mock API functions
// ---------------------------------------------------------------------------

export function mockGetJobs(
  clientId: string,
  opts: { status?: string; jobName?: string; days?: number; page?: number; pageSize?: number }
): { rows: JobRow[]; total: number } {
  let rows = getJobs(clientId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (opts.days ?? 7));

  if (opts.status)  rows = rows.filter(r => r.status  === opts.status);
  if (opts.jobName) rows = rows.filter(r => r.job_name.toLowerCase().includes(opts.jobName!.toLowerCase()));
  rows = rows.filter(r => new Date(r.start_time) >= cutoff);

  const total    = rows.length;
  const page     = opts.page     ?? 1;
  const pageSize = opts.pageSize ?? 25;
  const start    = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total };
}

export function mockGetJobDetail(clientId: string, executionId: number) {
  const jobs = getJobs(clientId);
  const job  = jobs.find(j => j.job_execution_id === executionId);
  if (!job) return null;
  const def  = JOB_DEFS.find(d => d.name === job.job_name) ?? JOB_DEFS[0];

  const steps: StepRow[] = def.steps.map((stepName, i) => {
    const isLast  = i === def.steps.length - 1;   // stats step reads 0
    const failed  = job.status === 'FAILED' && i === def.steps.length - 2;
    const read    = isLast ? 0 : Math.floor(job.total_read / Math.max(def.steps.length - 1, 1));
    const written = isLast ? 0 : failed ? Math.floor(read * 0.3) : Math.floor(read * 0.97);
    return {
      step_name:    stepName,
      status:       failed ? 'FAILED' : 'COMPLETED',
      read_count:   read,
      write_count:  written,
      filter_count: Math.floor(read * 0.01),
      skip_count:   failed ? randInt(1, 10) : randInt(0, 2),
      error_detail: failed ? job.error_summary : null,
    };
  });

  return { job, steps };
}

export function mockGetDashboard(clientId: string): DashboardStats {
  const rows = getJobs(clientId);
  const recent = rows.filter(r => {
    const d = new Date(r.start_time);
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return d >= cutoff;
  });
  const completed = recent.filter(r => r.status === 'COMPLETED').length;
  const failed    = recent.filter(r => r.status === 'FAILED').length;
  const totalRead = recent.reduce((s, r) => s + r.total_read, 0);
  const totalWrit = recent.reduce((s, r) => s + r.total_written, 0);
  const avgDur    = recent.length ? Math.round(recent.reduce((s, r) => s + r.duration_seconds, 0) / recent.length) : 0;
  const active    = randInt(0, 2);
  return {
    totalRuns:           recent.length,
    completedRuns:       completed,
    failedRuns:          failed,
    successRate:         recent.length ? Math.round((completed / recent.length) * 100) : 0,
    totalRecordsRead:    totalRead,
    totalRecordsWritten: totalWrit,
    avgDurationSeconds:  avgDur,
    activeJobs:          active,
  };
}

export function mockGetTrends(clientId: string): TrendPoint[] {
  const points: TrendPoint[] = [];
  const allJobs = getJobs(clientId);
  for (let d = 6; d >= 0; d--) {
    const day = new Date();
    day.setDate(day.getDate() - d);
    const label = day.toISOString().substring(0, 10);
    const dayJobs = allJobs.filter(j => j.start_time.startsWith(label));
    points.push({
      date:      label,
      completed: dayJobs.filter(j => j.status === 'COMPLETED').length,
      failed:    dayJobs.filter(j => j.status === 'FAILED').length,
      stopped:   dayJobs.filter(j => j.status === 'STOPPED').length,
    });
  }
  return points;
}

export function mockGetTopJobs(clientId: string): TopJobStat[] {
  const allJobs = getJobs(clientId);
  const byName = new Map<string, JobRow[]>();
  for (const j of allJobs) {
    if (!byName.has(j.job_name)) byName.set(j.job_name, []);
    byName.get(j.job_name)!.push(j);
  }
  return Array.from(byName.entries()).map(([name, jobs]) => ({
    job_name:     name,
    runs:         jobs.length,
    failures:     jobs.filter(j => j.status === 'FAILED').length,
    avg_read:     Math.round(jobs.reduce((s, j) => s + j.total_read, 0) / jobs.length),
    avg_written:  Math.round(jobs.reduce((s, j) => s + j.total_written, 0) / jobs.length),
    avg_duration: Math.round(jobs.reduce((s, j) => s + j.duration_seconds, 0) / jobs.length),
  })).sort((a, b) => b.runs - a.runs);
}
