package com.example.batchmonitor.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ClientConfig(
    String  id,
    String  name,
    String  color,
    String  server,
    int     port,
    String  database,
    String  username,
    String  password,
    boolean encrypt,
    boolean trustServerCertificate
) {}
