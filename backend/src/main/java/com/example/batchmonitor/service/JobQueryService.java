package com.example.batchmonitor.service;

import com.example.batchmonitor.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Queries real Spring Batch tables (BATCH_JOB_EXECUTION, BATCH_JOB_RUN_STATS, etc.).
 * Falls back to {@link MockDataService} when the client's database is unreachable
 * or when {@code batch-monitor.use-mock-data=true}.
 */
@Service
public class JobQueryService {

    private static final Logger log = LoggerFactory.getLogger(JobQueryService.class);

    private final DynamicDataSourceManager dsManager;
    private final MockDataService          mock;

    @Value("${batch-monitor.use-mock-data:true}")
    private boolean useMockData;

    public JobQueryService(DynamicDataSourceManager dsManager, MockDataService mock) {
        this.dsManager = dsManager;
        this.mock      = mock;
    }

    // -----------------------------------------------------------------------
    // Jobs
    // -----------------------------------------------------------------------

    public PagedResult<JobRow> getJobs(String clientId, String status, String jobName,
                                       int days, int page, int pageSize) {
        Optional<JdbcTemplate> tpl = resolve(clientId);
        if (tpl.isEmpty()) return mock.getJobs(clientId, status, jobName, days, page, pageSize);

        String where = buildJobsWhere(status, jobName, days);
        String countSql = "SELECT COUNT(*) FROM BATCH_JOB_EXECUTION je "
            + "JOIN BATCH_JOB_INSTANCE ji ON je.JOB_INSTANCE_ID = ji.JOB_INSTANCE_ID "
            + where;
        String dataSql  =
            "SELECT je.JOB_EXECUTION_ID, ji.JOB_INSTANCE_ID, ji.JOB_NAME, je.STATUS, "
            + "  je.EXIT_CODE, je.START_TIME, je.END_TIME, "
            + "  DATEDIFF(SECOND, je.START_TIME, ISNULL(je.END_TIME, GETDATE())) AS DURATION_SECONDS, "
            + "  COALESCE(jrs.CORRELATION_ID,'') AS CORRELATION_ID, "
            + "  COALESCE(jrs.CONFIG_HASH,'') AS CONFIG_HASH, "
            + "  COALESCE(jrs.TOTAL_READ,0)     AS TOTAL_READ, "
            + "  COALESCE(jrs.TOTAL_WRITTEN,0)  AS TOTAL_WRITTEN, "
            + "  COALESCE(jrs.TOTAL_FILTERED,0) AS TOTAL_FILTERED, "
            + "  COALESCE(jrs.TOTAL_ERRORS,0)   AS TOTAL_ERRORS, "
            + "  jrs.ERROR_SUMMARY "
            + "FROM BATCH_JOB_EXECUTION je "
            + "JOIN BATCH_JOB_INSTANCE ji ON je.JOB_INSTANCE_ID = ji.JOB_INSTANCE_ID "
            + "LEFT JOIN BATCH_JOB_RUN_STATS jrs ON je.JOB_EXECUTION_ID = jrs.JOB_EXECUTION_ID "
            + where
            + " ORDER BY je.START_TIME DESC "
            + " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";

        try {
            long total = tpl.get().queryForObject(countSql, Long.class);
            int offset = (page - 1) * pageSize;
            List<JobRow> rows = tpl.get().query(dataSql, jobRowMapper(), offset, pageSize);
            return new PagedResult<>(rows, total, page, pageSize);
        } catch (Exception ex) {
            log.warn("DB query failed for client '{}', using mock: {}", clientId, ex.getMessage());
            return mock.getJobs(clientId, status, jobName, days, page, pageSize);
        }
    }

