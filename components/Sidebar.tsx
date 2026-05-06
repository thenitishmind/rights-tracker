'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, LogIn, Clock,
  BarChart3, Users, Settings, Shield, X, ChevronRight,
  FileBarChart, TrendingUp
} from 'lucide-react'

interface Profile { role: string; full_name: string; email: string; branch?: { name: string; code: string } }
interface SidebarProps { profile: Profile; isOpen: boolean; onClose: () => void }

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/credit-tracker', label: 'Credit Tracker', icon: CreditCard },
  { href: '/login-desk', label: 'Login Desk', icon: LogIn },
  { href: '/last-6-months', label: 'Last 6 Months', icon: Clock },
  { href: '/mis-tracker', label: 'MIS Tracker', icon: BarChart3 },
  { href: '/mis-reports', label: 'MIS Reports', icon: FileBarChart },
]
const adminItems = [
  { href: '/admin/users', label: 'Manage Users', icon: Users },
  { href: '/admin/settings', label: 'Branch Settings', icon: Settings },
]

export default function Sidebar({ profile, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          {/* RT Logo Box */}
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #60a5fa, #2563eb)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37,99,235,0.4)', flexShrink: 0
          }}>
            <span style={{ color: 'white', fontWeight: '900', fontSize: '14px', letterSpacing: '-0.5px' }}>RT</span>
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-tight">Rights Tracker</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Credit Management</div>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden" id="close-sidebar"
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white' }}>
          <X size={16} />
        </button>
      </div>

      {/* User profile mini card */}
      <div className="mx-3 my-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)', color: 'white', flexShrink: 0 }}>
            {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{profile.full_name || 'User'}</div>
            <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {profile.branch?.name || 'All Branches'}
            </div>
          </div>
          <span className="badge" style={{
            background: profile.role === 'admin' ? 'rgba(239,68,68,0.2)' : profile.role === 'editor' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.15)',
            color: profile.role === 'admin' ? '#fca5a5' : profile.role === 'editor' ? '#fcd34d' : 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '10px'
          }}>{profile.role}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="nav-section-label">Main Menu</div>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} id={`nav-${item.label.toLowerCase().replace(/\s+/g,'-')}`}
            onClick={onClose}
            className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
            <item.icon size={17} />
            <span className="flex-1">{item.label}</span>
            {isActive(item.href) && <ChevronRight size={13} style={{ opacity: 0.6 }} />}
          </Link>
        ))}

        {profile.role === 'admin' && (
          <>
            <div className="nav-section-label">Administration</div>
            {adminItems.map(item => (
              <Link key={item.href} href={item.href} id={`nav-admin-${item.label.toLowerCase().replace(/\s+/g,'-')}`}
                onClick={onClose}
                className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
                <item.icon size={17} />
                <span className="flex-1">{item.label}</span>
              </Link>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <div className="realtime-dot" style={{ background: '#4ade80', flexShrink: 0 }} />
          <span>Live sync active</span>
        </div>
      </div>
    </nav>
  )
}
