'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Filter, Edit2, Trash2, Upload, X, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import DuplicateImportModal, { type ImportRow } from '@/components/DuplicateImportModal'

interface Branch { id: string; name: string; code: string }
interface CreditCase {
  id: string
  sr_no: number
  case_no: string
  applicant_name: string
  loan_type: string
  loan_amount: number
  sanction_amount: number
  disbursement_amount: number
  status: string
  bank_name: string
  product: string
  login_date: string
  sanction_date: string
  disbursement_date: string
  remarks: string
  month: string
  year: number
  branch_id: string
  branch?: { name: string }
}
interface UserProfile { role: string; can_edit: boolean; branch_id: string | null }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const LOAN_TYPES = ['Home Loan','Personal Loan','Business Loan','Car Loan','Loan Against Property','Education Loan','Gold Loan','Other']
const STATUSES = ['Pending','Approved','Rejected','Disbursed','Under Review']
const CURRENT_MONTH = MONTHS[new Date().getMonth()]
const CURRENT_YEAR = new Date().getFullYear()

const emptyForm = {
  sr_no: '', case_no: '', applicant_name: '', loan_type: '', loan_amount: '',
  sanction_amount: '', disbursement_amount: '', status: 'Pending', bank_name: '',
  product: '', login_date: '', sanction_date: '', disbursement_date: '',
  remarks: '', branch_id: ''
}

