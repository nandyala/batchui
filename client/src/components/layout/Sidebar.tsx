import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ListChecks, Settings, Activity, ChevronRight } from 'lucide-react'
import type { ClientConfig } from '../../types'

interface Props {
  clients: ClientConfig[]
  activeClientId: string
  onSelectClient: (id: string) => void
}

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/jobs',      icon: ListChecks,      label: 'Jobs'      },
  { to: '/settings',  icon: Settings,        label: 'Settings'  },
]

export default function Sidebar({ clients, activeClientId, onSelectClient }: Props) {
  return (
    <aside className="w-64 shrink-0 bg-gray-900 text-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-700/60">
        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <Activity size={17} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-sm leading-none text-white">Batch Monitor</p>
          <p className="text-xs text-gray-400 mt-0.5">Spring Batch Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 pt-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Clients */}
      <div className="mt-6 px-3 flex-1 overflow-y-auto">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Clients
        </p>
        <ul className="space-y-0.5">
          {clients.map(client => {
            const isActive = client.id === activeClientId
            return (
              <li key={client.id}>
                <button
                  onClick={() => onSelectClient(client.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-gray-700 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: client.color }}
                  />
                  <span className="truncate flex-1 text-left">{client.name}</span>
                  {isActive && <ChevronRight size={13} className="text-gray-400" />}
                </button>
              </li>
            )
          })}
          {clients.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500 italic">
              No clients configured
            </li>
          )}
        </ul>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-700/60">
        <p className="text-xs text-gray-500">v1.0 · Spring Batch 6</p>
      </div>
    </aside>
  )
}
