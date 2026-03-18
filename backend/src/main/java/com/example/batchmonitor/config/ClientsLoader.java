package com.example.batchmonitor.config;

import com.example.batchmonitor.model.ClientConfig;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class ClientsLoader {

    private static final Logger log = LoggerFactory.getLogger(ClientsLoader.class);

    @Value("${batch-monitor.clients-file:classpath:clients.json}")
    private String clientsFile;

    private final CopyOnWriteArrayList<ClientConfig> clients = new CopyOnWriteArrayList<>();
    private final ObjectMapper mapper = new ObjectMapper();

    @PostConstruct
    public void load() {
        try {
            Resource resource = new DefaultResourceLoader().getResource(clientsFile);
            try (InputStream in = resource.getInputStream()) {
                List<ClientConfig> loaded = mapper.readValue(in, new TypeReference<>() {});
                clients.clear();
                clients.addAll(loaded);
                log.info("Loaded {} client configuration(s) from {}", clients.size(), clientsFile);
            }
        } catch (IOException e) {
            log.warn("Could not load clients from {}: {} — starting with empty client list.", clientsFile, e.getMessage());
        }
    }

    public List<ClientConfig> getAll() {
        return List.copyOf(clients);
    }

    public Optional<ClientConfig> findById(String id) {
        return clients.stream().filter(c -> c.id().equals(id)).findFirst();
    }

    /** Replaces the full client list and persists it back to the JSON file. */
    public void save(List<ClientConfig> updated) throws IOException {
        clients.clear();
        clients.addAll(updated);

        Resource resource = new DefaultResourceLoader().getResource(clientsFile);
        // Only persist if it's a writable file-system resource
        if (resource.getFile() != null) {
            mapper.writerWithDefaultPrettyPrinter().writeValue(resource.getFile(), new ArrayList<>(clients));
        }
    }
}
