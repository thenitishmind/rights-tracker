'use client'

import { useEffect, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, X, Phone, Mail, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface WelcomePopupProps {
  userName: string
  hasAccess: boolean
  branchName?: string
  role?: string
  onClose?: () => void
}

export default function WelcomePopup({ userName, hasAccess, branchName, role, onClose }: WelcomePopupProps) {
  const [visible, setVisible] = useState(true)
  const [animateOut, setAnimateOut] = useState(false)

  useEffect(() => {
    if (hasAccess) {
      const timer = setTimeout(() => handleClose(), 4500)
      return () => clearTimeout(timer)
    }
  }, [hasAccess])

  const handleClose = () => {
    setAnimateOut(true)
    setTimeout(() => { setVisible(false); onClose?.() }, 300)
  }

  if (!visible) return null

  return (
    <div className="modal-overlay" style={{ opacity: animateOut ? 0 : 1, transition: 'opacity 0.3s ease', zIndex: 9999 }}
      onClick={hasAccess ? () => handleClose() : undefined}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'white', borderRadius: '20px', width: '100%', maxWidth: '400px',
        overflow: 'hidden', position: 'relative',
        boxShadow: '0 25px 80px rgba(0,0,0,0.15)',
        border: hasAccess ? '1px solid #bbf7d0' : '1px solid #fecaca',
        transform: animateOut ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.3s ease'
      }}>
        {/* Top bar */}
        <div style={{
          background: hasAccess ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
          padding: '20px 24px 16px', color: 'white', position: 'relative'
        }}>
          {hasAccess && (
            <button onClick={handleClose} id="close-welcome-popup" style={{
              position: 'absolute', top: '14px', right: '14px', background: 'rgba(255,255,255,0.2)',
              border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'white'
            }}><X size={13} /></button>
          )}
          <div className="flex items-center gap-3">
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '10px' }}>
              {hasAccess ? <CheckCircle size={28} /> : <AlertTriangle size={28} />}
            </div>
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ opacity: 0.8 }}>
                {hasAccess ? 'ACCESS GRANTED' : 'ACCESS RESTRICTED'}
              </div>
              <div className="text-xl font-bold">
                {hasAccess ? `Welcome, ${userName.split(' ')[0]}!` : 'No Access Rights'}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          {hasAccess ? (
            <>
              <p className="text-sm mb-4" style={{ color: '#64748b' }}>
                You&apos;re logged in to <strong style={{ color: '#0f172a' }}>Rights Tracker</strong>. Here&apos;s your access summary:
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: '#f8faff', border: '1px solid #dbeafe' }}>
                  <span className="text-xs" style={{ color: '#64748b' }}>Role</span>
                  <span className="badge" style={{
                    background: role === 'admin' ? '#fee2e2' : role === 'editor' ? '#fef3c7' : '#f1f5f9',
                    color: role === 'admin' ? '#b91c1c' : role === 'editor' ? '#92400e' : '#475569'
                  }}>{role}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: '#f8faff', border: '1px solid #dbeafe' }}>
                  <span className="text-xs" style={{ color: '#64748b' }}>Branch Access</span>
                  <span className="text-xs font-bold" style={{ color: '#1d4ed8' }}>{branchName || 'All Branches'}</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: '#f8faff', border: '1px solid #dbeafe' }}>
                  <span className="text-xs" style={{ color: '#64748b' }}>Can Edit</span>
                  <span className="text-xs font-bold" style={{ color: role !== 'viewer' ? '#16a34a' : '#dc2626' }}>
                    {role !== 'viewer' ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                <div style={{ height: '100%', background: '#16a34a', borderRadius: '2px', animation: 'progress-shrink 4.5s linear forwards' }} />
              </div>
              <p className="text-xs text-center" style={{ color: '#94a3b8' }}>Auto-closing in a moment...</p>
            </>
          ) : (
            <>
              <p className="text-sm mb-4" style={{ color: '#64748b' }}>
                Hello <strong style={{ color: '#0f172a' }}>{userName}</strong>, your account doesn&apos;t have access rights assigned yet.
              </p>

              <div className="p-3 rounded-xl mb-4" style={{ background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#c2410c' }}>What to do next:</p>
                <ul className="space-y-1.5 text-xs" style={{ color: '#78350f' }}>
                  <li className="flex gap-2"><span>1.</span>Contact your administrator</li>
                  <li className="flex gap-2"><span>2.</span>Request branch and role assignment</li>
                  <li className="flex gap-2"><span>3.</span>Log out and log back in after access is granted</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl mb-4" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: '#1d4ed8' }}>
                  <Shield size={11} /> Contact Administrator
                </p>
                <div className="space-y-1.5 text-xs" style={{ color: '#3730a3' }}>
                  <div className="flex items-center gap-2"><Mail size={11} /> Admin001@rightstrack.com</div>
                </div>
              </div>

              <button id="logout-no-access" onClick={async () => {
                const sb = createClient()
                await sb.auth.signOut()
                window.location.href = '/login'
              }} className="btn-danger w-full justify-center">
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
