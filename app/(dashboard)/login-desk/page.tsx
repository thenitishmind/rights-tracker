'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Search, Edit2, Trash2, Upload, X, Download, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface LoginEntry {
  id: string; sr_no: number; date: string; applicant_name: string;
  loan_type: string; bank_name: string; product: string; loan_amount: number;
  co_applicant: string; mobile: string; file_status: string; assigned_to: string;
  remarks: string; month: string; year: number; branch_id: string;
  branch?: { name: string }
}
interface UserProfile { role: string; can_edit: boolean; branch_id: string | null }
interface Branch { id: string; name: string; code: string }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const FILE_STATUSES = ['Received','Submitted','Pending','Rejected','Approved']
const LOAN_TYPES = ['Home Loan','Personal Loan','Business Loan','Car Loan','Loan Against Property','Education Loan','Gold Loan','Other']
const CURRENT_MONTH = MONTHS[new Date().getMonth()]
const CURRENT_YEAR = new Date().getFullYear()

const emptyForm = {
  sr_no: '', date: new Date().toISOString().split('T')[0], applicant_name: '',
  loan_type: '', bank_name: '', product: '', loan_amount: '', co_applicant: '',
  mobile: '', file_status: 'Received', assigned_to: '', remarks: '', branch_id: ''
}

