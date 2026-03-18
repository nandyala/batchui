import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchClients } from './api/client'
import Sidebar from './components/layout/Sidebar'
import DashboardPage from './components/dashboard/DashboardPage'
import JobsPage from './components/jobs/JobsPage'
import SettingsPage from './components/settings/SettingsPage'

export default function App() {
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
  })

  const [selectedClientId, setSelectedClientId] = useState<string>('')

  // Auto-select first client once loaded
  const activeClientId = selectedClientId || clients[0]?.id || ''
  const activeClient   = clients.find(c => c.id === activeClientId)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        clients={clients}
        activeClientId={activeClientId}
        onSelectClient={setSelectedClientId}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Routes>
          <Route path="/"         element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={
            <DashboardPage clientId={activeClientId} clientName={activeClient?.name ?? ''} />
          } />
          <Route path="/jobs"     element={
            <JobsPage clientId={activeClientId} clientName={activeClient?.name ?? ''} />
          } />
          <Route path="/settings" element={<SettingsPage clients={clients} />} />
        </Routes>
      </div>
    </div>
  )
}
