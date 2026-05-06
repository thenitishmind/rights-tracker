'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import WelcomePopup from '@/components/WelcomePopup'
import type { User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  branch_id: string | null
  can_view: boolean
  can_edit: boolean
  is_active: boolean
  branch?: { name: string; code: string } | null
}

const POPUP_SESSION_KEY = 'rights_welcome_shown'

// Race a promise against a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))
  ])
}

function defaultProfile(userId: string, email: string): UserProfile {
  return {
    id: userId, email, full_name: email.split('@')[0],
    role: 'viewer', branch_id: null,
    can_view: true, can_edit: false, is_active: true
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string, email: string): Promise<UserProfile> => {
    const fallback = defaultProfile(userId, email)

    try {
      // Simple query — no join, no complex RLS sub-query
      const query = supabase
        .from('user_profiles')
        .select('id, email, full_name, role, branch_id, can_view, can_edit, is_active')
        .eq('id', userId)
        .maybeSingle()

      const result = await withTimeout(query as any, 5000, { data: null, error: new Error('timeout') })

      if (!result.data) {
        // Try to upsert a basic profile
        const { data: upserted } = await withTimeout(
          supabase.from('user_profiles')
            .upsert({ id: userId, email, full_name: email.split('@')[0], role: 'viewer', can_view: true, can_edit: false, is_active: true }, { onConflict: 'id' })
            .select('id, email, full_name, role, branch_id, can_view, can_edit, is_active')
            .maybeSingle() as any,
          4000,
          { data: null, error: null }
        )
        return (upserted as UserProfile | null) || fallback
      }

      const finalProfile = {
        ...fallback,
        ...(result.data as any),
        is_active: (result.data as any).is_active ?? true,
        can_view: (result.data as any).can_view ?? true,
        can_edit: (result.data as any).can_edit ?? false,
      } as UserProfile

      // Admin ALWAYS gets full rights — override any DB value
      if (finalProfile.role === 'admin') {
        finalProfile.can_view = true
        finalProfile.can_edit = true
        finalProfile.is_active = true
      }

      return finalProfile
    } catch {
      return fallback
    }
  }, [supabase])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          { data: { session: null }, error: null }
        )

        if (!session) {
          router.push('/login')
          return
        }
        if (!mounted) return
        setUser(session.user)

        const prof = await fetchProfile(session.user.id, session.user.email || '')
        if (!mounted) return
        setProfile(prof)

        const alreadyShown = sessionStorage.getItem(POPUP_SESSION_KEY)
        if (!alreadyShown) {
          setShowPopup(true)
          sessionStorage.setItem(POPUP_SESSION_KEY, '1')
        }
      } catch (e) {
        console.error('Init error:', e)
        // Even if error — don't stay stuck. Redirect to login
        if (mounted) router.push('/login')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(POPUP_SESSION_KEY)
        router.push('/login')
        return
      }
      if (event === 'SIGNED_IN' && session && mounted) {
        setUser(session.user)
        const prof = await fetchProfile(session.user.id, session.user.email || '')
        if (mounted) {
          setProfile(prof)
          setLoading(false)
          if (!sessionStorage.getItem(POPUP_SESSION_KEY)) {
            setShowPopup(true)
            sessionStorage.setItem(POPUP_SESSION_KEY, '1')
          }
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase, fetchProfile])

  // Redirect hook MUST be before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  // ── Loading Screen
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'linear-gradient(135deg, #eff6ff 0%, #f0f4ff 100%)'
      }}>
        <div style={{
          background: 'white', borderRadius: '28px', padding: '48px 40px',
          textAlign: 'center', boxShadow: '0 24px 80px rgba(37,99,235,0.15)',
          border: '1px solid #dbeafe', maxWidth: '320px', width: '100%'
        }}>
          {/* Logo box */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 12px 32px rgba(29,78,216,0.35)'
          }}>
            {/* RT Monogram */}
            <span style={{ color: 'white', fontWeight: '900', fontSize: '26px', letterSpacing: '-1px', fontFamily: 'sans-serif' }}>RT</span>
          </div>

          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            Rights Tracker
          </h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '28px', fontWeight: '500' }}>
            Credit &amp; Loan Management System
          </p>

          {/* Progress bar style loader */}
          <div style={{ height: '4px', background: '#dbeafe', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{
              height: '100%', width: '40%', background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
              borderRadius: '2px', animation: 'shimmer 1.2s ease-in-out infinite alternate'
            }} />
          </div>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#2563eb' }}>Loading dashboard...</p>
          <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Connecting to server</p>
        </div>

        <style>{`
          @keyframes shimmer {
            from { width: 20%; margin-left: 0; }
            to { width: 60%; margin-left: 40%; }
          }
        `}</style>
      </div>
    )
  }

  // If done loading but no user, wait for redirect effect
  if (!user || !profile) return null

  const hasAccess = profile.role === 'admin' || profile.role === 'editor' || profile.can_view === true

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4ff' }}>
      {/* Welcome Popup */}
      {showPopup && (
        <WelcomePopup
          userName={profile.full_name || profile.email || 'User'}
          hasAccess={hasAccess}
          branchName={profile.branch?.name}
          role={profile.role}
          onClose={() => setShowPopup(false)}
        />
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        profile={{ full_name: profile.full_name || profile.email, email: profile.email, role: profile.role, branch: profile.branch || undefined }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="main-content flex-1 flex flex-col" style={{ minHeight: '100vh' }}>
        <Header
          profile={{ full_name: profile.full_name || profile.email, email: profile.email, role: profile.role, branch: profile.branch || undefined }}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        />

        <main style={{ flex: 1, padding: '20px 24px' }}>
          {!hasAccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: '#fee2e2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '32px' }}>🔒</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>No Access Rights</h2>
              <p style={{ color: '#64748b', maxWidth: '360px', lineHeight: '1.7', fontSize: '14px', marginBottom: '20px' }}>
                Your account doesn&apos;t have access rights assigned yet. Contact your administrator.
              </p>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 20px', fontSize: '13px', color: '#1d4ed8' }}>
                📧 Admin001@rightstrack.com
              </div>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  )
}
