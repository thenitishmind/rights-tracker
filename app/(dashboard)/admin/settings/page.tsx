'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Plus, Edit2, Trash2, X, Building2, RefreshCw, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Search, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Branch {
  id: string; name: string; code: string; cluster_name: string
  is_active: boolean; created_at: string
}

const CLUSTERS = [
  'Delhi Cluster',
  'Faridabad Cluster',
  'Gurgaon Cluster',
  'Ghaziabad Cluster',
  'Karnataka Cluster',
  'Maharashtra Cluster',
]

const CLUSTER_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Delhi Cluster':       { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'Faridabad Cluster':  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  'Gurgaon Cluster':    { bg: '#fdf4ff', color: '#7c3aed', border: '#e9d5ff' },
  'Ghaziabad Cluster':  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  'Karnataka Cluster':  { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  'Maharashtra Cluster':{ bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' },
}

export default function AdminSettingsPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [form, setForm] = useState({ name: '', code: '', cluster_name: 'Delhi Cluster', is_active: true })
  const [submitting, setSubmitting] = useState(false)
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set(CLUSTERS))
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
    if (prof?.role !== 'admin') { router.push('/'); return }
    const { data } = await supabase.from('branches').select('*').order('cluster_name').order('name')
    setBranches(data || [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (modal === 'add') {
        const { error } = await supabase.from('branches').insert({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          cluster_name: form.cluster_name,
          is_active: form.is_active,
        })
        if (error) throw error
        toast.success(`Branch "${form.name}" added!`)
      } else if (editBranch) {
        const { error } = await supabase.from('branches').update({
          name: form.name.trim(),
          code: form.code.trim().toUpperCase(),
          cluster_name: form.cluster_name,
          is_active: form.is_active,
        }).eq('id', editBranch.id)
        if (error) throw error
        toast.success('Branch updated!')
      }
      setModal(null)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSubmitting(false) }
  }

  const handleToggleActive = async (branch: Branch) => {
    const { error } = await supabase.from('branches')
      .update({ is_active: !branch.is_active }).eq('id', branch.id)
    if (error) toast.error('Update failed')
    else {
      toast.success(branch.is_active ? `${branch.name} deactivated` : `${branch.name} activated`)
      fetchData()
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) toast.error('Cannot delete — branch may have linked data')
    else { toast.success('Branch deleted'); fetchData() }
  }

  const toggleCluster = (cluster: string) => {
    const s = new Set(expandedClusters)
    s.has(cluster) ? s.delete(cluster) : s.add(cluster)
    setExpandedClusters(s)
  }

  const filtered = search
    ? branches.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase()) ||
        b.cluster_name?.toLowerCase().includes(search.toLowerCase())
      )
    : branches

  const grouped = CLUSTERS.map(c => ({
    cluster: c,
    branches: filtered.filter(b => b.cluster_name === c),
    total: branches.filter(b => b.cluster_name === c).length,
    active: branches.filter(b => b.cluster_name === c && b.is_active).length,
    colors: CLUSTER_COLORS[c] || { bg: '#f8faff', color: '#374151', border: '#e2e8f0' },
  }))

  return (
    <div className="space-y-5">
      {/* Blue header */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', borderRadius: '14px', padding: '20px 24px' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Branch &amp; Cluster Settings</h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {branches.length} branches • {branches.filter(b => b.is_active).length} active • {CLUSTERS.length} clusters
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={fetchData} className="btn-icon" id="refresh-settings"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white' }}>
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => { setForm({ name: '', code: '', cluster_name: 'Delhi Cluster', is_active: true }); setEditBranch(null); setModal('add') }}
              id="add-branch-btn"
              style={{ background: 'white', color: '#1d4ed8', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={15} /> Add Branch
            </button>
          </div>
        </div>
      </div>

      {/* Cluster summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
        {grouped.map(g => (
          <div key={g.cluster} className="card p-4 cursor-pointer" onClick={() => toggleCluster(g.cluster)}
            style={{ borderTop: `3px solid ${g.colors.color}`, borderRadius: '12px' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                style={{ background: g.colors.color }}>
                {g.cluster.charAt(0)}
              </div>
              <span className="text-xs font-bold" style={{ color: g.colors.color }}>
                {g.cluster.replace(' Cluster', '')}
              </span>
            </div>
            <div className="text-xl font-extrabold" style={{ color: '#0f172a' }}>{g.total}</div>
            <div className="text-xs" style={{ color: '#64748b' }}>{g.active} active</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="filter-bar">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }} />
          <input type="text" placeholder="Search branches by name, code or cluster..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input-field" style={{ paddingLeft: '36px' }} id="branch-search" />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExpandedClusters(new Set(CLUSTERS))} className="btn-ghost text-xs py-2">Expand All</button>
          <button onClick={() => setExpandedClusters(new Set())} className="btn-ghost text-xs py-2">Collapse All</button>
        </div>
      </div>

      {/* Branches grouped by cluster */}
      {loading ? (
        <div className="card p-10 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm" style={{ color: '#94a3b8' }}>Loading branches...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(g => (
            <div key={g.cluster} className="card overflow-hidden">
              {/* Cluster header */}
              <button onClick={() => toggleCluster(g.cluster)}
                id={`cluster-${g.cluster.replace(/\s+/g,'-').toLowerCase()}`}
                className="w-full flex items-center justify-between px-5 py-3"
                style={{
                  background: g.colors.bg, border: 'none', cursor: 'pointer',
                  borderBottom: expandedClusters.has(g.cluster) ? `1px solid ${g.colors.border}` : 'none'
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                    style={{ background: g.colors.color }}>
                    {g.cluster.charAt(0)}
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm" style={{ color: '#0f172a' }}>{g.cluster}</div>
                    <div className="text-xs" style={{ color: '#64748b' }}>
                      {g.total} branches • {g.active} active
                      {g.branches.length !== g.total && ` • ${g.branches.length} shown`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge" style={{ background: g.colors.border, color: g.colors.color, fontSize: '11px' }}>
                    {g.total}
                  </span>
                  {expandedClusters.has(g.cluster)
                    ? <ChevronDown size={15} style={{ color: '#94a3b8' }} />
                    : <ChevronRight size={15} style={{ color: '#94a3b8' }} />}
                </div>
              </button>

              {expandedClusters.has(g.cluster) && g.branches.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Branch Name</th>
                        <th>Code</th>
                        <th>Cluster</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.branches.map(b => (
                        <tr key={b.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <MapPin size={12} style={{ color: g.colors.color, flexShrink: 0 }} />
                              <span className="font-medium" style={{ color: '#0f172a' }}>{b.name}</span>
                            </div>
                          </td>
                          <td>
                            <span className="badge" style={{ background: g.colors.bg, color: g.colors.color, border: `1px solid ${g.colors.border}` }}>
                              {b.code}
                            </span>
                          </td>
                          <td className="text-xs" style={{ color: '#64748b' }}>{b.cluster_name}</td>
                          <td>
                            <button
                              onClick={() => handleToggleActive(b)}
                              id={`toggle-branch-${b.code}`}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                              style={{
                                background: b.is_active ? '#dcfce7' : '#fee2e2',
                                color: b.is_active ? '#15803d' : '#b91c1c',
                                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap'
                              }}>
                              {b.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                              {b.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setForm({ name: b.name, code: b.code, cluster_name: b.cluster_name, is_active: b.is_active }); setEditBranch(b); setModal('edit') }}
                                className="btn-icon" id={`edit-branch-${b.code}`} style={{ padding: '5px' }}>
                                <Edit2 size={12} style={{ color: '#2563eb' }} />
                              </button>
                              <button
                                onClick={() => handleDelete(b.id, b.name)}
                                className="btn-icon" id={`delete-branch-${b.code}`} style={{ padding: '5px' }}>
                                <Trash2 size={12} style={{ color: '#dc2626' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {expandedClusters.has(g.cluster) && g.branches.length === 0 && (
                <div className="px-5 py-4 text-sm" style={{ color: '#94a3b8' }}>
                  No branches match the search in this cluster.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            {/* Modal Header */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #f1f5f9', background: '#eff6ff', borderRadius: '16px 16px 0 0' }}>
              <div className="flex items-center gap-2">
                <Building2 size={16} style={{ color: '#2563eb' }} />
                <h2 className="font-bold" style={{ color: '#0f172a' }}>
                  {modal === 'add' ? 'Add New Branch' : `Edit — ${editBranch?.name}`}
                </h2>
              </div>
              <button onClick={() => setModal(null)} id="close-branch-modal"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Branch Name *
                </label>
                <input type="text" required className="input-field" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Delhi-Pitampura" id="branch-name-input" />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Branch Code *
                </label>
                <input type="text" required className="input-field" value={form.code}
                  onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. NDL" maxLength={5} id="branch-code-input" />
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>2–5 characters, uppercase</p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>
                  Cluster *
                </label>
                <select className="input-field" value={form.cluster_name}
                  onChange={e => setForm({ ...form, cluster_name: e.target.value })}
                  id="branch-cluster-select">
                  {CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: '#374151' }}>Status</label>
                <button type="button" onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  id="branch-status-toggle"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                  style={{
                    background: form.is_active ? '#dcfce7' : '#fee2e2',
                    color: form.is_active ? '#15803d' : '#b91c1c',
                    border: `1px solid ${form.is_active ? '#bbf7d0' : '#fecaca'}`,
                    cursor: 'pointer'
                  }}>
                  {form.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {form.is_active ? 'Active — Branch is operational' : 'Inactive — Branch is disabled'}
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-ghost flex-1" id="cancel-branch-form">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center" id="save-branch-btn">
                  {submitting
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : modal === 'add' ? 'Add Branch' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