    public Optional<JobDetail> getJobDetail(String clientId, long executionId) {
        Optional<JdbcTemplate> tpl = resolve(clientId);
        if (tpl.isEmpty()) return mock.getJobDetail(clientId, executionId);

        String jobSql =
            "SELECT je.JOB_EXECUTION_ID, ji.JOB_INSTANCE_ID, ji.JOB_NAME, je.STATUS, "
            + "  je.EXIT_CODE, je.START_TIME, je.END_TIME, "
            + "  DATEDIFF(SECOND, je.START_TIME, ISNULL(je.END_TIME, GETDATE())) AS DURATION_SECONDS, "
            + "  COALESCE(jrs.CORRELATION_ID,'') AS CORRELATION_ID, "
            + "  COALESCE(jrs.CONFIG_HASH,'') AS CONFIG_HASH, "
            + "  COALESCE(jrs.TOTAL_READ,0)     AS TOTAL_READ, "
            + "  COALESCE(jrs.TOTAL_WRITTEN,0)  AS TOTAL_WRITTEN, "
            + "  COALESCE(jrs.TOTAL_FILTERED,0) AS TOTAL_FILTERED, "
            + "  COALESCE(jrs.TOTAL_ERRORS,0)   AS TOTAL_ERRORS, "
            + "  jrs.ERROR_SUMMARY "
            + "FROM BATCH_JOB_EXECUTION je "
            + "JOIN BATCH_JOB_INSTANCE ji ON je.JOB_INSTANCE_ID = ji.JOB_INSTANCE_ID "
            + "LEFT JOIN BATCH_JOB_RUN_STATS jrs ON je.JOB_EXECUTION_ID = jrs.JOB_EXECUTION_ID "
            + "WHERE je.JOB_EXECUTION_ID = ?";

        String stepSql =
            "SELECT se.STEP_NAME, se.STATUS, se.READ_COUNT, se.WRITE_COUNT, se.FILTER_COUNT, "
            + "  (se.READ_SKIP_COUNT + se.WRITE_SKIP_COUNT + se.PROCESS_SKIP_COUNT) AS SKIP_COUNT, "
            + "  srs.ERROR_DETAIL "
            + "FROM BATCH_STEP_EXECUTION se "
            + "LEFT JOIN BATCH_STEP_RUN_STATS srs "
            + "  ON srs.STEP_NAME = se.STEP_NAME "
            + "  AND srs.JOB_STATS_ID = (SELECT ID FROM BATCH_JOB_RUN_STATS WHERE JOB_EXECUTION_ID = ?) "
            + "WHERE se.JOB_EXECUTION_ID = ? "
            + "ORDER BY se.START_TIME";

        try {
            List<JobRow> jobs = tpl.get().query(jobSql, jobRowMapper(), executionId);
            if (jobs.isEmpty()) return Optional.empty();
            List<StepRow> steps = tpl.get().query(stepSql, stepRowMapper(), executionId, executionId);
            return Optional.of(new JobDetail(jobs.get(0), steps));
        } catch (Exception ex) {
            log.warn("DB query failed for client '{}', using mock: {}", clientId, ex.getMessage());
            return mock.getJobDetail(clientId, executionId);
        }
    }

    // -----------------------------------------------------------------------
    // Dashboard
    // -----------------------------------------------------------------------

    public DashboardStats getDashboard(String clientId) {
        Optional<JdbcTemplate> tpl = resolve(clientId);
        if (tpl.isEmpty()) return mock.getDashboard(clientId);

        String sql =
            "SELECT COUNT(*) AS total_runs, "
            + "  SUM(CASE WHEN je.STATUS='COMPLETED' THEN 1 ELSE 0 END) AS completed_runs, "
            + "  SUM(CASE WHEN je.STATUS='FAILED'    THEN 1 ELSE 0 END) AS failed_runs, "
            + "  COALESCE(SUM(jrs.TOTAL_READ),0)    AS total_read, "
            + "  COALESCE(SUM(jrs.TOTAL_WRITTEN),0) AS total_written, "
            + "  COALESCE(AVG(jrs.DURATION_SECONDS),0) AS avg_duration "
            + "FROM BATCH_JOB_EXECUTION je "
            + "LEFT JOIN BATCH_JOB_RUN_STATS jrs ON je.JOB_EXECUTION_ID = jrs.JOB_EXECUTION_ID "
            + "WHERE je.START_TIME >= DATEADD(DAY, -7, GETDATE())";

        String activeSql =
            "SELECT COUNT(*) FROM BATCH_JOB_EXECUTION WHERE STATUS IN ('STARTED','STARTING')";

        try {
            DashboardStats stats = tpl.get().queryForObject(sql, (rs, n) -> {
                int total     = rs.getInt("total_runs");
                int completed = rs.getInt("completed_runs");
                int failed    = rs.getInt("failed_runs");
                int rate      = total == 0 ? 0 : (int) Math.round(100.0 * completed / total);
                return new DashboardStats(total, completed, failed, rate,
                    rs.getLong("total_read"), rs.getLong("total_written"),
                    rs.getInt("avg_duration"), 0);
            });
            int active = tpl.get().queryForObject(activeSql, Integer.class);
            return new DashboardStats(stats.totalRuns(), stats.completedRuns(), stats.failedRuns(),
                stats.successRate(), stats.totalRecordsRead(), stats.totalRecordsWritten(),
                stats.avgDurationSeconds(), active);
        } catch (Exception ex) {
            log.warn("DB query failed for client '{}', using mock: {}", clientId, ex.getMessage());
            return mock.getDashboard(clientId);
        }
    }