export default function CreditTrackerPage() {
  const [cases, setCases] = useState<CreditCase[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editCase, setEditCase] = useState<CreditCase | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [submitting, setSubmitting] = useState(false)
  const [pendingImport, setPendingImport] = useState<ImportRow[] | null>(null)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('user_profiles').select('role, can_edit, branch_id').eq('id', user.id).single()
      setProfile(prof)
      const { data: b } = await supabase.from('branches').select('*').order('name')
      setBranches(b || [])
      let q = supabase.from('credit_tracker').select('*, branch:branches(name)').eq('month', selectedMonth).eq('year', selectedYear).order('sr_no')
      const { data } = await q
      setCases(data as CreditCase[] || [])
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }, [supabase, selectedMonth, selectedYear])

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('credit-tracker-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_tracker' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase])

  const openAdd = () => {
    setForm({ ...emptyForm, branch_id: profile?.branch_id || '' })
    setEditCase(null)
    setModal('add')
  }
  const openEdit = (c: CreditCase) => {
    setForm({
      sr_no: String(c.sr_no || ''), case_no: c.case_no || '', applicant_name: c.applicant_name || '',
      loan_type: c.loan_type || '', loan_amount: String(c.loan_amount || ''), sanction_amount: String(c.sanction_amount || ''),
      disbursement_amount: String(c.disbursement_amount || ''), status: c.status || 'Pending',
      bank_name: c.bank_name || '', product: c.product || '', login_date: c.login_date || '',
      sanction_date: c.sanction_date || '', disbursement_date: c.disbursement_date || '',
      remarks: c.remarks || '', branch_id: c.branch_id || ''
    })
    setEditCase(c)
    setModal('edit')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        ...form, loan_amount: Number(form.loan_amount) || null,
        sanction_amount: Number(form.sanction_amount) || null,
        disbursement_amount: Number(form.disbursement_amount) || null,
        sr_no: Number(form.sr_no) || null,
        month: selectedMonth, year: selectedYear,
        updated_by: user?.id,
        login_date: form.login_date || null, sanction_date: form.sanction_date || null,
        disbursement_date: form.disbursement_date || null,
      }
      if (modal === 'add') {
        const { error } = await supabase.from('credit_tracker').insert({ ...payload, created_by: user?.id })
        if (error) throw error
        toast.success('Case added successfully!')
      } else if (editCase) {
        const { error } = await supabase.from('credit_tracker').update(payload).eq('id', editCase.id)
        if (error) throw error
        toast.success('Case updated!')
      }
      setModal(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this case?')) return
    const { error } = await supabase.from('credit_tracker').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else toast.success('Case deleted')
  }

  const handleExport = () => {
    const exportData = filtered.map(c => ({
      'Sr No': c.sr_no, 'Case No': c.case_no, 'Applicant': c.applicant_name,
      'Loan Type': c.loan_type, 'Bank': c.bank_name, 'Product': c.product,
      'Login Amount': c.loan_amount, 'Sanction Amount': c.sanction_amount,
      'Disbursement Amount': c.disbursement_amount, 'Status': c.status,
      'Login Date': c.login_date, 'Sanction Date': c.sanction_date,
      'Disbursement Date': c.disbursement_date, 'Remarks': c.remarks,
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Credit Tracker')
    XLSX.writeFile(wb, `Credit_Tracker_${selectedMonth}_${selectedYear}.xlsx`)
    toast.success('Exported!')
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]

      // Check for duplicates against existing cases in DB
      const { data: existing } = await supabase
        .from('credit_tracker')
        .select('applicant_name, case_no')
        .eq('month', selectedMonth).eq('year', selectedYear)

      const existingNames = new Set((existing || []).map(c => c.applicant_name?.toLowerCase().trim()))
      const existingCaseNos = new Set((existing || []).map(c => c.case_no?.toLowerCase().trim()).filter(Boolean))

      const importRows: ImportRow[] = rows.map((r, i) => {
        const name = String(r['Applicant'] || '').toLowerCase().trim()
        const caseNo = String(r['Case No'] || '').toLowerCase().trim()
        const isDupName = !!(name && existingNames.has(name))
        const isDupCase = !!(caseNo && existingCaseNos.has(caseNo))
        const isDuplicate = isDupName || isDupCase
        return {
          index: i,
          data: r,
          isDuplicate,
          duplicateField: isDupCase ? 'Case No' : isDupName ? 'Applicant Name' : undefined,
          duplicateValue: isDupCase ? String(r['Case No']) : String(r['Applicant'] || ''),
        }
      })

      const hasDuplicates = importRows.some(r => r.isDuplicate)
      if (hasDuplicates) {
        setPendingImport(importRows)
      } else {
        await doInsert(importRows.map(r => ({ ...r, action: 'add' as const })))
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const doInsert = async (rows: ImportRow[]) => {
    const { data: { user } } = await supabase.auth.getUser()
    const toInsert = rows
      .filter(r => r.action === 'add')
      .map((r, i) => ({
        sr_no: Number(r.data['Sr No']) || i + 1,
        case_no: String(r.data['Case No'] || ''),
        applicant_name: String(r.data['Applicant'] || ''),
        loan_type: String(r.data['Loan Type'] || ''),
        bank_name: String(r.data['Bank'] || ''),
        product: String(r.data['Product'] || ''),
        loan_amount: Number(r.data['Login Amount']) || null,
        sanction_amount: Number(r.data['Sanction Amount']) || null,
        disbursement_amount: Number(r.data['Disbursement Amount']) || null,
        status: String(r.data['Status'] || 'Pending'),
        remarks: String(r.data['Remarks'] || ''),
        month: selectedMonth, year: selectedYear,
        branch_id: profile?.branch_id || null,
        created_by: user?.id, updated_by: user?.id,
      }))
    if (toInsert.length === 0) { toast('No records imported — all skipped.'); return }
    const { error } = await supabase.from('credit_tracker').insert(toInsert)
    if (error) toast.error('Import failed: ' + error.message)
    else toast.success(`Imported ${toInsert.length} records! ${rows.filter(r=>r.action==='skip').length} skipped.`)
    setPendingImport(null)
  }

  const filtered = cases.filter(c => {
    const matchSearch = !search ||
      c.applicant_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.case_no?.toLowerCase().includes(search.toLowerCase()) ||
      c.bank_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor' || profile?.can_edit
  const isAdmin = profile?.role === 'admin'

  const formatAmt = (n: number) => n ? `₹${Number(n).toLocaleString('en-IN')}` : '—'

  return (
    <div className="space-y-5">
      {/* Duplicate Import Modal */}
      {pendingImport && (
        <DuplicateImportModal
          rows={pendingImport}
          tableName="Credit Tracker"
          onConfirm={doInsert}
          onCancel={() => setPendingImport(null)}
        />
      )}
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Credit Tracker</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Manage loan cases • {filtered.length} records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="btn-ghost py-2 px-3" id="refresh-credit"><RefreshCw size={16} /></button>
          <button onClick={handleExport} className="btn-ghost" id="export-credit"><Download size={16} /> Export</button>
          {canEdit && (
            <>
              <label className="btn-ghost cursor-pointer" id="import-credit-label">
                <Upload size={16} /> Import
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={openAdd} className="btn-primary" id="add-case-btn"><Plus size={16} /> Add Case</button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input id="search-credit" type="text" placeholder="Search applicant, case no, bank..." value={search} onChange={e => setSearch(e.target.value)}
            className="input-field" style={{ paddingLeft: '36px' }} />
        </div>
        <select id="filter-month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select id="filter-year" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input-field" style={{ width: 'auto' }}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select id="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || filterStatus) && (
          <button onClick={() => { setSearch(''); setFilterStatus('') }} className="btn-ghost py-2 px-3" id="clear-filters">
            <X size={16} /> Clear
          </button>
        )}
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cases', value: filtered.length },
          { label: 'Login Amt', value: `₹${filtered.reduce((s,c) => s+Number(c.loan_amount||0),0).toLocaleString('en-IN')}` },
          { label: 'Sanction Amt', value: `₹${filtered.reduce((s,c) => s+Number(c.sanction_amount||0),0).toLocaleString('en-IN')}` },
          { label: 'Disbursed Amt', value: `₹${filtered.reduce((s,c) => s+Number(c.disbursement_amount||0),0).toLocaleString('en-IN')}` },
        ].map((s,i) => (
          <div key={i} className="glass-card p-3 text-center rounded-xl">
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            <div className="font-bold text-sm">{s.value}</div>
          </div>
        ))}
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
                  <th>Sr</th><th>Case No</th><th>Applicant</th><th>Loan Type</th>
                  <th>Bank</th><th>Product</th><th>Login Amt</th><th>Sanction Amt</th>
                  <th>Disb Amt</th><th>Status</th><th>Login Date</th><th>Remarks</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={canEdit ? 13 : 12} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    No cases found. {canEdit && 'Click "Add Case" to create one.'}
                  </td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{c.sr_no || '—'}</td>
                    <td className="font-mono text-xs" style={{ color: '#60a5fa' }}>{c.case_no || '—'}</td>
                    <td className="font-medium">{c.applicant_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.loan_type || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.bank_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.product || '—'}</td>
                    <td className="font-medium" style={{ color: '#10b981' }}>{formatAmt(c.loan_amount)}</td>
                    <td className="font-medium" style={{ color: '#a78bfa' }}>{formatAmt(c.sanction_amount)}</td>
                    <td className="font-medium" style={{ color: '#60a5fa' }}>{formatAmt(c.disbursement_amount)}</td>
                    <td><span className={`badge badge-${c.status?.toLowerCase().replace(/\s/g,'')}`}>
                      {c.status?.toLowerCase() === 'pending' ? <span className="badge badge-pending">{c.status}</span> :
                       c.status?.toLowerCase() === 'approved' ? <span className="badge badge-approved">{c.status}</span> :
                       c.status?.toLowerCase() === 'rejected' ? <span className="badge badge-rejected">{c.status}</span> :
                       c.status?.toLowerCase() === 'disbursed' ? <span className="badge badge-disbursed">{c.status}</span> :
                       <span className="badge badge-review">{c.status}</span>}
                    </span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.login_date || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.remarks || '—'}</td>
                    {canEdit && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg transition-all" id={`edit-case-${c.id}`}
                            style={{ background: 'rgba(59,130,246,0.1)', border: 'none', cursor: 'pointer', color: '#60a5fa' }}>
                            <Edit2 size={13} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg transition-all" id={`delete-case-${c.id}`}
                              style={{ background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-content">
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold text-lg">{modal === 'add' ? 'Add New Case' : 'Edit Case'}</h2>
              <button onClick={() => setModal(null)} id="close-modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Sr No</label>
                  <input type="number" className="input-field" value={form.sr_no} onChange={e => setForm({...form, sr_no: e.target.value})} placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Case No</label>
                  <input type="text" className="input-field" value={form.case_no} onChange={e => setForm({...form, case_no: e.target.value})} placeholder="CAS-001" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Applicant Name *</label>
                <input type="text" required className="input-field" value={form.applicant_name} onChange={e => setForm({...form, applicant_name: e.target.value})} placeholder="Full name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Loan Type</label>
                  <select className="input-field" value={form.loan_type} onChange={e => setForm({...form, loan_type: e.target.value})}>
                    <option value="">Select...</option>
                    {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Status</label>
                  <select className="input-field" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bank Name</label>
                  <input type="text" className="input-field" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} placeholder="SBI, HDFC..." />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Product</label>
                  <input type="text" className="input-field" value={form.product} onChange={e => setForm({...form, product: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Login Amt (₹)</label>
                  <input type="number" className="input-field" value={form.loan_amount} onChange={e => setForm({...form, loan_amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Sanction Amt (₹)</label>
                  <input type="number" className="input-field" value={form.sanction_amount} onChange={e => setForm({...form, sanction_amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Disbursement Amt (₹)</label>
                  <input type="number" className="input-field" value={form.disbursement_amount} onChange={e => setForm({...form, disbursement_amount: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Login Date</label>
                  <input type="date" className="input-field" value={form.login_date} onChange={e => setForm({...form, login_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Sanction Date</label>
                  <input type="date" className="input-field" value={form.sanction_date} onChange={e => setForm({...form, sanction_date: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Disbursement Date</label>
                  <input type="date" className="input-field" value={form.disbursement_date} onChange={e => setForm({...form, disbursement_date: e.target.value})} />
                </div>
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Branch</label>
                  <select className="input-field" value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})}>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Remarks</label>
                <textarea className="input-field" rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1" id="cancel-form">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center" id="submit-form">
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : modal === 'add' ? 'Add Case' : 'Update Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
