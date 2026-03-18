package com.example.batchmonitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DashboardStats(
    @JsonProperty("totalRuns")           int  totalRuns,
    @JsonProperty("completedRuns")       int  completedRuns,
    @JsonProperty("failedRuns")          int  failedRuns,
    @JsonProperty("successRate")         int  successRate,
    @JsonProperty("totalRecordsRead")    long totalRecordsRead,
    @JsonProperty("totalRecordsWritten") long totalRecordsWritten,
    @JsonProperty("avgDurationSeconds")  int  avgDurationSeconds,
    @JsonProperty("activeJobs")          int  activeJobs
) {}
