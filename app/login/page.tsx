'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, Lock, Mail, TrendingUp, Users, BarChart3, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import LoginChatbot from '@/components/LoginChatbot'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Login successful!')
      router.push('/')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: TrendingUp, label: 'Real-time Credit Tracker' },
    { icon: Users,      label: 'Branch-wise Access Control' },
    { icon: BarChart3,  label: 'MIS Reports & Analytics' },
    { icon: FileText,   label: 'Monthly Case Management' },
  ]

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left Panel ── */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-14 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)',
        }}
      >
        {/* Subtle grid overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Glow blobs */}
        <div className="absolute" style={{
          width: '380px', height: '380px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)',
          top: '-80px', left: '-80px',
        }} />
        <div className="absolute" style={{
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29,78,216,0.2) 0%, transparent 70%)',
          bottom: '0px', right: '-60px',
        }} />

        {/* Content */}
        <div className="relative z-10 text-center max-w-sm w-full">

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.15), 0 16px 40px rgba(37,99,235,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Inner shine */}
              <div style={{
                position: 'absolute', top: '6px', left: '10px',
                width: '18px', height: '6px', borderRadius: '3px',
                background: 'rgba(255,255,255,0.3)', filter: 'blur(2px)',
              }} />
              <span style={{
                color: 'white', fontWeight: '900', fontSize: '28px',
                letterSpacing: '-1.5px', lineHeight: 1,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>RT</span>
            </div>
          </div>

          <h1 style={{
            fontSize: '34px', fontWeight: '800', color: '#ffffff',
            letterSpacing: '-0.8px', marginBottom: '8px', lineHeight: 1.15,
          }}>
            Rights Tracker
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', marginBottom: '40px', letterSpacing: '0.2px' }}>
            Credit &amp; Loan Management System
          </p>

          {/* Divider */}
          <div style={{
            height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
            marginBottom: '32px',
          }} />

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
            {features.map(({ icon: Icon, label }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} style={{ color: '#93c5fd' }} />
                </div>
                <span style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.78)', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tag */}
        <p className="absolute bottom-6" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px' }}>
          © 2025 Rights Tracker · Secure Portal
        </p>
      </div>

      {/* ── Right Panel ── */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10"
        style={{ background: '#f8faff' }}
      >
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            }}>
              <span style={{ color: 'white', fontWeight: '900', fontSize: '16px', letterSpacing: '-0.5px' }}>RT</span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.4px' }}>Rights Tracker</span>
          </div>

          {/* Card */}
          <div style={{
            background: 'white',
            borderRadius: '22px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03), 0 12px 48px rgba(37,99,235,0.10)',
            border: '1px solid #e8f0fe',
            padding: '36px 36px 32px',
          }}>
            {/* Card header */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#eff6ff', borderRadius: '20px', padding: '4px 12px',
                marginBottom: '14px',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Secure Login
                </span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.5px', marginBottom: '4px' }}>
                Welcome back
              </h2>
              <p style={{ fontSize: '13.5px', color: '#64748b' }}>
                Sign in to your account to continue
              </p>
            </div>

            <form id="login-form" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px', borderRadius: '10px', fontSize: '13.5px', padding: '11px 13px 11px 40px' }}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '7px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px', paddingRight: '44px', borderRadius: '10px', fontSize: '13.5px', padding: '11px 44px 11px 40px' }}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px',
                      display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                style={{
                  marginTop: '4px', width: '100%', padding: '13px',
                  background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: 'white', border: 'none', borderRadius: '11px',
                  fontSize: '14.5px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: loading ? 'none' : '0 4px 18px rgba(37,99,235,0.35)',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.2px',
                }}
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><LogIn size={17} /> Sign In</>
                )}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '20px' }}>
            Contact your administrator if you don&apos;t have access
          </p>
        </div>
      </div>

      {/* Floating chatbot */}
      <LoginChatbot />
    </div>
  )
}
