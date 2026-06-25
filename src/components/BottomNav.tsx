import { NavLink } from 'react-router-dom'
const tabs = [['/today','Today'],['/trends','Trends'],['/climate','Climate'],['/me','Me']]
export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map(([to, label]) => (
        <NavLink key={to} to={to}>{label}</NavLink>
      ))}
    </nav>
  )
}
