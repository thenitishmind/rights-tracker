'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCard, LogIn, BarChart3, TrendingUp, Plus,
  ArrowRight, Calendar, RefreshCw, ArrowRightLeft, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_MONTH = MONTHS[new Date().getMonth()]
const CURRENT_YEAR = new Date().getFullYear()

interface DashStats {
  totalCredit: number; loginAmt: number; sanctionAmt: number; disbAmt: number
  approved: number; pending: number; rejected: number; disbursed: number
  loginDeskTotal: number; loginPending: number; loginSubmitted: number
}
interface RecentCase {
  id: string; applicant_name: string; loan_type: string; loan_amount: number; status: string; login_date: string; bank_name: string
}
interface TransferCase {
  id: string; applicant_name: string; loan_type: string; loan_amount: number; status: string; case_no: string
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashStats>({ totalCredit:0, loginAmt:0, sanctionAmt:0, disbAmt:0, approved:0, pending:0, rejected:0, disbursed:0, loginDeskTotal:0, loginPending:0, loginSubmitted:0 })
  const [recentCases, setRecentCases] = useState<RecentCase[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [showTransfer, setShowTransfer] = useState(false)
  const [pendingCases, setPendingCases] = useState<TransferCase[]>([])
  const [selectedTransfer, setSelectedTransfer] = useState<Set<string>>(new Set())
  const [transferMonth, setTransferMonth] = useState('')
  const [transferYear, setTransferYear] = useState(CURRENT_YEAR)
  const [userRole, setUserRole] = useState('')
  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('user_profiles').select('role, branch_id').eq('id', user.id).single()
      setUserRole(prof?.role || '')

      const { data: credit } = await supabase.from('credit_tracker').select('loan_amount, sanction_amount, disbursement_amount, status')
        .eq('month', selectedMonth).eq('year', selectedYear)
      const { data: loginDesk } = await supabase.from('login_desk').select('file_status, loan_amount')
        .eq('month', selectedMonth).eq('year', selectedYear)
      const { data: recent } = await supabase.from('credit_tracker')
        .select('id, applicant_name, loan_type, loan_amount, status, login_date, bank_name')
        .eq('month', selectedMonth).eq('year', selectedYear)
        .order('created_at', { ascending: false }).limit(6)

      if (credit) {
        setStats({
          totalCredit: credit.length,
          loginAmt: credit.reduce((s,c) => s+Number(c.loan_amount||0),0),
          sanctionAmt: credit.reduce((s,c) => s+Number(c.sanction_amount||0),0),
          disbAmt: credit.reduce((s,c) => s+Number(c.disbursement_amount||0),0),
          approved: credit.filter(c=>c.status==='Approved').length,
          pending: credit.filter(c=>c.status==='Pending').length,
          rejected: credit.filter(c=>c.status==='Rejected').length,
          disbursed: credit.filter(c=>c.status==='Disbursed').length,
          loginDeskTotal: loginDesk?.length || 0,
          loginPending: loginDesk?.filter(l=>l.file_status==='Pending').length || 0,
          loginSubmitted: loginDesk?.filter(l=>l.file_status==='Submitted'||l.file_status==='Approved').length || 0,
        })
      }
      setRecentCases((recent as RecentCase[]) || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [supabase, selectedMonth, selectedYear])

  useEffect(() => {
    fetchStats()
    const ch = supabase.channel('dashboard-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'credit_tracker' }, () => fetchStats())
      .on('postgres_changes', { event:'*', schema:'public', table:'login_desk' }, () => fetchStats())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchStats, supabase])

  // Auto-initialize new month
  const handleNewMonth = async (month: string, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    toast.success(`📅 Viewing ${month} ${year} — ready for new entries!`)
  }

  // Load pending cases for transfer
  const loadPendingForTransfer = async () => {
    const { data } = await supabase.from('credit_tracker')
      .select('id, applicant_name, loan_type, loan_amount, status, case_no')
      .eq('month', selectedMonth).eq('year', selectedYear)
      .in('status', ['Pending', 'Under Review'])
    setPendingCases((data as TransferCase[]) || [])
    setShowTransfer(true)
  }

  // Execute transfer
  const executeTransfer = async () => {
    if (!transferMonth) { toast.error('Select target month'); return }
    if (selectedTransfer.size === 0) { toast.error('Select at least one case'); return }
    const ids = Array.from(selectedTransfer)
    const { error } = await supabase.from('credit_tracker')
      .update({ month: transferMonth, year: transferYear })
      .in('id', ids)
    if (error) { toast.error('Transfer failed: ' + error.message); return }
    toast.success(`✅ ${ids.length} case(s) transferred to ${transferMonth} ${transferYear}!`)
    setShowTransfer(false)
    setSelectedTransfer(new Set())
    fetchStats()
  }

  const fmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`
  const pct = (n: number, t: number) => t ? Math.round((n/t)*100) : 0

  const topCards = [
    { label: 'Total Cases', value: stats.totalCredit, color: 'blue', icon: CreditCard, link: '/credit-tracker', sub: `${selectedMonth} ${selectedYear}` },
    { label: 'Login Amount', value: fmt(stats.loginAmt), color: 'green', icon: TrendingUp, link: '/credit-tracker', sub: 'Total file amount' },
    { label: 'Sanctioned', value: fmt(stats.sanctionAmt), color: 'purple', icon: CheckCircle, link: '/credit-tracker', sub: 'Approved amount' },
    { label: 'Disbursed', value: fmt(stats.disbAmt), color: 'amber', icon: BarChart3, link: '/mis-tracker', sub: 'Total disbursement' },
  ]

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', borderRadius: '14px', padding: '20px 24px' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white mb-0.5">Dashboard Overview</h1>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
              <div className="realtime-dot" style={{ background: '#4ade80' }} />
              Live data • {selectedMonth} {selectedYear}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select id="dashboard-month" value={selectedMonth} onChange={e => handleNewMonth(e.target.value, selectedYear)}
              className="input-field" style={{ width: 'auto', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '8px' }}>
              {MONTHS.map(m => <option key={m} value={m} style={{ color: '#0f172a', background: 'white' }}>{m}</option>)}
            </select>
            <select id="dashboard-year" value={selectedYear} onChange={e => handleNewMonth(selectedMonth, Number(e.target.value))}
              className="input-field" style={{ width: 'auto', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '8px' }}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y} style={{ color: '#0f172a', background: 'white' }}>{y}</option>)}
            </select>
            <button onClick={fetchStats} className="btn-icon" id="refresh-dashboard"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
              <RefreshCw size={15} />
            </button>
            {(userRole === 'admin' || userRole === 'editor') && (
              <button onClick={loadPendingForTransfer} id="transfer-cases-btn"
                style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
                <ArrowRightLeft size={15} /> Transfer Cases
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '100px' }} />)}
        </div>
      ) : (
        <div className="grid-4">
          {topCards.map((card, i) => (
            <Link key={i} href={card.link} id={`stat-card-${i}`} style={{ textDecoration: 'none' }}>
              <div className={`stat-card ${card.color}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: card.color === 'blue' ? '#dbeafe' : card.color === 'green' ? '#dcfce7' : card.color === 'purple' ? '#ede9fe' : '#fef3c7'
                    }}>
                    <card.icon size={17} style={{
                      color: card.color === 'blue' ? '#2563eb' : card.color === 'green' ? '#16a34a' : card.color === 'purple' ? '#7c3aed' : '#d97706'
                    }} />
                  </div>
                  <ArrowRight size={13} style={{ color: '#94a3b8' }} />
                </div>
                <div className="text-2xl font-extrabold mb-0.5" style={{ color: '#0f172a' }}>{card.value}</div>
                <div className="text-xs font-medium" style={{ color: '#64748b' }}>{card.label}</div>
                <div className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{card.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Status breakdown + Login Desk */}
      <div className="grid-2">
        {/* Status Breakdown */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#0f172a' }}>
            <CreditCard size={16} style={{ color: '#2563eb' }} /> Credit Status — {selectedMonth}
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Approved', count: stats.approved, color: '#16a34a', bg: '#dcfce7' },
              { label: 'Disbursed', count: stats.disbursed, color: '#2563eb', bg: '#dbeafe' },
              { label: 'Pending', count: stats.pending, color: '#d97706', bg: '#fef3c7' },
              { label: 'Rejected', count: stats.rejected, color: '#dc2626', bg: '#fee2e2' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="text-xs font-medium w-20" style={{ color: '#64748b' }}>{s.label}</div>
                <div className="flex-1 progress-bar">
                  <div className="progress-fill" style={{ width: `${pct(s.count, stats.totalCredit)}%`, background: s.color }} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: s.color }}>{s.count}</span>
                  <span className="text-xs" style={{ color: '#94a3b8' }}>({pct(s.count, stats.totalCredit)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Login Desk Summary */}
        <div className="card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: '#0f172a' }}>
            <LogIn size={16} style={{ color: '#7c3aed' }} /> Login Desk — {selectedMonth}
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Total Files', value: stats.loginDeskTotal, color: '#2563eb', bg: '#dbeafe' },
              { label: 'Submitted', value: stats.loginSubmitted, color: '#16a34a', bg: '#dcfce7' },
              { label: 'Pending', value: stats.loginPending, color: '#d97706', bg: '#fef3c7' },
            ].map((s,i) => (
              <div key={i} className="text-center p-3 rounded-xl" style={{ background: s.bg }}>
                <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs" style={{ color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <Link href="/login-desk" id="go-to-login-desk"
            className="btn-ghost w-full justify-center text-sm" style={{ borderColor: '#dbeafe', color: '#2563eb' }}>
            View Login Desk <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Recent Cases */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h3 className="font-semibold flex items-center gap-2" style={{ color: '#0f172a' }}>
            <Calendar size={16} style={{ color: '#2563eb' }} />
            Recent Cases
          </h3>
          <Link href="/credit-tracker" id="view-all-cases" className="text-xs font-medium flex items-center gap-1" style={{ color: '#2563eb' }}>
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr><th>Applicant</th><th>Loan Type</th><th>Bank</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {recentCases.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10" style={{ color: '#94a3b8' }}>
                  No cases for {selectedMonth} {selectedYear}.{' '}
                  <Link href="/credit-tracker" style={{ color: '#2563eb', fontWeight: '600' }}>Add one →</Link>
                </td></tr>
              ) : recentCases.map(c => (
                <tr key={c.id}>
                  <td className="font-medium" style={{ color: '#0f172a' }}>{c.applicant_name || '—'}</td>
                  <td style={{ color: '#64748b' }}>{c.loan_type || '—'}</td>
                  <td style={{ color: '#64748b' }}>{c.bank_name || '—'}</td>
                  <td className="font-semibold" style={{ color: '#16a34a' }}>{c.loan_amount ? fmt(Number(c.loan_amount)) : '—'}</td>
                  <td>
                    <span className={`badge badge-${c.status?.toLowerCase().replace(/\s+/g,'')}`}>{c.status}</span>
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: '12px' }}>{c.login_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid-3">
        {[
          { label: 'Add Credit Case', icon: Plus, href: '/credit-tracker', color: '#2563eb', bg: '#eff6ff' },
          { label: 'Login Desk Entry', icon: LogIn, href: '/login-desk', color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'View MIS Reports', icon: BarChart3, href: '/mis-reports', color: '#16a34a', bg: '#f0fdf4' },
        ].map((a, i) => (
          <Link key={i} href={a.href} id={`quick-action-${i}`}
            className="card p-4 flex items-center gap-3 transition-all"
            style={{ textDecoration: 'none', cursor: 'pointer' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: a.bg }}>
              <a.icon size={17} style={{ color: a.color }} />
            </div>
            <span className="font-medium text-sm" style={{ color: '#0f172a' }}>{a.label}</span>
            <ArrowRight size={14} style={{ color: '#94a3b8', marginLeft: 'auto' }} />
          </Link>
        ))}
      </div>

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowTransfer(false)}>
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: '#0f172a' }}>Transfer Cases to Next Month</h2>
                <p className="text-sm" style={{ color: '#64748b' }}>{pendingCases.length} pending/under-review cases from {selectedMonth}</p>
              </div>
            </div>
            <div className="p-6">
              {/* Target month selection */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>Transfer to Month</label>
                  <select className="input-field" value={transferMonth} onChange={e => setTransferMonth(e.target.value)}>
                    <option value="">Select Month</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div style={{ width: '120px' }}>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: '#374151' }}>Year</label>
                  <select className="input-field" value={transferYear} onChange={e => setTransferYear(Number(e.target.value))}>
                    {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Case list */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: '#374151' }}>Select cases to transfer:</span>
                  <button onClick={() => setSelectedTransfer(new Set(pendingCases.map(c => c.id)))}
                    className="text-xs font-medium" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb' }}>
                    Select All
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pendingCases.map(c => (
                    <label key={c.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: selectedTransfer.has(c.id) ? '#eff6ff' : '#f8faff', border: `1px solid ${selectedTransfer.has(c.id) ? '#bfdbfe' : '#e2e8f0'}` }}>
                      <input type="checkbox" checked={selectedTransfer.has(c.id)}
                        onChange={e => {
                          const s = new Set(selectedTransfer)
                          e.target.checked ? s.add(c.id) : s.delete(c.id)
                          setSelectedTransfer(s)
                        }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium" style={{ color: '#0f172a' }}>{c.applicant_name}</div>
                        <div className="text-xs" style={{ color: '#64748b' }}>{c.loan_type} • {c.loan_amount ? fmt(Number(c.loan_amount)) : '—'}</div>
                      </div>
                      <span className={`badge badge-${c.status?.toLowerCase().replace(/\s+/g,'')}`}>{c.status}</span>
                    </label>
                  ))}
                  {pendingCases.length === 0 && (
                    <div className="text-center py-6 text-sm" style={{ color: '#94a3b8' }}>No pending cases to transfer</div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowTransfer(false)} className="btn-ghost flex-1" id="cancel-transfer">Cancel</button>
                <button onClick={executeTransfer} className="btn-primary flex-1 justify-center" id="confirm-transfer"
                  disabled={selectedTransfer.size === 0 || !transferMonth}>
                  <ArrowRightLeft size={15} /> Transfer {selectedTransfer.size > 0 ? `(${selectedTransfer.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
