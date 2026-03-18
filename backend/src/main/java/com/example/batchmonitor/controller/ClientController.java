package com.example.batchmonitor.controller;

import com.example.batchmonitor.config.ClientsLoader;
import com.example.batchmonitor.model.ClientConfig;
import com.example.batchmonitor.model.ConnectionStatus;
import com.example.batchmonitor.service.DynamicDataSourceManager;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientsLoader            loader;
    private final DynamicDataSourceManager dsManager;

    public ClientController(ClientsLoader loader, DynamicDataSourceManager dsManager) {
        this.loader    = loader;
        this.dsManager = dsManager;
    }

    @GetMapping
    public List<ClientConfig> listClients() {
        return loader.getAll();
    }

    @PostMapping("/{id}/test")
    public ConnectionStatus testConnection(@PathVariable String id) {
        return dsManager.testConnection(id);
    }

    @PutMapping
    public ResponseEntity<Void> saveClients(@RequestBody List<ClientConfig> clients) {
        try {
            loader.save(clients);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
