package com.example.batchmonitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record JobRow(
    @JsonProperty("job_execution_id") long   jobExecutionId,
    @JsonProperty("job_instance_id")  long   jobInstanceId,
    @JsonProperty("job_name")         String jobName,
    @JsonProperty("status")           String status,
    @JsonProperty("exit_code")        String exitCode,
    @JsonProperty("start_time")       String startTime,
    @JsonProperty("end_time")         String endTime,
    @JsonProperty("duration_seconds") int    durationSeconds,
    @JsonProperty("correlation_id")   String correlationId,
    @JsonProperty("config_hash")      String configHash,
    @JsonProperty("total_read")       long   totalRead,
    @JsonProperty("total_written")    long   totalWritten,
    @JsonProperty("total_filtered")   long   totalFiltered,
    @JsonProperty("total_errors")     long   totalErrors,
    @JsonProperty("error_summary")    String errorSummary
) {}
