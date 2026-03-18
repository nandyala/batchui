package com.example.batchmonitor.service;

import com.example.batchmonitor.config.ClientsLoader;
import com.example.batchmonitor.model.ClientConfig;
import com.example.batchmonitor.model.ConnectionStatus;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Creates and caches one {@link JdbcTemplate} per client on first use.
 * Falls back gracefully when a client's SQL Server is unreachable.
 */
@Service
public class DynamicDataSourceManager {

    private static final Logger log = LoggerFactory.getLogger(DynamicDataSourceManager.class);

    private final ClientsLoader clientsLoader;
    private final Map<String, JdbcTemplate>     templates   = new ConcurrentHashMap<>();
    private final Map<String, HikariDataSource> dataSources = new ConcurrentHashMap<>();

    public DynamicDataSourceManager(ClientsLoader clientsLoader) {
        this.clientsLoader = clientsLoader;
    }

    /**
     * Returns a live {@link JdbcTemplate} for the given client, or
     * {@link Optional#empty()} if the database cannot be reached.
     */
    public Optional<JdbcTemplate> getTemplate(String clientId) {
        if (templates.containsKey(clientId)) {
            return Optional.of(templates.get(clientId));
        }
        Optional<ClientConfig> config = clientsLoader.findById(clientId);
        if (config.isEmpty()) {
            log.warn("No client configuration found for id='{}'", clientId);
            return Optional.empty();
        }
        return tryConnect(config.get());
    }

    public ConnectionStatus testConnection(String clientId) {
        // Force a fresh connection attempt by evicting the cached template
        evict(clientId);
        Optional<ClientConfig> config = clientsLoader.findById(clientId);
        if (config.isEmpty()) {
            return new ConnectionStatus(false, "Client '" + clientId + "' not found in configuration.", "");
        }
        ClientConfig c = config.get();
        String dsLabel = c.server() + ":" + c.port() + "/" + c.database();
        Optional<JdbcTemplate> tpl = tryConnect(c);
        if (tpl.isEmpty()) {
            return new ConnectionStatus(false, "Cannot reach " + dsLabel, dsLabel);
        }
        try {
            tpl.get().queryForObject("SELECT 1", Integer.class);
            return new ConnectionStatus(true, "Connected to " + dsLabel, dsLabel);
        } catch (Exception ex) {
            evict(clientId);
            return new ConnectionStatus(false, ex.getMessage(), dsLabel);
        }
    }

    @PreDestroy
    public void closeAll() {
        dataSources.values().forEach(HikariDataSource::close);
    }

    // -----------------------------------------------------------------------

    /**
     * Builds the JDBC URL for the given client.
     *
     * <p>SQL Authentication (default):
     * <pre>jdbc:sqlserver://host:1433;databaseName=DB;encrypt=true;trustServerCertificate=false</pre>
     *
     * <p>NTLM / Windows Authentication:
     * <pre>jdbc:sqlserver://host:1433;databaseName=DB;encrypt=true;trustServerCertificate=false;
     *      authenticationScheme=ntlm;domain=CORP;user=svc_batch;password=secret</pre>
     */
    private String buildJdbcUrl(ClientConfig config) {
        StringBuilder url = new StringBuilder(String.format(
            "jdbc:sqlserver://%s:%d;databaseName=%s;encrypt=%s;trustServerCertificate=%s",
            config.server(), config.port(), config.database(),
            config.encrypt(), config.trustServerCertificate()));

        if (config.isNtlm()) {
            // authenticationScheme drives the NTLM handshake inside the MS JDBC driver
            url.append(";authenticationScheme=").append(config.authenticationScheme());

            if (config.domain() != null && !config.domain().isBlank()) {
                url.append(";domain=").append(config.domain());
            }
            // For NTLM the driver also accepts user/password in the URL
            if (config.username() != null && !config.username().isBlank()) {
                url.append(";user=").append(config.username());
            }
            if (config.password() != null && !config.password().isBlank()) {
                url.append(";password=").append(config.password());
            }
        }
        return url.toString();
    }

    private Optional<JdbcTemplate> tryConnect(ClientConfig config) {
        String url = buildJdbcUrl(config);
        try {
            HikariConfig hc = new HikariConfig();
            hc.setJdbcUrl(url);

            if (config.isNtlm()) {
                // Credentials are embedded in the URL for NTLM; HikariCP still
                // requires non-null values so we pass empty strings.
                hc.setUsername(config.username() != null ? config.username() : "");
                hc.setPassword(config.password() != null ? config.password() : "");
            } else {
                hc.setUsername(config.username());
                hc.setPassword(config.password());
            }

            hc.setMaximumPoolSize(3);
            hc.setMinimumIdle(1);
            hc.setConnectionTimeout(5_000);   // 5 s — fail fast on bad config
            hc.setPoolName("Pool-" + config.id());

            HikariDataSource ds  = new HikariDataSource(hc);
            JdbcTemplate     tpl = new JdbcTemplate(ds);
            tpl.queryForObject("SELECT 1", Integer.class);  // smoke test

            dataSources.put(config.id(), ds);
            templates.put(config.id(), tpl);
            log.info("Connected to SQL Server for client '{}' (auth={}, server={}:{})",
                     config.id(),
                     config.authenticationScheme() != null ? config.authenticationScheme() : "sqlAuth",
                     config.server(), config.port());
            return Optional.of(tpl);
        } catch (Exception ex) {
            log.warn("Cannot connect to SQL Server for client '{}' ({}): {}",
                     config.id(), url, ex.getMessage());
            return Optional.empty();
        }
    }

    private void evict(String clientId) {
        templates.remove(clientId);
        HikariDataSource old = dataSources.remove(clientId);
        if (old != null && !old.isClosed()) old.close();
    }
}
