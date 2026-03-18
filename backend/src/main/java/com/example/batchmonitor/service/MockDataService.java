package com.example.batchmonitor.service;

import com.example.batchmonitor.model.*;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Generates deterministic, realistic Spring Batch execution history per client.
 * Used when {@code batch-monitor.use-mock-data=true} or when a real SQL Server
 * connection cannot be established.
 */
@Service
public class MockDataService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private record JobDef(String name, List<String> steps, int readBase) {}
    private record ClientProfile(double failRate, String volume) {}

    private static final List<JobDef> JOB_DEFS = List.of(
        new JobDef("invoiceJob",             List.of("processInvoicesStep",       "statisticsAndEmailStep"), 8_500),
        new JobDef("dbToFileJob",            List.of("exportCustomerReportStep",  "statisticsAndEmailStep"), 42_000),
        new JobDef("fileToDbJob",            List.of("importTransactionsStep",    "statisticsAndEmailStep"), 15_000),
        new JobDef("multithreadedJob",       List.of("processWorkItemsStep",      "statisticsAndEmailStep"), 75_000),
        new JobDef("partitionedDbToFileJob", List.of("partitionManagerStep:p0", "partitionManagerStep:p1",
                                                     "partitionManagerStep:p2", "partitionManagerStep:p3",
                                                     "statisticsAndEmailStep"),                             200_000),
        new JobDef("mtFileToDbJob",          List.of("importStep",               "statisticsAndEmailStep"), 30_000),
        new JobDef("sampleJob",              List.of("readAndProcessStep",        "statisticsAndEmailStep"), 1_000)
    );

    private static final Map<String, ClientProfile> CLIENT_PROFILES = Map.of(
        "acme-corp1",   new ClientProfile(0.05, "high"),
        "techco1",      new ClientProfile(0.18, "med"),
        "retail-plus1", new ClientProfile(0.10, "high")
    );

    // Stable per-session cache — regenerates on restart
    private final Map<String, List<JobRow>> jobCache = new ConcurrentHashMap<>();

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    public PagedResult<JobRow> getJobs(String clientId, String status, String jobName,
                                       int days, int page, int pageSize) {
        List<JobRow> all = getJobCache(clientId);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(days);

        List<JobRow> filtered = all.stream()
            .filter(r -> LocalDateTime.parse(r.startTime(), FMT).isAfter(cutoff))
            .filter(r -> status  == null || status.isBlank()  || r.status().equalsIgnoreCase(status))
            .filter(r -> jobName == null || jobName.isBlank() || r.jobName().toLowerCase().contains(jobName.toLowerCase()))
            .toList();

        int total = filtered.size();
        int start = (page - 1) * pageSize;
        List<JobRow> paged = filtered.subList(Math.min(start, total), Math.min(start + pageSize, total));
        return new PagedResult<>(paged, total, page, pageSize);
    }

    public Optional<JobDetail> getJobDetail(String clientId, long executionId) {
        List<JobRow> jobs = getJobCache(clientId);
        Optional<JobRow> maybeJob = jobs.stream()
            .filter(j -> j.jobExecutionId() == executionId).findFirst();
        if (maybeJob.isEmpty()) return Optional.empty();

        JobRow job = maybeJob.get();
        JobDef def = JOB_DEFS.stream().filter(d -> d.name().equals(job.jobName())).findFirst().orElse(JOB_DEFS.get(0));
        Random rng = new Random(executionId);

        List<StepRow> steps = new ArrayList<>();
        for (int i = 0; i < def.steps().size(); i++) {
            boolean isStats = i == def.steps().size() - 1;
            boolean failed  = job.status().equals("FAILED") && i == def.steps().size() - 2;
            long read    = isStats ? 0 : job.totalRead() / Math.max(def.steps().size() - 1, 1);
            long written = isStats ? 0 : (failed ? (long)(read * 0.3) : (long)(read * (0.95 + rng.nextDouble() * 0.05)));
            long filter  = isStats ? 0 : (long)(read * 0.01);
            long skip    = failed ? 1 + rng.nextInt(10) : rng.nextInt(3);
            steps.add(new StepRow(
                def.steps().get(i),
                failed ? "FAILED" : "COMPLETED",
                read, written, filter, skip,
                failed ? job.errorSummary() : null
            ));
        }
        return Optional.of(new JobDetail(job, steps));
    }

    public DashboardStats getDashboard(String clientId) {
        List<JobRow> rows = getJobCache(clientId);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        List<JobRow> recent = rows.stream()
            .filter(r -> LocalDateTime.parse(r.startTime(), FMT).isAfter(cutoff)).toList();

        int completed = (int) recent.stream().filter(r -> r.status().equals("COMPLETED")).count();
        int failed    = (int) recent.stream().filter(r -> r.status().equals("FAILED")).count();
        long totalRead = recent.stream().mapToLong(JobRow::totalRead).sum();
        long totalWrit = recent.stream().mapToLong(JobRow::totalWritten).sum();
        int avgDur     = recent.isEmpty() ? 0 : (int) recent.stream().mapToInt(JobRow::durationSeconds).average().orElse(0);
        int active     = new Random(clientId.hashCode() + System.currentTimeMillis() / 60_000).nextInt(3);

        return new DashboardStats(recent.size(), completed, failed,
            recent.isEmpty() ? 0 : (int) Math.round(100.0 * completed / recent.size()),
            totalRead, totalWrit, avgDur, active);
    }

    public List<TrendPoint> getTrends(String clientId) {
        List<JobRow> all = getJobCache(clientId);
        List<TrendPoint> points = new ArrayList<>();
        for (int d = 6; d >= 0; d--) {
            String label = LocalDate.now().minusDays(d).toString();
            List<JobRow> dayJobs = all.stream()
                .filter(j -> j.startTime().startsWith(label)).toList();
            points.add(new TrendPoint(
                label,
                (int) dayJobs.stream().filter(j -> j.status().equals("COMPLETED")).count(),
                (int) dayJobs.stream().filter(j -> j.status().equals("FAILED")).count(),
                (int) dayJobs.stream().filter(j -> j.status().equals("STOPPED")).count()
            ));
        }
        return points;
    }

    public List<TopJobStat> getTopJobs(String clientId) {
        List<JobRow> all = getJobCache(clientId);
        Map<String, List<JobRow>> grouped = all.stream().collect(Collectors.groupingBy(JobRow::jobName));
        return grouped.entrySet().stream().map(e -> {
            List<JobRow> jobs = e.getValue();
            long avgRead = (long) jobs.stream().mapToLong(JobRow::totalRead).average().orElse(0);
            long avgWrit = (long) jobs.stream().mapToLong(JobRow::totalWritten).average().orElse(0);
            int  avgDur  = (int)  jobs.stream().mapToInt(JobRow::durationSeconds).average().orElse(0);
            int  fails   = (int)  jobs.stream().filter(j -> j.status().equals("FAILED")).count();
            return new TopJobStat(e.getKey(), jobs.size(), fails, avgRead, avgWrit, avgDur);
        }).sorted(Comparator.comparingInt(TopJobStat::runs).reversed()).toList();
    }

    // -----------------------------------------------------------------------
    // Data generation
    // -----------------------------------------------------------------------

    private List<JobRow> getJobCache(String clientId) {
        return jobCache.computeIfAbsent(clientId, this::generateJobs);
    }

    private List<JobRow> generateJobs(String clientId) {
        ClientProfile profile = CLIENT_PROFILES.getOrDefault(clientId, new ClientProfile(0.10, "med"));
        Random rng = new Random(clientId.hashCode());

        int runsPerDay = switch (profile.volume()) {
            case "high" -> 8  + rng.nextInt(5);
            case "med"  -> 4  + rng.nextInt(5);
            default     -> 2  + rng.nextInt(3);
        };

        List<JobRow> rows = new ArrayList<>();
        int execId = 1000 + rng.nextInt(200);

        for (int d = 6; d >= 0; d--) {
            LocalDate day = LocalDate.now().minusDays(d);
            for (int r = 0; r < runsPerDay; r++) {
                JobDef def     = JOB_DEFS.get(rng.nextInt(JOB_DEFS.size()));
                int startMins  = 60 + rng.nextInt(21 * 60);
                LocalDateTime start = day.atStartOfDay().plusMinutes(startMins);
                int durationSec = 30 + rng.nextInt(571);
                LocalDateTime end = start.plusSeconds(durationSec);

                boolean failed  = rng.nextDouble() < profile.failRate();
                boolean stopped = !failed && rng.nextDouble() < 0.02;
                String  status  = failed ? "FAILED" : stopped ? "STOPPED" : "COMPLETED";

                long totalRead    = (long)(def.readBase() * (0.8 + rng.nextDouble() * 0.4));
                long totalWritten = failed ? (long)(totalRead * 0.3) : (long)(totalRead * (0.95 + rng.nextDouble() * 0.05));
                long totalFiltered= (long)(totalRead * 0.01);
                long totalErrors  = failed ? 1 + rng.nextInt(20) : rng.nextInt(4);

                String corrId    = String.format("%08X", rng.nextInt());
                String cfgHash   = String.format("%010X", Math.abs(rng.nextLong()) % 0xFFFFFFFFFFL);

                rows.add(new JobRow(
                    execId++, execId + 500,
                    def.name(), status, status.equals("COMPLETED") ? "COMPLETED" : status,
                    start.format(FMT), end.format(FMT),
                    durationSec, corrId, cfgHash,
                    totalRead, totalWritten, totalFiltered, totalErrors,
                    totalErrors > 0 ? "IllegalArgumentException: invalid amount format | SQLTransientException: connection timeout" : null
                ));
            }
        }

        rows.sort(Comparator.comparing(JobRow::startTime).reversed());
        return rows;
    }
}
