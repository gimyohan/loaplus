import type { LucideIcon } from 'lucide-react'

export interface ComingSoonViewProps {
  icon: LucideIcon
  title: string
  description: string
}

export function ComingSoonView({ icon: Icon, title, description }: ComingSoonViewProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
      <Icon className="h-10 w-10 text-muted-foreground" />
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
