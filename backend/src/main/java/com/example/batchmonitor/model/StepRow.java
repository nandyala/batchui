package com.example.batchmonitor.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record StepRow(
    @JsonProperty("step_name")    String stepName,
    @JsonProperty("status")       String status,
    @JsonProperty("read_count")   long   readCount,
    @JsonProperty("write_count")  long   writeCount,
    @JsonProperty("filter_count") long   filterCount,
    @JsonProperty("skip_count")   long   skipCount,
    @JsonProperty("error_detail") String errorDetail
) {}
