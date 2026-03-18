import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Server, CheckCircle2, XCircle, Loader2, Plus, Trash2, Save } from 'lucide-react'
import { testClientConnection, saveClients } from '../../api/client'
import type { ClientConfig, ConnectionStatus } from '../../types'

interface Props {
  clients: ClientConfig[]
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

function newClient(): ClientConfig {
  return {
    id: '', name: '', color: COLORS[0],
    server: '', port: 1433, database: 'BATCH_DB',
    username: 'batch_reader', password: '',
    encrypt: false, trustServerCertificate: true,
  }
}

export default function SettingsPage({ clients: initialClients }: Props) {
  const qc = useQueryClient()
  const [clients, setClients] = useState<ClientConfig[]>(initialClients)
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus | null>>({})
  const [testing,  setTesting]  = useState<Record<string, boolean>>({})
  const [saved,    setSaved]    = useState(false)

  const saveMutation = useMutation({
    mutationFn: () => saveClients(clients),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  async function handleTest(id: string) {
    setTesting(t => ({ ...t, [id]: true }))
    setStatuses(s => ({ ...s, [id]: null }))
    try {
      const result = await testClientConnection(id)
      setStatuses(s => ({ ...s, [id]: result }))
    } catch {
      setStatuses(s => ({ ...s, [id]: { connected: false, message: 'Request failed', dataSource: '' } }))
    } finally {
      setTesting(t => ({ ...t, [id]: false }))
    }
  }

  function updateClient(idx: number, patch: Partial<ClientConfig>) {
    setClients(cs => cs.map((c, i) => i === idx ? { ...c, ...patch } : c))
  }

  function addClient() {
    setClients(cs => [...cs, newClient()])
  }

  function removeClient(idx: number) {
    setClients(cs => cs.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      <div className="px-6 py-5 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage client database connections</p>
          </div>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {saveMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : saved
                ? <CheckCircle2 size={14} />
                : <Save size={14} />
            }
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 py-6 space-y-4">
        {clients.map((client, idx) => (
          <ClientCard
            key={idx}
            client={client}
            status={statuses[client.id] ?? null}
            testing={testing[client.id] ?? false}
            onChange={patch => updateClient(idx, patch)}
            onTest={() => handleTest(client.id)}
            onRemove={() => removeClient(idx)}
          />
        ))}

        <button
          onClick={addClient}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Client
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface CardProps {
  client:   ClientConfig
  status:   ConnectionStatus | null
  testing:  boolean
  onChange: (patch: Partial<ClientConfig>) => void
  onTest:   () => void
  onRemove: () => void
}

function ClientCard({ client, status, testing, onChange, onTest, onRemove }: CardProps) {
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {/* Card header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => onChange({ color: c })}
                className={`w-5 h-5 rounded-full transition-transform ${client.color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input
            type="text"
            placeholder="Client name"
            value={client.name}
            onChange={e => onChange({ name: e.target.value })}
            className="text-base font-semibold text-gray-800 border-0 border-b border-transparent focus:border-indigo-400 focus:outline-none bg-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Test connection button */}
          <button
            onClick={onTest}
            disabled={testing || !client.id}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testing
              ? <Loader2 size={12} className="animate-spin text-gray-500" />
              : <Server size={12} className="text-gray-500" />
            }
            Test
          </button>
          <button onClick={onRemove} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Connection status */}
      {status && (
        <div className={`flex items-center gap-2 mb-4 text-xs px-3 py-2 rounded-lg ${
          status.connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {status.connected
            ? <CheckCircle2 size={13} />
            : <XCircle size={13} />
          }
          {status.message}
          {status.dataSource && <span className="font-mono opacity-70 ml-1">({status.dataSource})</span>}
        </div>
      )}

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Client ID"  value={client.id}       onChange={v => onChange({ id: v })}       placeholder="acme-corp" />
        <Field label="Database"   value={client.database}  onChange={v => onChange({ database: v })} placeholder="BATCH_DB" />
        <Field label="SQL Server" value={client.server}    onChange={v => onChange({ server: v })}   placeholder="sql.internal" />
        <Field label="Port"       value={String(client.port)} onChange={v => onChange({ port: Number(v) })} placeholder="1433" type="number" />
        <Field label="Username"   value={client.username}  onChange={v => onChange({ username: v })} placeholder="batch_reader" />
        <Field label="Password"   value={client.password}  onChange={v => onChange({ password: v })} placeholder="••••••••" type="password" />
      </div>

      <div className="flex gap-4 mt-3 text-xs text-gray-500">
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={client.encrypt}
            onChange={e => onChange({ encrypt: e.target.checked })}
            className="rounded"
          />
          Encrypt
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={client.trustServerCertificate}
            onChange={e => onChange({ trustServerCertificate: e.target.checked })}
            className="rounded"
          />
          Trust Server Certificate
        </label>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  )
}
