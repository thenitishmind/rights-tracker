'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Download, RefreshCw, BarChart3, Calendar, Building2, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_MONTH = MONTHS[new Date().getMonth()]
const CURRENT_YEAR = new Date().getFullYear()

interface BranchStat {
  branchId: string
  branchName: string
  total: number
  complete: number
  incomplete: number
  totalAmount: number
}

interface DailyStat {
  date: string
  count: number
  amount: number
  complete: number
  incomplete: number
}

export default function MISReportsPage() {
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [branchStats, setBranchStats] = useState<BranchStat[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [creditSummary, setCreditSummary] = useState({ total: 0, login: 0, sanction: 0, disb: 0, approved: 0, rejected: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      // Credit Tracker Summary
      const { data: creditData } = await supabase
        .from('credit_tracker')
        .select('status, loan_amount, sanction_amount, disbursement_amount')
        .eq('month', selectedMonth).eq('year', selectedYear)

      if (creditData) {
        setCreditSummary({
          total: creditData.length,
          login: creditData.reduce((s,c) => s + (Number(c.loan_amount)||0), 0),
          sanction: creditData.reduce((s,c) => s + (Number(c.sanction_amount)||0), 0),
          disb: creditData.reduce((s,c) => s + (Number(c.disbursement_amount)||0), 0),
          approved: creditData.filter(c => c.status === 'Approved').length,
          rejected: creditData.filter(c => c.status === 'Rejected').length,
          pending: creditData.filter(c => c.status === 'Pending').length,
        })
      }

      // Login Desk — Branch/Cluster Stats
      const { data: loginData } = await supabase
        .from('login_desk')
        .select('*, branch:branches(id, name, code)')
        .eq('month', selectedMonth).eq('year', selectedYear)

      if (loginData) {
        // Group by branch
        const branchMap = new Map<string, BranchStat>()
        loginData.forEach(entry => {
          const b = entry.branch as { id: string; name: string } | null
          const bid = b?.id || 'unassigned'
          const bname = b?.name || 'Unassigned'
          if (!branchMap.has(bid)) {
            branchMap.set(bid, { branchId: bid, branchName: bname, total: 0, complete: 0, incomplete: 0, totalAmount: 0 })
          }
          const stat = branchMap.get(bid)!
          stat.total++
          stat.totalAmount += Number(entry.loan_amount) || 0
          const isComplete = entry.file_status === 'Approved' || entry.file_status === 'Submitted'
          if (isComplete) stat.complete++
          else stat.incomplete++
        })
        setBranchStats(Array.from(branchMap.values()))

        // Group by date (daily)
        const dateMap = new Map<string, DailyStat>()
        loginData.forEach(entry => {
          const d = entry.date || 'Unknown'
          if (!dateMap.has(d)) dateMap.set(d, { date: d, count: 0, amount: 0, complete: 0, incomplete: 0 })
          const ds = dateMap.get(d)!
          ds.count++
          ds.amount += Number(entry.loan_amount) || 0
          const isComplete = entry.file_status === 'Approved' || entry.file_status === 'Submitted'
          if (isComplete) ds.complete++
          else ds.incomplete++
        })
        const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))
        setDailyStats(sorted)
      }
    } catch { toast.error('Failed to load MIS data') }
    finally { setLoading(false) }
  }, [supabase, selectedMonth, selectedYear])

  useEffect(() => {
    fetchAll()
    const channel = supabase.channel('mis-reports-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_tracker' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_desk' }, () => fetchAll())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchAll, supabase])

  const fmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(2)}L` : `₹${n.toLocaleString('en-IN')}`

  const downloadCreditReport = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Report': 'Credit Tracker Summary', 'Month': `${selectedMonth} ${selectedYear}` },
      {},
      { 'Metric': 'Total Cases', 'Value': creditSummary.total },
      { 'Metric': 'Login Amount', 'Value': creditSummary.login },
      { 'Metric': 'Sanction Amount', 'Value': creditSummary.sanction },
      { 'Metric': 'Disbursement Amount', 'Value': creditSummary.disb },
      { 'Metric': 'Approved', 'Value': creditSummary.approved },
      { 'Metric': 'Pending', 'Value': creditSummary.pending },
      { 'Metric': 'Rejected', 'Value': creditSummary.rejected },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Credit Summary')
    XLSX.writeFile(wb, `Credit_MIS_${selectedMonth}_${selectedYear}.xlsx`)
    toast.success('Credit report downloaded!')
  }

  const downloadBranchReport = () => {
    const rows = branchStats.map(b => ({
      'Branch': b.branchName,
      'Total Cases': b.total,
      'Complete': b.complete,
      'Incomplete': b.incomplete,
      'Completion %': b.total ? `${((b.complete/b.total)*100).toFixed(0)}%` : '0%',
      'Total Amount': b.totalAmount,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Branch Report')
    XLSX.writeFile(wb, `Branch_MIS_${selectedMonth}_${selectedYear}.xlsx`)
    toast.success('Branch report downloaded!')
  }

  const downloadDailyReport = () => {
    const rows = dailyStats.map(d => ({
      'Date': d.date,
      'Cases': d.count,
      'Complete': d.complete,
      'Incomplete': d.incomplete,
      'Amount': d.amount,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Report')
    XLSX.writeFile(wb, `Daily_MIS_${selectedMonth}_${selectedYear}.xlsx`)
    toast.success('Daily report downloaded!')
  }

  const downloadFullReport = async () => {
    // Fetch all data for comprehensive report
    const { data: creditFull } = await supabase
      .from('credit_tracker')
      .select('*, branch:branches(name)')
      .eq('month', selectedMonth).eq('year', selectedYear)
    const { data: loginFull } = await supabase
      .from('login_desk')
      .select('*, branch:branches(name)')
      .eq('month', selectedMonth).eq('year', selectedYear)

    const wb = XLSX.utils.book_new()

    // Sheet 1: Credit Tracker
    if (creditFull) {
      const ws1 = XLSX.utils.json_to_sheet(creditFull.map(c => ({
        'Sr No': c.sr_no, 'Case No': c.case_no, 'Applicant': c.applicant_name,
        'Loan Type': c.loan_type, 'Bank': c.bank_name, 'Login Amt': c.loan_amount,
        'Sanction Amt': c.sanction_amount, 'Disbursement': c.disbursement_amount,
        'Status': c.status, 'Branch': (c.branch as {name:string}|null)?.name || '',
        'Login Date': c.login_date, 'Disbursement Date': c.disbursement_date,
      })))
      XLSX.utils.book_append_sheet(wb, ws1, 'Credit Tracker')
    }

    // Sheet 2: Login Desk
    if (loginFull) {
      const ws2 = XLSX.utils.json_to_sheet(loginFull.map(e => ({
        'Sr No': e.sr_no, 'Date': e.date, 'Applicant': e.applicant_name,
        'Mobile': e.mobile, 'Loan Type': e.loan_type, 'Bank': e.bank_name,
        'Amount': e.loan_amount, 'Status': e.file_status,
        'Branch': (e.branch as {name:string}|null)?.name || '',
        'Assigned To': e.assigned_to,
      })))
      XLSX.utils.book_append_sheet(wb, ws2, 'Login Desk')
    }

    // Sheet 3: Branch Summary
    const ws3 = XLSX.utils.json_to_sheet(branchStats.map(b => ({
      'Branch': b.branchName, 'Total': b.total, 'Complete': b.complete,
      'Incomplete': b.incomplete, 'Amount': b.totalAmount
    })))
    XLSX.utils.book_append_sheet(wb, ws3, 'Branch Summary')

    // Sheet 4: Daily Summary
    const ws4 = XLSX.utils.json_to_sheet(dailyStats.map(d => ({
      'Date': d.date, 'Cases': d.count, 'Complete': d.complete,
      'Incomplete': d.incomplete, 'Amount': d.amount
    })))
    XLSX.utils.book_append_sheet(wb, ws4, 'Daily Summary')

    XLSX.writeFile(wb, `Full_MIS_Report_${selectedMonth}_${selectedYear}.xlsx`)
    toast.success('Full MIS report downloaded!')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">MIS Reports</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Real-time reports • Download any section</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchAll} className="btn-ghost py-2 px-3" id="refresh-mis-reports"><RefreshCw size={16} /></button>
          <button onClick={downloadFullReport} className="btn-primary" id="download-full-report">
            <Download size={16} /> Full Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
        <select id="mis-report-month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select id="mis-report-year" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input-field" style={{ width: 'auto' }}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <div className="realtime-dot" />
          <span className="text-xs" style={{ color: '#10b981' }}>Live data</span>
        </div>
      </div>

      {/* Credit Tracker Summary Card */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: '#3b82f6' }} />
            <h2 className="font-semibold">Credit Tracker — {selectedMonth} {selectedYear}</h2>
          </div>
          <button onClick={downloadCreditReport} className="btn-ghost py-1.5 px-3 text-xs" id="dl-credit-report">
            <Download size={13} /> Download
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Cases', value: creditSummary.total, color: '#3b82f6' },
            { label: 'Login Amount', value: fmt(creditSummary.login), color: '#8b5cf6' },
            { label: 'Sanction Amount', value: fmt(creditSummary.sanction), color: '#10b981' },
            { label: 'Disbursement', value: fmt(creditSummary.disb), color: '#f59e0b' },
          ].map((k,i) => (
            <div key={i} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-xl font-bold mb-1" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</div>
            </div>
          ))}
        </div>
        <div className="px-5 pb-4 flex gap-4">
          {[
            { label: 'Approved', value: creditSummary.approved, color: '#10b981' },
            { label: 'Pending', value: creditSummary.pending, color: '#f59e0b' },
            { label: 'Rejected', value: creditSummary.rejected, color: '#ef4444' },
          ].map((s,i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}:</span>
              <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Branch/Cluster Report */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Building2 size={18} style={{ color: '#8b5cf6' }} />
            <h2 className="font-semibold">Login Desk — Branch / Cluster Report</h2>
          </div>
          <button onClick={downloadBranchReport} className="btn-ghost py-1.5 px-3 text-xs" id="dl-branch-report">
            <Download size={13} /> Download
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : branchStats.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>No data for {selectedMonth} {selectedYear}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch / Cluster</th>
                  <th>Total Cases</th>
                  <th>Complete</th>
                  <th>Incomplete</th>
                  <th>Completion %</th>
                  <th>Total Amount</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {branchStats.map(b => {
                  const pct = b.total ? Math.round((b.complete / b.total) * 100) : 0
                  return (
                    <tr key={b.branchId}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                            {b.branchName.charAt(0)}
                          </div>
                          <span className="font-medium">{b.branchName}</span>
                        </div>
                      </td>
                      <td className="font-bold">{b.total}</td>
                      <td style={{ color: '#10b981', fontWeight: '600' }}>{b.complete}</td>
                      <td style={{ color: '#f59e0b', fontWeight: '600' }}>{b.incomplete}</td>
                      <td>
                        <span className={`badge ${pct >= 80 ? 'badge-approved' : pct >= 50 ? 'badge-pending' : 'badge-rejected'}`}>
                          {pct}%
                        </span>
                      </td>
                      <td style={{ color: '#10b981', fontWeight: '600' }}>{fmt(b.totalAmount)}</td>
                      <td>
                        <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {/* Totals */}
                <tr style={{ background: 'rgba(59,130,246,0.04)', fontWeight: '700' }}>
                  <td style={{ color: '#60a5fa' }}>TOTAL</td>
                  <td>{branchStats.reduce((s,b) => s+b.total, 0)}</td>
                  <td style={{ color: '#10b981' }}>{branchStats.reduce((s,b) => s+b.complete, 0)}</td>
                  <td style={{ color: '#f59e0b' }}>{branchStats.reduce((s,b) => s+b.incomplete, 0)}</td>
                  <td>—</td>
                  <td style={{ color: '#10b981' }}>{fmt(branchStats.reduce((s,b) => s+b.totalAmount, 0))}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Daily Wise Report */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={18} style={{ color: '#10b981' }} />
            <h2 className="font-semibold">Login Desk — Daily Report</h2>
          </div>
          <button onClick={downloadDailyReport} className="btn-ghost py-1.5 px-3 text-xs" id="dl-daily-report">
            <Download size={13} /> Download
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : dailyStats.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>No daily data for {selectedMonth} {selectedYear}</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Cases</th>
                  <th>Complete</th>
                  <th>Incomplete</th>
                  <th>Daily Amount</th>
                  <th>Completion Rate</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map(d => {
                  const pct = d.count ? Math.round((d.complete / d.count) * 100) : 0
                  const isToday = d.date === new Date().toISOString().split('T')[0]
                  return (
                    <tr key={d.date} style={isToday ? { background: 'rgba(59,130,246,0.05)' } : {}}>
                      <td>
                        <div className="flex items-center gap-2">
                          {isToday && <span className="badge badge-disbursed" style={{ fontSize: '9px' }}>Today</span>}
                          <span className="font-medium">{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </td>
                      <td className="font-bold">{d.count}</td>
                      <td style={{ color: '#10b981', fontWeight: '600' }}>{d.complete}</td>
                      <td style={{ color: '#f59e0b', fontWeight: '600' }}>{d.incomplete}</td>
                      <td style={{ color: '#10b981' }}>{fmt(d.amount)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                          <span className="text-xs" style={{ color: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {/* Monthly totals */}
                <tr style={{ background: 'rgba(16,185,129,0.04)', fontWeight: '700' }}>
                  <td style={{ color: '#10b981' }}>MONTH TOTAL</td>
                  <td>{dailyStats.reduce((s,d) => s+d.count, 0)}</td>
                  <td style={{ color: '#10b981' }}>{dailyStats.reduce((s,d) => s+d.complete, 0)}</td>
                  <td style={{ color: '#f59e0b' }}>{dailyStats.reduce((s,d) => s+d.incomplete, 0)}</td>
                  <td style={{ color: '#10b981' }}>{fmt(dailyStats.reduce((s,d) => s+d.amount, 0))}</td>
                  <td>—</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
