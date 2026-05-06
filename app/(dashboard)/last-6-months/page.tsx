'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Search, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface Case6M {
  id: string; sr_no: number; case_no: string; applicant_name: string;
  loan_type: string; bank_name: string; loan_amount: number;
  disbursement_amount: number; status: string; login_date: string;
  disbursement_date: string; month: string; year: number;
  branch?: { name: string }[]
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const CURRENT_MONTH = MONTHS[new Date().getMonth()]
const CURRENT_YEAR = new Date().getFullYear()

// Get last 6 months
function getLast6Months() {
  const months = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: MONTHS[d.getMonth()], year: d.getFullYear() })
  }
  return months
}

export default function Last6MonthsPage() {
  const [allCases, setAllCases] = useState<Case6M[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const last6 = getLast6Months()
      const queries = last6.map(({ month, year }) =>
        supabase.from('credit_tracker')
          .select('id, sr_no, case_no, applicant_name, loan_type, bank_name, loan_amount, disbursement_amount, status, login_date, disbursement_date, month, year, branch:branches(name)')
          .eq('month', month).eq('year', year)
      )
      const results = await Promise.all(queries)
      const combined: Case6M[] = []
      results.forEach(r => { if (r.data) combined.push(...(r.data as Case6M[])) })
      combined.sort((a, b) => {
        const ai = MONTHS.indexOf(a.month) + a.year * 12
        const bi = MONTHS.indexOf(b.month) + b.year * 12
        return bi - ai
      })
      setAllCases(combined)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [supabase])

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('last6-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_tracker' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase])

  const handleExport = () => {
    const exportData = filtered.map(c => ({
      'Month/Year': `${c.month} ${c.year}`,
      'Sr No': c.sr_no, 'Case No': c.case_no,
      'Applicant': c.applicant_name, 'Loan Type': c.loan_type,
      'Bank': c.bank_name, 'Login Amount': c.loan_amount,
      'Disbursement Amount': c.disbursement_amount, 'Status': c.status,
      'Login Date': c.login_date, 'Disbursement Date': c.disbursement_date,
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Last 6 Months')
    XLSX.writeFile(wb, `Last_6_Months_Cases_${CURRENT_MONTH}_${CURRENT_YEAR}.xlsx`)
    toast.success('Exported!')
  }

  const filtered = allCases.filter(c => {
    const matchSearch = !search ||
      c.applicant_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.case_no?.toLowerCase().includes(search.toLowerCase())
    const matchMonth = !filterMonth || `${c.month} ${c.year}` === filterMonth
    return matchSearch && matchMonth
  })

  // Group by month for summary
  const monthGroups = getLast6Months().map(({ month, year }) => {
    const monthCases = allCases.filter(c => c.month === month && c.year === year)
    return {
      label: `${month} ${year}`,
      total: monthCases.length,
      disbursed: monthCases.filter(c => c.status === 'Disbursed').length,
      totalDisb: monthCases.reduce((s, c) => s + (Number(c.disbursement_amount) || 0), 0),
      totalLogin: monthCases.reduce((s, c) => s + (Number(c.loan_amount) || 0), 0),
    }
  })

  const formatAmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(2)}L` : `₹${n.toLocaleString('en-IN')}`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Last 6 Months Cases</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Historical view • {filtered.length} total cases</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-ghost py-2 px-3" id="refresh-last6"><RefreshCw size={16} /></button>
          <button onClick={handleExport} className="btn-ghost" id="export-last6"><Download size={16} /> Export</button>
        </div>
      </div>

      {/* Month Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {monthGroups.map((mg, i) => (
          <button key={i}
            onClick={() => setFilterMonth(filterMonth === mg.label ? '' : mg.label)}
            className={`glass-card p-3 rounded-xl text-left transition-all hover:scale-105 cursor-pointer ${filterMonth === mg.label ? 'border-blue-500' : ''}`}
            style={{
              border: filterMonth === mg.label ? '1px solid #3b82f6' : '1px solid var(--border)',
              background: filterMonth === mg.label ? 'rgba(59,130,246,0.08)' : undefined
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={12} style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{mg.label}</span>
            </div>
            <div className="text-lg font-bold">{mg.total}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>cases</div>
            <div className="mt-1 text-xs font-medium" style={{ color: '#10b981' }}>{formatAmt(mg.totalDisb)}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input id="search-last6" type="text" placeholder="Search applicant, case no..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field" style={{ paddingLeft: '36px' }} />
        </div>
        <select id="month-filter-last6" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          <option value="">All Months</option>
          {monthGroups.map(mg => <option key={mg.label} value={mg.label}>{mg.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading cases...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th><th>Sr</th><th>Case No</th><th>Applicant</th>
                  <th>Loan Type</th><th>Bank</th><th>Login Amt</th>
                  <th>Disbursed Amt</th><th>Status</th><th>Login Date</th><th>Disb Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    No cases found in last 6 months
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span className="badge badge-disbursed">{c.month?.substring(0,3)} {c.year}</span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{c.sr_no || '—'}</td>
                    <td className="font-mono text-xs" style={{ color: '#60a5fa' }}>{c.case_no || '—'}</td>
                    <td className="font-medium">{c.applicant_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.loan_type || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.bank_name || '—'}</td>
                    <td style={{ color: '#10b981', fontWeight: '600' }}>{c.loan_amount ? formatAmt(c.loan_amount) : '—'}</td>
                    <td style={{ color: '#60a5fa', fontWeight: '600' }}>{c.disbursement_amount ? formatAmt(c.disbursement_amount) : '—'}</td>
                    <td>
                      <span className={`badge ${c.status === 'Approved' ? 'badge-approved' : c.status === 'Rejected' ? 'badge-rejected' : c.status === 'Disbursed' ? 'badge-disbursed' : 'badge-pending'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.login_date || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.disbursement_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
