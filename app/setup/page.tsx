'use client'

import { Shield, ExternalLink, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const steps = [
  {
    num: 1,
    title: 'Create Supabase Project',
    desc: 'Go to supabase.com → New Project → Choose a name and strong password',
    link: 'https://supabase.com/dashboard',
    linkText: 'Open Supabase Dashboard'
  },
  {
    num: 2,
    title: 'Get Your API Keys',
    desc: 'Project Settings → API → Copy "Project URL" and "anon public" key',
    link: null, linkText: null
  },
  {
    num: 3,
    title: 'Update .env.local',
    desc: 'Edit the .env.local file in your project root with your Supabase credentials',
    link: null, linkText: null
  },
  {
    num: 4,
    title: 'Run Database Schema',
    desc: 'In Supabase → SQL Editor → paste and run the schema from supabase/schema.sql',
    link: null, linkText: null
  },
  {
    num: 5,
    title: 'Create Admin User',
    desc: 'Supabase → Authentication → Users → Add User with email and password "Allthe admin". Then run the SQL to set role as admin.',
    link: null, linkText: null
  },
]

const envTemplate = `NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

const adminSQL = `-- Run this AFTER creating the admin user in Supabase Auth:
UPDATE user_profiles 
SET role = 'admin', can_view = true, can_edit = true, is_active = true
WHERE email = 'Admin001@yourdomain.com';`

export default function SetupPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    toast.success('Copied!')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-2xl animate-fade-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Shield size={32} color="white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Setup Required</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure Supabase to start using Rights Tracker</p>
        </div>

        <div className="space-y-4">
          {steps.map(step => (
            <div key={step.num} className="glass-card p-5 rounded-2xl flex gap-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: 'white' }}>
                {step.num}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
                {step.link && (
                  <a href={step.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium"
                    style={{ color: '#60a5fa' }}>
                    <ExternalLink size={12} /> {step.linkText}
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* .env.local template */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">.env.local template</h3>
              <button onClick={() => copy(envTemplate, 'env')} className="btn-ghost py-1.5 px-3 text-xs">
                {copied === 'env' ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied === 'env' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: 'var(--bg-secondary)', color: '#10b981' }}>
              {envTemplate}
            </pre>
          </div>

          {/* Admin SQL */}
          <div className="glass-card p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Set Admin Role SQL</h3>
              <button onClick={() => copy(adminSQL, 'sql')} className="btn-ghost py-1.5 px-3 text-xs">
                {copied === 'sql' ? <CheckCircle size={12} /> : <Copy size={12} />}
                {copied === 'sql' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs p-3 rounded-lg overflow-x-auto" style={{ background: 'var(--bg-secondary)', color: '#a78bfa' }}>
              {adminSQL}
            </pre>
          </div>

          <div className="p-4 rounded-xl text-center"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              After updating .env.local, <strong>restart the dev server</strong> and refresh this page
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
