package com.example.batchmonitor.model;

import java.util.List;

public record JobDetail(JobRow job, List<StepRow> steps) {}
