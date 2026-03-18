package com.example.batchmonitor.controller;

import com.example.batchmonitor.model.JobDetail;
import com.example.batchmonitor.model.JobRow;
import com.example.batchmonitor.model.PagedResult;
import com.example.batchmonitor.service.JobQueryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clients/{clientId}/jobs")
public class JobController {

    private final JobQueryService jobQueryService;

    public JobController(JobQueryService jobQueryService) {
        this.jobQueryService = jobQueryService;
    }

    @GetMapping
    public PagedResult<JobRow> listJobs(
            @PathVariable String clientId,
            @RequestParam(required = false)            String status,
            @RequestParam(required = false)            String jobName,
            @RequestParam(defaultValue = "7")          int    days,
            @RequestParam(defaultValue = "1")          int    page,
            @RequestParam(defaultValue = "25")         int    pageSize) {
        return jobQueryService.getJobs(clientId, status, jobName, days, page, pageSize);
    }

    @GetMapping("/{executionId}")
    public ResponseEntity<JobDetail> jobDetail(
            @PathVariable String clientId,
            @PathVariable long   executionId) {
        return jobQueryService.getJobDetail(clientId, executionId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
