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
    boolean trustServerCertificate,
    // NTLM / Windows Authentication support
    String  authenticationScheme,   // "ntlm" | "nativeAuthentication" | null → SQL auth
    String  domain                  // Windows domain – required when authenticationScheme=ntlm
) {
    /** True when this client uses NTLM or Windows (Kerberos) authentication. */
    public boolean isNtlm() {
        return "ntlm".equalsIgnoreCase(authenticationScheme)
            || "nativeAuthentication".equalsIgnoreCase(authenticationScheme);
    }
}