    public List<TrendPoint> getTrends(String clientId) {
        Optional<JdbcTemplate> tpl = resolve(clientId);
        if (tpl.isEmpty()) return mock.getTrends(clientId);

        String sql =
            "SELECT CAST(je.START_TIME AS DATE) AS run_date, "
            + "  SUM(CASE WHEN je.STATUS='COMPLETED' THEN 1 ELSE 0 END) AS completed, "
            + "  SUM(CASE WHEN je.STATUS='FAILED'    THEN 1 ELSE 0 END) AS failed, "
            + "  SUM(CASE WHEN je.STATUS='STOPPED'   THEN 1 ELSE 0 END) AS stopped "
            + "FROM BATCH_JOB_EXECUTION je "
            + "WHERE je.START_TIME >= DATEADD(DAY, -6, CAST(GETDATE() AS DATE)) "
            + "GROUP BY CAST(je.START_TIME AS DATE) "
            + "ORDER BY run_date";

        try {
            return tpl.get().query(sql, (rs, n) -> new TrendPoint(
                rs.getString("run_date"),
                rs.getInt("completed"),
                rs.getInt("failed"),
                rs.getInt("stopped")
            ));
        } catch (Exception ex) {
            log.warn("DB query failed for client '{}', using mock: {}", clientId, ex.getMessage());
            return mock.getTrends(clientId);
        }
    }

    public List<TopJobStat> getTopJobs(String clientId) {
        Optional<JdbcTemplate> tpl = resolve(clientId);
        if (tpl.isEmpty()) return mock.getTopJobs(clientId);

        String sql =
            "SELECT ji.JOB_NAME, COUNT(*) AS runs, "
            + "  SUM(CASE WHEN je.STATUS='FAILED' THEN 1 ELSE 0 END) AS failures, "
            + "  COALESCE(AVG(jrs.TOTAL_READ),0)      AS avg_read, "
            + "  COALESCE(AVG(jrs.TOTAL_WRITTEN),0)   AS avg_written, "
            + "  COALESCE(AVG(jrs.DURATION_SECONDS),0) AS avg_duration "
            + "FROM BATCH_JOB_EXECUTION je "
            + "JOIN BATCH_JOB_INSTANCE ji ON je.JOB_INSTANCE_ID = ji.JOB_INSTANCE_ID "
            + "LEFT JOIN BATCH_JOB_RUN_STATS jrs ON je.JOB_EXECUTION_ID = jrs.JOB_EXECUTION_ID "
            + "WHERE je.START_TIME >= DATEADD(DAY, -7, GETDATE()) "
            + "GROUP BY ji.JOB_NAME "
            + "ORDER BY runs DESC";

        try {
            return tpl.get().query(sql, (rs, n) -> new TopJobStat(
                rs.getString("JOB_NAME"), rs.getInt("runs"), rs.getInt("failures"),
                rs.getLong("avg_read"), rs.getLong("avg_written"), rs.getInt("avg_duration")
            ));
        } catch (Exception ex) {
            log.warn("DB query failed for client '{}', using mock: {}", clientId, ex.getMessage());
            return mock.getTopJobs(clientId);
        }
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private Optional<JdbcTemplate> resolve(String clientId) {
        if (useMockData) return Optional.empty();
        return dsManager.getTemplate(clientId);
    }

    private String buildJobsWhere(String status, String jobName, int days) {
        StringBuilder sb = new StringBuilder("WHERE je.START_TIME >= DATEADD(DAY, -")
            .append(days).append(", GETDATE())");
        if (status  != null && !status.isBlank())  sb.append(" AND je.STATUS = '").append(status.replace("'","")).append("'");
        if (jobName != null && !jobName.isBlank())  sb.append(" AND ji.JOB_NAME LIKE '%").append(jobName.replace("'","")).append("%'");
        return sb.toString();
    }

    private RowMapper<JobRow> jobRowMapper() {
        return (rs, n) -> new JobRow(
            rs.getLong("JOB_EXECUTION_ID"),
            rs.getLong("JOB_INSTANCE_ID"),
            rs.getString("JOB_NAME"),
            rs.getString("STATUS"),
            rs.getString("EXIT_CODE"),
            rs.getString("START_TIME"),
            rs.getString("END_TIME"),
            rs.getInt("DURATION_SECONDS"),
            rs.getString("CORRELATION_ID"),
            rs.getString("CONFIG_HASH"),
            rs.getLong("TOTAL_READ"),
            rs.getLong("TOTAL_WRITTEN"),
            rs.getLong("TOTAL_FILTERED"),
            rs.getLong("TOTAL_ERRORS"),
            rs.getString("ERROR_SUMMARY")
        );
    }

    private RowMapper<StepRow> stepRowMapper() {
        return (rs, n) -> new StepRow(
            rs.getString("STEP_NAME"),
            rs.getString("STATUS"),
            rs.getLong("READ_COUNT"),
            rs.getLong("WRITE_COUNT"),
            rs.getLong("FILTER_COUNT"),
            rs.getLong("SKIP_COUNT"),
            rs.getString("ERROR_DETAIL")
        );
    }
}
