package com.example.batchmonitor.model;

import java.util.List;

public record PagedResult<T>(List<T> rows, long total, int page, int pageSize) {}
