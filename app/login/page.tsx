'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, LogIn, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

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

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)' }}>

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)' }}>

        {/* Decorative circles */}
        <div className="absolute" style={{ width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: '-100px', left: '-100px' }} />
        <div className="absolute" style={{ width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: '50px', right: '-80px' }} />
        <div className="absolute" style={{ width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: '200px', right: '60px' }} />

        <div className="relative z-10 text-center max-w-md">
          {/* RT Logo Box */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '24px',
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.25)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px'
          }}>
            <span style={{ color: 'white', fontWeight: '900', fontSize: '32px', letterSpacing: '-1px' }}>RT</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Rights Tracker</h1>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Credit & Loan Management System
          </p>

          {/* Feature list */}
          <div className="space-y-3 text-left">
            {[
              'Real-time Credit Tracker',
              'Branch-wise Access Control',
              'MIS Reports & Analytics',
              'Monthly Case Management',
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div style={{
              width: '40px', height: '40px', borderRadius: '11px',
              background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37,99,235,0.3)'
            }}>
              <span style={{ color: 'white', fontWeight: '900', fontSize: '15px', letterSpacing: '-0.5px' }}>RT</span>
            </div>
            <span className="text-xl font-bold" style={{ color: '#0f172a' }}>Rights Tracker</span>
          </div>

          {/* Card */}
          <div className="p-8" style={{ background: 'white', borderRadius: '20px', boxShadow: '0 10px 50px rgba(37,99,235,0.12)', border: '1px solid #dbeafe' }}>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: '#0f172a' }}>Welcome back</h2>
              <p className="text-sm" style={{ color: '#64748b' }}>Sign in to your account to continue</p>
            </div>

            <form id="login-form" onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                  <input
                    id="login-email"
                    type="email" required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field"
                    style={{ paddingLeft: '40px', paddingRight: '44px' }}
                    placeholder="Enter password"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button id="login-submit" type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2"
                style={{ padding: '11px', fontSize: '15px', borderRadius: '10px' }}>
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><LogIn size={18} /> Sign In</>
                )}
              </button>
            </form>


          </div>

          <p className="text-center text-xs mt-4" style={{ color: '#94a3b8' }}>
            Contact administrator if you don&apos;t have access
          </p>
        </div>
      </div>
    </div>
  )
}
