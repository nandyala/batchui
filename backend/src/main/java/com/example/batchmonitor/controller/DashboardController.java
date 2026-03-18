package com.example.batchmonitor.controller;

import com.example.batchmonitor.model.DashboardStats;
import com.example.batchmonitor.model.TopJobStat;
import com.example.batchmonitor.model.TrendPoint;
import com.example.batchmonitor.service.JobQueryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients/{clientId}")
public class DashboardController {

    private final JobQueryService jobQueryService;

    public DashboardController(JobQueryService jobQueryService) {
        this.jobQueryService = jobQueryService;
    }

    @GetMapping("/dashboard")
    public DashboardStats dashboard(@PathVariable String clientId) {
        return jobQueryService.getDashboard(clientId);
    }

    @GetMapping("/trends")
    public List<TrendPoint> trends(@PathVariable String clientId) {
        return jobQueryService.getTrends(clientId);
    }

    @GetMapping("/top-jobs")
    public List<TopJobStat> topJobs(@PathVariable String clientId) {
        return jobQueryService.getTopJobs(clientId);
    }
}
