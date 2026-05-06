'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, TrendingUp, Download, RefreshCw, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface MISData {
  month: string; year: number;
  total_cases: number; total_login_amount: number;
  total_sanction_amount: number; total_disbursement_amount: number;
  approved_cases: number; rejected_cases: number;
  pending_cases: number; disbursed_cases: number;
  home_loan_cases: number; personal_loan_cases: number;
  business_loan_cases: number; car_loan_cases: number;
  branch?: { name: string }
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_MONTH = MONTHS[new Date().getMonth()]
const CURRENT_YEAR = new Date().getFullYear()

function getLast6Months() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: MONTHS[d.getMonth()], year: d.getFullYear() })
  }
  return months
}

export default function MISTrackerPage() {
  const [misData, setMisData] = useState<MISData[]>([])
  const [liveStats, setLiveStats] = useState<Record<string, { total: number; login: number; sanction: number; disb: number; approved: number; rejected: number; pending: number; disbursed: number }>>({})
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const supabase = createClient()

  const buildLiveStats = useCallback(async () => {
    const last6 = getLast6Months()
    const stats: typeof liveStats = {}
    for (const { month, year } of last6) {
      const { data } = await supabase.from('credit_tracker')
        .select('status, loan_amount, sanction_amount, disbursement_amount, loan_type')
        .eq('month', month).eq('year', year)
      if (data) {
        stats[`${month} ${year}`] = {
          total: data.length,
          login: data.reduce((s, c) => s + (Number(c.loan_amount) || 0), 0),
          sanction: data.reduce((s, c) => s + (Number(c.sanction_amount) || 0), 0),
          disb: data.reduce((s, c) => s + (Number(c.disbursement_amount) || 0), 0),
          approved: data.filter(c => c.status === 'Approved').length,
          rejected: data.filter(c => c.status === 'Rejected').length,
          pending: data.filter(c => c.status === 'Pending').length,
          disbursed: data.filter(c => c.status === 'Disbursed').length,
        }
      }
    }
    setLiveStats(stats)
  }, [supabase])

  const fetchData = useCallback(async () => {
    try {
      await buildLiveStats()
      const { data } = await supabase.from('mis_tracker')
        .select('*, branch:branches(name)')
        .order('year', { ascending: false })
      setMisData(data as MISData[] || [])
    } catch { toast.error('Failed to load MIS data') }
    finally { setLoading(false) }
  }, [supabase, buildLiveStats])

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('mis-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_tracker' }, () => buildLiveStats())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase, buildLiveStats])

  const handleExport = () => {
    const rows = Object.entries(liveStats).map(([label, s]) => ({
      'Month': label, 'Total Cases': s.total,
      'Login Amount': s.login, 'Sanction Amount': s.sanction, 'Disbursement Amount': s.disb,
      'Approved': s.approved, 'Rejected': s.rejected, 'Pending': s.pending, 'Disbursed': s.disbursed
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'MIS Tracker')
    XLSX.writeFile(wb, `MIS_Tracker_${CURRENT_MONTH}_${CURRENT_YEAR}.xlsx`)
    toast.success('MIS Report exported!')
  }

  const currentKey = `${selectedMonth} ${selectedYear}`
  const currentStats = liveStats[currentKey] || { total: 0, login: 0, sanction: 0, disb: 0, approved: 0, rejected: 0, pending: 0, disbursed: 0 }

  const formatAmt = (n: number) => {
    if (n >= 10000000) return `₹${(n/10000000).toFixed(2)}Cr`
    if (n >= 100000) return `₹${(n/100000).toFixed(2)}L`
    return `₹${n.toLocaleString('en-IN')}`
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">MIS Tracker</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Management Information System • Live data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-ghost py-2 px-3" id="refresh-mis"><RefreshCw size={16} /></button>
          <button onClick={handleExport} className="btn-ghost" id="export-mis"><Download size={16} /> Export Report</button>
        </div>
      </div>

      {/* Month selector */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
        <select id="mis-month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select id="mis-year" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input-field" style={{ width: 'auto' }}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Showing: <strong style={{ color: 'var(--text-primary)' }}>{selectedMonth} {selectedYear}</strong>
        </span>
      </div>

      {/* Current Month KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: currentStats.total, sub: 'this month', color: '#3b82f6' },
          { label: 'Login Amount', value: formatAmt(currentStats.login), sub: 'total applied', color: '#8b5cf6' },
          { label: 'Sanction Amount', value: formatAmt(currentStats.sanction), sub: 'total sanctioned', color: '#10b981' },
          { label: 'Disbursement', value: formatAmt(currentStats.disb), sub: 'total disbursed', color: '#f59e0b' },
        ].map((kpi, i) => (
          <div key={i} className="glass-card p-5 rounded-2xl">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</div>
            <div className="text-2xl font-bold mb-1" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: currentStats.pending, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Approved', value: currentStats.approved, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Disbursed', value: currentStats.disbursed, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Rejected', value: currentStats.rejected, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
        ].map((s, i) => (
          <div key={i} className="glass-card p-4 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: s.bg, color: s.color }}>
              {s.value}
            </div>
            <div>
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {currentStats.total ? `${((s.value / currentStats.total) * 100).toFixed(0)}%` : '0%'} of total
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 6-Month Trend Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <TrendingUp size={18} style={{ color: 'var(--accent-blue)' }} />
          <h2 className="font-semibold">6-Month Trend</h2>
          <div className="realtime-dot ml-2" />
          <span className="text-xs" style={{ color: '#10b981' }}>Live</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th><th>Total Cases</th><th>Login Amount</th>
                  <th>Sanction Amount</th><th>Disbursement</th>
                  <th>Approved</th><th>Pending</th><th>Rejected</th><th>Disbursed</th>
                  <th>Approval %</th>
                </tr>
              </thead>
              <tbody>
                {getLast6Months().map(({ month, year }) => {
                  const key = `${month} ${year}`
                  const s = liveStats[key] || { total: 0, login: 0, sanction: 0, disb: 0, approved: 0, rejected: 0, pending: 0, disbursed: 0 }
                  const approvalPct = s.total ? ((s.approved / s.total) * 100).toFixed(0) : '0'
                  const isCurrent = month === CURRENT_MONTH && year === CURRENT_YEAR
                  return (
                    <tr key={key} style={isCurrent ? { background: 'rgba(59,130,246,0.06)' } : {}}>
                      <td>
                        <div className="flex items-center gap-2">
                          {isCurrent && <span className="badge badge-disbursed" style={{ fontSize: '10px' }}>Current</span>}
                          <span className="font-medium">{month.substring(0,3)} {year}</span>
                        </div>
                      </td>
                      <td className="font-bold">{s.total}</td>
                      <td style={{ color: '#a78bfa' }}>{formatAmt(s.login)}</td>
                      <td style={{ color: '#10b981' }}>{formatAmt(s.sanction)}</td>
                      <td style={{ color: '#60a5fa' }}>{formatAmt(s.disb)}</td>
                      <td style={{ color: '#10b981' }}>{s.approved}</td>
                      <td style={{ color: '#f59e0b' }}>{s.pending}</td>
                      <td style={{ color: '#ef4444' }}>{s.rejected}</td>
                      <td style={{ color: '#60a5fa' }}>{s.disbursed}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="h-full rounded-full" style={{ width: `${approvalPct}%`, background: '#10b981' }} />
                          </div>
                          <span className="text-xs" style={{ color: '#10b981' }}>{approvalPct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {/* Totals row */}
                <tr style={{ background: 'rgba(59,130,246,0.04)', fontWeight: '700' }}>
                  <td style={{ color: '#60a5fa' }}>TOTAL</td>
                  <td>{Object.values(liveStats).reduce((s, m) => s + m.total, 0)}</td>
                  <td style={{ color: '#a78bfa' }}>{formatAmt(Object.values(liveStats).reduce((s, m) => s + m.login, 0))}</td>
                  <td style={{ color: '#10b981' }}>{formatAmt(Object.values(liveStats).reduce((s, m) => s + m.sanction, 0))}</td>
                  <td style={{ color: '#60a5fa' }}>{formatAmt(Object.values(liveStats).reduce((s, m) => s + m.disb, 0))}</td>
                  <td style={{ color: '#10b981' }}>{Object.values(liveStats).reduce((s, m) => s + m.approved, 0)}</td>
                  <td style={{ color: '#f59e0b' }}>{Object.values(liveStats).reduce((s, m) => s + m.pending, 0)}</td>
                  <td style={{ color: '#ef4444' }}>{Object.values(liveStats).reduce((s, m) => s + m.rejected, 0)}</td>
                  <td style={{ color: '#60a5fa' }}>{Object.values(liveStats).reduce((s, m) => s + m.disbursed, 0)}</td>
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
