import { Link, useLocation } from 'react-router-dom'
import { Home, BarChart3, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/', label: '首页', icon: Home },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/settings', label: '我的', icon: Settings2 },
]

/** 底部导航：激活态为明黄胶囊 */
export default function TabBar() {
  const { pathname } = useLocation()
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 bg-white/95 px-6 pb-4 pt-2 backdrop-blur">
      <div className="card-soft flex items-center justify-between rounded-full px-2 py-2">
        {TABS.map(({ to, label, icon: Icon }) => {
          const isActive = pathname === to
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-black transition-all',
                isActive ? 'pill-sun shadow-md shadow-yellow-200' : 'text-[#9aa0b8]',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.8 : 2.2} />
              {isActive && label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
