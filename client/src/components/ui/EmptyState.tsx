import { type LucideIcon, Inbox } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
}
export default function EmptyState({ icon: Icon = Inbox, title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
      <Icon size={40} className="text-gray-300" />
      <p className="font-medium text-gray-600">{title}</p>
      {description && <p className="text-sm text-center max-w-xs">{description}</p>}
    </div>
  )
}
