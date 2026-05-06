'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User, LogOut, Settings, Users, Building2,
  Shield, ChevronDown, Bell, Calendar, Wifi, X,
  Plus, Edit2, CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Profile {
  full_name: string; email: string; role: string
  branch?: { name: string; code: string } | undefined
}
interface HeaderProps { profile: Profile; onMenuClick: () => void }

const now = new Date()
const dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

export default function Header({ profile, onMenuClick }: HeaderProps) {
  const [dropOpen, setDropOpen] = useState(false)
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success('Logged out')
    router.push('/login')
  }

  const isAdmin = profile.role === 'admin'

  return (
    <>
      <header style={{
        background: 'white', borderBottom: '1px solid #e2e8f0',
        padding: '0 24px', height: '60px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Left: hamburger + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button id="menu-toggle" onClick={onMenuClick}
            className="lg:hidden"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#64748b' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{dateStr}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <Wifi size={11} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#16a34a' }}>Live</span>
          </div>
        </div>

        {/* Right: notifications + profile dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Notification bell */}
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#64748b', borderRadius: '8px' }}>
            <Bell size={18} />
          </button>

          {/* Admin quick panel button */}
          {isAdmin && (
            <button onClick={() => setAdminPanelOpen(true)} id="admin-panel-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px',
                padding: '6px 12px', cursor: 'pointer', fontSize: '12px',
                fontWeight: '700', color: '#1d4ed8'
              }}>
              <Shield size={13} />
              Admin Panel
            </button>
          )}

          {/* Profile dropdown */}
          <div ref={dropRef} style={{ position: 'relative' }}>
            <button onClick={() => setDropOpen(!dropOpen)} id="profile-menu-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: dropOpen ? '#f1f5f9' : 'transparent',
                border: '1px solid #e2e8f0', borderRadius: '10px',
                padding: '6px 10px', cursor: 'pointer', transition: 'all 0.15s'
              }}>
              {/* Avatar */}
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: isAdmin ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: '700', color: 'white', flexShrink: 0
              }}>
                {profile.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', lineHeight: 1.2 }}>
                  {profile.full_name?.split(' ')[0] || 'User'}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{profile.role}</div>
              </div>
              <ChevronDown size={13} style={{ color: '#94a3b8', transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* Dropdown menu */}
            {dropOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '44px', width: '220px',
                background: 'white', borderRadius: '14px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0',
                padding: '6px', zIndex: 100, animation: 'fadeIn 0.15s ease'
              }}>
                {/* User info */}
                <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid #f1f5f9', marginBottom: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{profile.full_name}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{profile.email}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                    <span style={{
                      fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px',
                      background: isAdmin ? '#fee2e2' : '#eff6ff', color: isAdmin ? '#b91c1c' : '#2563eb'
                    }}>{profile.role}</span>
                    {profile.branch && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: '#f0fdf4', color: '#15803d' }}>
                        {profile.branch.code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin-only quick actions */}
                {isAdmin && (
                  <div style={{ marginBottom: '4px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '600', color: '#94a3b8', padding: '4px 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Actions</div>
                    <button onClick={() => { setDropOpen(false); setAdminPanelOpen(true) }}
                      id="open-admin-panel"
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <Shield size={14} style={{ color: '#2563eb' }} />
                      <span style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>Admin Panel</span>
                    </button>
                    <Link href="/admin/users" onClick={() => setDropOpen(false)} id="nav-manage-users"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', textDecoration: 'none', color: '#374151', fontSize: '13px', fontWeight: '500' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <Users size={14} style={{ color: '#7c3aed' }} />
                      Manage Users
                    </Link>
                    <Link href="/admin/settings" onClick={() => setDropOpen(false)} id="nav-branch-settings"
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', textDecoration: 'none', color: '#374151', fontSize: '13px', fontWeight: '500' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <Building2 size={14} style={{ color: '#0891b2' }} />
                      Branch Settings
                    </Link>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '4px', paddingTop: '4px' }}>
                  <button onClick={handleLogout} id="logout-btn"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '8px', color: '#dc2626' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <LogOut size={14} />
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Admin Quick Panel Slide-over ─────────────────────────────────────── */}
      {adminPanelOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          {/* Overlay */}
          <div onClick={() => setAdminPanelOpen(false)}
            style={{ flex: 1, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)' }} />

          {/* Panel */}
          <div style={{
            width: '360px', height: '100vh', background: 'white',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto'
          }}>
            {/* Panel header */}
            <div style={{
              background: 'linear-gradient(135deg, #1d4ed8, #1e40af)',
              padding: '20px 20px 16px', flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ color: 'white', fontWeight: '900', fontSize: '14px' }}>RT</span>
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: '800', fontSize: '15px' }}>Admin Panel</div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>Rights Tracker Control</div>
                  </div>
                </div>
                <button onClick={() => setAdminPanelOpen(false)} id="close-admin-panel"
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white' }}>
                  <X size={16} />
                </button>
              </div>
              {/* Admin info */}
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>{profile.full_name}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{profile.email}</div>
                <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
                  <span style={{ fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>ADMIN</span>
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: '20px' }}>All Branches</span>
                </div>
              </div>
            </div>

            {/* Admin permissions summary */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Your Permissions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'View All Data', icon: '👁', granted: true },
                  { label: 'Edit & Delete', icon: '✏️', granted: true },
                  { label: 'Create Users', icon: '👤', granted: true },
                  { label: 'Manage Branches', icon: '🏢', granted: true },
                  { label: 'MIS Reports', icon: '📊', granted: true },
                  { label: 'All Branches', icon: '🌐', granted: true },
                ].map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 10px', borderRadius: '8px',
                    background: '#f0fdf4', border: '1px solid #bbf7d0'
                  }}>
                    <span style={{ fontSize: '14px' }}>{p.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#0f172a' }}>{p.label}</div>
                    </div>
                    <CheckCircle size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ padding: '16px 20px', flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Quick Actions</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Create User */}
                <Link href="/admin/users" onClick={() => setAdminPanelOpen(false)} id="quick-create-user"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', transition: 'all 0.2s' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Manage Users</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>Create users, assign roles & branch rights</div>
                  </div>
                  <Plus size={16} style={{ color: '#2563eb', marginLeft: 'auto' }} />
                </Link>

                {/* Branch Settings */}
                <Link href="/admin/settings" onClick={() => setAdminPanelOpen(false)} id="quick-branch-settings"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '12px', background: '#faf5ff', border: '1px solid #e9d5ff', transition: 'all 0.2s' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Branch Settings</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>Add, edit branches & cluster assignments</div>
                  </div>
                  <Edit2 size={16} style={{ color: '#7c3aed', marginLeft: 'auto' }} />
                </Link>

                {/* All Dashboards */}
                <Link href="/" onClick={() => setAdminPanelOpen(false)} id="quick-dashboard"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#16a34a,#15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Settings size={18} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Dashboard Overview</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>View all branches, MIS & credit data</div>
                  </div>
                  <User size={16} style={{ color: '#16a34a', marginLeft: 'auto' }} />
                </Link>
              </div>

              {/* Rights explanation */}
              <div style={{ marginTop: '16px', padding: '12px', borderRadius: '10px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#c2410c', marginBottom: '6px' }}>📋 How Rights Work</div>
                <div style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.6' }}>
                  <div>• <strong>Admin</strong> — Full access to everything</div>
                  <div>• <strong>Editor</strong> — Can add &amp; edit data in assigned branch</div>
                  <div>• <strong>Viewer</strong> — Read-only access to assigned branch</div>
                  <div style={{ marginTop: '4px', color: '#b45309' }}>Set branch = "All Branches" for cluster-wide access</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={handleLogout} id="admin-panel-logout"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', background: '#fee2e2', border: '1px solid #fecaca', cursor: 'pointer', color: '#b91c1c', fontWeight: '600', fontSize: '13px' }}>
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
