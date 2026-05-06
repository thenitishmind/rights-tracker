'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Plus, Edit2, Trash2, X, Shield, Eye, EyeOff,
  RefreshCw, Search, CheckCircle, XCircle, ToggleLeft, ToggleRight, Building2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Branch { id: string; name: string; code: string; cluster_name?: string }
interface UserProfile {
  id: string; email: string; full_name: string; role: string
  branch_id: string | null; can_view: boolean; can_edit: boolean
  is_active: boolean; created_at: string
  branch?: { name: string; code: string; cluster_name?: string } | null
}

const ROLES = ['admin', 'editor', 'viewer']
const CLUSTERS = ['Delhi Cluster','Faridabad Cluster','Gurgaon Cluster','Ghaziabad Cluster','Karnataka Cluster','Maharashtra Cluster']
const emptyForm = { email:'', password:'', full_name:'', role:'viewer', branch_id:'', can_view:true, can_edit:false, is_active:true }

// Permission definitions for preview
const ROLE_PERMISSIONS = {
  admin: {
    label: 'Administrator',
    color: '#dc2626', bg: '#fee2e2',
    perms: ['View all dashboards','Edit all data','Delete records','Manage users','Manage branches','View MIS Reports','No branch restriction']
  },
  editor: {
    label: 'Editor',
    color: '#d97706', bg: '#fef3c7',
    perms: ['View dashboard','Add & edit cases','Upload data','View MIS Reports','Branch restricted if assigned']
  },
  viewer: {
    label: 'Viewer (Read Only)',
    color: '#2563eb', bg: '#dbeafe',
    perms: ['View dashboard','View cases (read only)','View MIS Reports','Cannot edit or delete','Branch restricted if assigned']
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editUser, setEditUser] = useState<UserProfile | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const verifyAdminAndFetch = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get own profile (user can always read their own)
      const { data: myProf } = await supabase
        .from('user_profiles').select('role').eq('id', user.id).single()

      if (!myProf || myProf.role !== 'admin') {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      // Fetch all users via API route (service role — bypasses RLS)
      const [usersRes, branchesRes] = await Promise.all([
        fetch('/api/admin/users'),
        supabase.from('branches').select('id, name, code, cluster_name').order('cluster_name').order('name')
      ])

      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || [])
      }
      setBranches(branchesRes.data || [])
    } catch (err) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => { verifyAdminAndFetch() }, [verifyAdminAndFetch])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success(`User "${form.full_name}" created!`)
      setModal(null)
      setForm(emptyForm)
      verifyAdminAndFetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user')
    } finally { setSubmitting(false) }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editUser.id, ...form })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success('User updated!')
      setModal(null)
      verifyAdminAndFetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally { setSubmitting(false) }
  }

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      toast.success('User deleted')
      verifyAdminAndFetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleToggleActive = async (u: UserProfile) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, full_name: u.full_name, role: u.role, branch_id: u.branch_id, can_view: u.can_view, can_edit: u.can_edit, is_active: !u.is_active })
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(u.is_active ? `${u.full_name} deactivated` : `${u.full_name} activated`)
      verifyAdminAndFetch()
    } catch { toast.error('Failed to update status') }
  }

  const openEdit = (u: UserProfile) => {
    setForm({ email: u.email, password: '', full_name: u.full_name || '', role: u.role, branch_id: u.branch_id || '', can_view: u.can_view, can_edit: u.can_edit, is_active: u.is_active })
    setEditUser(u)
    setModal('edit')
  }

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  )

  const roleInfo = ROLE_PERMISSIONS[form.role as keyof typeof ROLE_PERMISSIONS]

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: '#64748b' }}>Loading users...</p>
      </div>
    </div>
  )

  if (accessDenied) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center p-8 card max-w-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#fee2e2' }}>
          <Shield size={32} style={{ color: '#dc2626' }} />
        </div>
        <h2 className="font-bold text-lg mb-2">Admin Access Required</h2>
        <p className="text-sm" style={{ color: '#64748b' }}>Only administrators can access this page.</p>
        <button onClick={() => router.push('/')} className="btn-primary mt-4">Go to Dashboard</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', borderRadius: '14px', padding: '20px 24px' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Users size={20} /> User Management
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {users.length} users • {users.filter(u => u.is_active).length} active • {users.filter(u => u.role === 'admin').length} admins
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={verifyAdminAndFetch} className="btn-icon" id="refresh-users"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={() => { setForm(emptyForm); setEditUser(null); setModal('add') }} id="add-user-btn"
              style={{ background: 'white', color: '#1d4ed8', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} /> Create User
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: '12px' }}>
        {[
          { label: 'Total Users', count: users.length, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Active', count: users.filter(u=>u.is_active).length, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Inactive', count: users.filter(u=>!u.is_active).length, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Admins', count: users.filter(u=>u.role==='admin').length, color: '#7c3aed', bg: '#faf5ff' },
          { label: 'Editors', count: users.filter(u=>u.role==='editor').length, color: '#d97706', bg: '#fffbeb' },
          { label: 'Viewers', count: users.filter(u=>u.role==='viewer').length, color: '#0891b2', bg: '#f0fdfa' },
        ].map((s,i) => (
          <div key={i} className="card p-4 text-center" style={{ borderTop: `3px solid ${s.color}` }}>
            <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-xs font-medium mt-0.5" style={{ color: '#64748b' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input id="search-users" type="text" placeholder="Search by name, email or role..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field" style={{ paddingLeft: '36px' }} />
        </div>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-10 text-center" style={{ color: '#94a3b8' }}>No users found</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Branch</th><th>Can View</th><th>Can Edit</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                          style={{ background: u.role === 'admin' ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : u.role === 'editor' ? 'linear-gradient(135deg,#d97706,#b45309)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)' }}>
                          {u.full_name?.charAt(0)?.toUpperCase() || u.email?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: '#0f172a' }}>{u.full_name || '—'}</div>
                          <div className="text-xs" style={{ color: '#64748b' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: u.role==='admin'?'#fee2e2':u.role==='editor'?'#fef3c7':'#eff6ff',
                        color: u.role==='admin'?'#b91c1c':u.role==='editor'?'#92400e':'#1d4ed8'
                      }}>{u.role}</span>
                    </td>
                    <td className="text-xs" style={{ color: '#64748b' }}>
                      {u.branch ? (
                        <div>
                          <div className="font-medium" style={{ color: '#374151' }}>{(u.branch as { name: string }).name}</div>
                          <div>{(u.branch as { cluster_name?: string }).cluster_name}</div>
                        </div>
                      ) : <span style={{ color: '#94a3b8' }}>All Branches</span>}
                    </td>
                    <td>{u.can_view ? <CheckCircle size={16} style={{ color: '#16a34a' }} /> : <XCircle size={16} style={{ color: '#dc2626' }} />}</td>
                    <td>{u.can_edit ? <CheckCircle size={16} style={{ color: '#16a34a' }} /> : <XCircle size={16} style={{ color: '#dc2626' }} />}</td>
                    <td>
                      <button onClick={() => handleToggleActive(u)} id={`toggle-user-${u.id}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ background: u.is_active?'#dcfce7':'#fee2e2', color: u.is_active?'#15803d':'#b91c1c', border:'none', cursor:'pointer', whiteSpace:'nowrap' }}>
                        {u.is_active ? <ToggleRight size={13}/> : <ToggleLeft size={13}/>}
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="text-xs" style={{ color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} id={`edit-user-${u.id}`} className="btn-icon" style={{ padding: '5px' }}>
                          <Edit2 size={12} style={{ color: '#2563eb' }} />
                        </button>
                        <button onClick={() => handleDeleteUser(u.id, u.full_name || u.email)} id={`delete-user-${u.id}`} className="btn-icon" style={{ padding: '5px' }}>
                          <Trash2 size={12} style={{ color: '#dc2626' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            {/* Modal Header */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', borderRadius: '16px 16px 0 0' }}>
              <div className="flex items-center gap-2 text-white">
                <Shield size={18} />
                <h2 className="font-bold text-base">{modal === 'add' ? 'Create New User' : `Edit — ${editUser?.full_name}`}</h2>
              </div>
              <button onClick={() => setModal(null)} id="close-user-modal"
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'white' }}>
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <form id="user-form" onSubmit={modal === 'add' ? handleCreateUser : handleUpdateUser}>
                {/* Name */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Full Name *</label>
                  <input type="text" required className="input-field" value={form.full_name}
                    onChange={e => setForm({...form, full_name: e.target.value})} placeholder="e.g. Rahul Sharma" />
                </div>

                {modal === 'add' && (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Email *</label>
                      <input type="email" required className="input-field" value={form.email}
                        onChange={e => setForm({...form, email: e.target.value})} placeholder="user@company.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Password *</label>
                      <div className="relative">
                        <input type={showPwd?'text':'password'} required className="input-field" value={form.password}
                          onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 6 chars" style={{ paddingRight: '40px' }} />
                        <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                          {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Role + Branch */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Role *</label>
                    <select className="input-field" value={form.role} onChange={e => {
                      const r = e.target.value
                      setForm({...form, role: r, can_view: true, can_edit: r === 'admin' || r === 'editor'})
                    }}>
                      {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Branch Access</label>
                    <select className="input-field" value={form.branch_id} onChange={e => setForm({...form, branch_id: e.target.value})}>
                      <option value="">🌐 All Branches</option>
                      {CLUSTERS.map(cluster => {
                        const cb = branches.filter(b => b.cluster_name === cluster)
                        if (cb.length === 0) return null
                        return <optgroup key={cluster} label={`── ${cluster}`}>{cb.map(b => <option key={b.id} value={b.id}>{b.name} [{b.code}]</option>)}</optgroup>
                      })}
                    </select>
                  </div>
                </div>

                {/* Permissions */}
                <div className="p-3 rounded-xl mb-4 space-y-2" style={{ background: '#f8faff', border: '1px solid #dbeafe' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>Override Permissions</p>
                  {[
                    { key: 'can_view', label: 'Can View', desc: 'Access dashboard & see data', color: '#2563eb' },
                    { key: 'can_edit', label: 'Can Edit', desc: 'Add, edit & upload data', color: '#16a34a' },
                    { key: 'is_active', label: 'Account Active', desc: 'User can log in', color: '#7c3aed' },
                  ].map(p => (
                    <label key={p.key} className="flex items-center gap-3 cursor-pointer">
                      <button type="button" onClick={() => setForm({...form, [p.key]: !form[p.key as keyof typeof form]})}
                        className="flex-shrink-0 w-10 h-5 rounded-full relative transition-colors"
                        style={{ background: form[p.key as keyof typeof form] ? p.color : '#e2e8f0', border: 'none', cursor: 'pointer' }}>
                        <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all"
                          style={{ left: form[p.key as keyof typeof form] ? '22px' : '2px' }} />
                      </button>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: '#0f172a' }}>{p.label}</div>
                        <div className="text-xs" style={{ color: '#94a3b8' }}>{p.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Role permission preview */}
                {roleInfo && (
                  <div className="p-3 rounded-xl mb-4" style={{ background: roleInfo.bg, border: `1px solid ${roleInfo.color}22` }}>
                    <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: roleInfo.color }}>
                      <Shield size={11} /> {roleInfo.label} — What this user can do:
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {roleInfo.perms.map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: '#374151' }}>
                          <span style={{ color: roleInfo.color, fontWeight: 'bold' }}>✓</span> {p}
                        </div>
                      ))}
                    </div>
                    {!form.can_view && (
                      <div className="mt-2 text-xs font-semibold" style={{ color: '#dc2626' }}>
                        ⚠ Can View is OFF — user will see &quot;No Access&quot; page
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1" id="cancel-user">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center" id="submit-user">
                    {submitting
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : modal === 'add' ? '✓ Create User' : '✓ Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
