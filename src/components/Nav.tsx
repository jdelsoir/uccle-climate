import { NavLink } from 'react-router-dom'
import { Sun, TrendingUp, Trophy, Thermometer, User, Info } from 'lucide-react'

const tabs = [
  { to: '/today', label: 'Today', Icon: Sun },
  { to: '/trends', label: 'Trends', Icon: TrendingUp },
  { to: '/records', label: 'Records', Icon: Trophy },
  { to: '/climate', label: 'Climate', Icon: Thermometer },
  { to: '/me', label: 'Me', Icon: User },
  { to: '/about', label: 'About', Icon: Info },
]

export default function Nav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-border bg-surface/95 backdrop-blur
                 pb-[env(safe-area-inset-bottom)]
                 lg:static lg:mx-auto lg:max-w-[680px] lg:justify-center lg:gap-1 lg:border-t-0 lg:bg-transparent lg:pb-0 lg:pt-2"
    >
      {tabs.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-3 py-2 text-[11px] transition-colors
             lg:min-h-0 lg:flex-row lg:gap-2 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm
             ${isActive ? 'text-accent lg:bg-accent-soft' : 'text-muted hover:text-fg'}`
          }
        >
          <Icon size={19} strokeWidth={2} aria-hidden />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