export default function LoginDeskPage() {
  const [entries, setEntries] = useState<LoginEntry[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editEntry, setEditEntry] = useState<LoginEntry | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH)
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('user_profiles').select('role, can_edit, branch_id').eq('id', user.id).single()
      setProfile(prof)
      const { data: b } = await supabase.from('branches').select('*').order('name')
      setBranches(b || [])
      const { data } = await supabase.from('login_desk')
        .select('*, branch:branches(name)')
        .eq('month', selectedMonth).eq('year', selectedYear)
        .order('sr_no')
      setEntries(data as LoginEntry[] || [])
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }, [supabase, selectedMonth, selectedYear])

  useEffect(() => {
    fetchData()
    const channel = supabase.channel('login-desk-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'login_desk' }, () => fetchData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchData, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const payload = {
        ...form, loan_amount: Number(form.loan_amount) || null,
        sr_no: Number(form.sr_no) || null,
        month: selectedMonth, year: selectedYear,
        date: form.date || null, updated_by: user?.id,
      }
      if (modal === 'add') {
        const { error } = await supabase.from('login_desk').insert({ ...payload, created_by: user?.id })
        if (error) throw error
        toast.success('Entry added!')
      } else if (editEntry) {
        const { error } = await supabase.from('login_desk').update(payload).eq('id', editEntry.id)
        if (error) throw error
        toast.success('Entry updated!')
      }
      setModal(null)
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    const { error } = await supabase.from('login_desk').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else toast.success('Deleted')
  }

  const handleExport = () => {
    const exportData = filtered.map(e => ({
      'Sr No': e.sr_no, 'Date': e.date, 'Applicant': e.applicant_name,
      'Co-Applicant': e.co_applicant, 'Mobile': e.mobile,
      'Loan Type': e.loan_type, 'Bank': e.bank_name, 'Product': e.product,
      'Loan Amount': e.loan_amount, 'File Status': e.file_status,
      'Assigned To': e.assigned_to, 'Remarks': e.remarks,
    }))
    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Login Desk')
    XLSX.writeFile(wb, `Login_Desk_${selectedMonth}_${selectedYear}.xlsx`)
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
      const { data: { user } } = await supabase.auth.getUser()
      const toInsert = rows.map((r, i) => ({
        sr_no: Number(r['Sr No']) || i + 1,
        date: String(r['Date'] || ''),
        applicant_name: String(r['Applicant'] || ''),
        co_applicant: String(r['Co-Applicant'] || ''),
        mobile: String(r['Mobile'] || ''),
        loan_type: String(r['Loan Type'] || ''),
        bank_name: String(r['Bank'] || ''),
        product: String(r['Product'] || ''),
        loan_amount: Number(r['Loan Amount']) || null,
        file_status: String(r['File Status'] || 'Received'),
        assigned_to: String(r['Assigned To'] || ''),
        remarks: String(r['Remarks'] || ''),
        month: selectedMonth, year: selectedYear,
        branch_id: profile?.branch_id || null,
        created_by: user?.id, updated_by: user?.id,
      }))
      const { error } = await supabase.from('login_desk').insert(toInsert)
      if (error) toast.error('Import failed: ' + error.message)
      else toast.success(`Imported ${toInsert.length} records!`)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const openEdit = (entry: LoginEntry) => {
    setForm({
      sr_no: String(entry.sr_no || ''), date: entry.date || '',
      applicant_name: entry.applicant_name || '', loan_type: entry.loan_type || '',
      bank_name: entry.bank_name || '', product: entry.product || '',
      loan_amount: String(entry.loan_amount || ''), co_applicant: entry.co_applicant || '',
      mobile: entry.mobile || '', file_status: entry.file_status || 'Received',
      assigned_to: entry.assigned_to || '', remarks: entry.remarks || '',
      branch_id: entry.branch_id || ''
    })
    setEditEntry(entry)
    setModal('edit')
  }

  const filtered = entries.filter(e => {
    const matchSearch = !search ||
      e.applicant_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.mobile?.includes(search) || e.bank_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || e.file_status === filterStatus
    return matchSearch && matchStatus
  })

  const canEdit = profile?.role === 'admin' || profile?.role === 'editor' || profile?.can_edit
  const isAdmin = profile?.role === 'admin'

  const getStatusBadgeClass = (s: string) => {
    const map: Record<string, string> = { Received: 'badge-review', Submitted: 'badge-disbursed', Pending: 'badge-pending', Rejected: 'badge-rejected', Approved: 'badge-approved' }
    return map[s] || 'badge-pending'
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Login Desk</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>File management • {filtered.length} entries</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchData} className="btn-ghost py-2 px-3" id="refresh-login"><RefreshCw size={16} /></button>
          <button onClick={handleExport} className="btn-ghost" id="export-login"><Download size={16} /> Export</button>
          {canEdit && (
            <>
              <label className="btn-ghost cursor-pointer" id="import-login-label">
                <Upload size={16} /> Import
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={() => { setForm({ ...emptyForm, branch_id: profile?.branch_id || '' }); setEditEntry(null); setModal('add') }}
                className="btn-primary" id="add-entry-btn"><Plus size={16} /> Add Entry</button>
            </>
          )}
        </div>
      </div>

      <div className="glass-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input id="search-login" type="text" placeholder="Search applicant, mobile, bank..." value={search}
            onChange={e => setSearch(e.target.value)} className="input-field" style={{ paddingLeft: '36px' }} />
        </div>
        <select id="month-select-login" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select id="year-select-login" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input-field" style={{ width: 'auto' }}>
          {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select id="status-filter-login" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field" style={{ width: 'auto' }}>
          <option value="">All Status</option>
          {FILE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Loading entries...
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sr</th><th>Date</th><th>Applicant</th><th>Co-Applicant</th>
                  <th>Mobile</th><th>Loan Type</th><th>Bank</th><th>Amount</th>
                  <th>Status</th><th>Assigned To</th><th>Remarks</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={canEdit ? 12 : 11} className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                    No entries found for {selectedMonth} {selectedYear}
                  </td></tr>
                ) : filtered.map(entry => (
                  <tr key={entry.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{entry.sr_no || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{entry.date || '—'}</td>
                    <td className="font-medium">{entry.applicant_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{entry.co_applicant || '—'}</td>
                    <td style={{ color: '#60a5fa', fontSize: '12px' }}>{entry.mobile || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{entry.loan_type || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{entry.bank_name || '—'}</td>
                    <td className="font-medium" style={{ color: '#10b981' }}>
                      {entry.loan_amount ? `₹${Number(entry.loan_amount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td><span className={`badge ${getStatusBadgeClass(entry.file_status)}`}>{entry.file_status}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{entry.assigned_to || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.remarks || '—'}</td>
                    {canEdit && (
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(entry)} className="p-1.5 rounded-lg" id={`edit-entry-${entry.id}`}
                            style={{ background: 'rgba(59,130,246,0.1)', border: 'none', cursor: 'pointer', color: '#60a5fa' }}>
                            <Edit2 size={13} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg" id={`delete-entry-${entry.id}`}
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

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-content">
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold text-lg">{modal === 'add' ? 'Add Login Entry' : 'Edit Entry'}</h2>
              <button onClick={() => setModal(null)} id="close-login-modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Sr No</label>
                  <input type="number" className="input-field" value={form.sr_no} onChange={e => setForm({...form, sr_no: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date</label>
                  <input type="date" className="input-field" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Applicant Name *</label>
                  <input type="text" required className="input-field" value={form.applicant_name} onChange={e => setForm({...form, applicant_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Co-Applicant</label>
                  <input type="text" className="input-field" value={form.co_applicant} onChange={e => setForm({...form, co_applicant: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Mobile</label>
                  <input type="tel" className="input-field" value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>File Status</label>
                  <select className="input-field" value={form.file_status} onChange={e => setForm({...form, file_status: e.target.value})}>
                    {FILE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
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
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Bank</label>
                  <input type="text" className="input-field" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Loan Amount (₹)</label>
                  <input type="number" className="input-field" value={form.loan_amount} onChange={e => setForm({...form, loan_amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Assigned To</label>
                  <input type="text" className="input-field" value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} />
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
                <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1" id="cancel-login-form">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center" id="submit-login-form">
                  {submitting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : modal === 'add' ? 'Add Entry' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
