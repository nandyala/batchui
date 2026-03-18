package com.example.batchmonitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TopJobStat(
    @JsonProperty("job_name")     String jobName,
    @JsonProperty("runs")         int    runs,
    @JsonProperty("failures")     int    failures,
    @JsonProperty("avg_read")     long   avgRead,
    @JsonProperty("avg_written")  long   avgWritten,
    @JsonProperty("avg_duration") int    avgDuration
) {}
