package com.example.batchmonitor.model;

public record ConnectionStatus(boolean connected, String message, String dataSource) {}
