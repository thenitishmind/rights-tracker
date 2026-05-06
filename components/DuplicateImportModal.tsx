'use client'
import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, X, SkipForward, Play, ChevronRight } from 'lucide-react'

export interface ImportRow {
  index: number
  data: Record<string, unknown>
  isDuplicate: boolean
  duplicateField?: string
  duplicateValue?: string
  action?: 'skip' | 'add' // user decision
}

interface DuplicateImportModalProps {
  rows: ImportRow[]
  tableName: string
  onConfirm: (rows: ImportRow[]) => void
  onCancel: () => void
}

export default function DuplicateImportModal({
  rows, tableName, onConfirm, onCancel
}: DuplicateImportModalProps) {
  const duplicates = rows.filter(r => r.isDuplicate)
  const clean = rows.filter(r => !r.isDuplicate)

  // Track user decisions for each duplicate
  const [decisions, setDecisions] = React.useState<Record<number, 'skip' | 'add'>>(() => {
    const d: Record<number, 'skip' | 'add'> = {}
    duplicates.forEach(r => { d[r.index] = 'skip' }) // default: skip duplicates
    return d
  })

  const handleDecision = (index: number, action: 'skip' | 'add') => {
    setDecisions(prev => ({ ...prev, [index]: action }))
  }

  const handleSkipAll = () => {
    const d: Record<number, 'skip' | 'add'> = {}
    duplicates.forEach(r => { d[r.index] = 'skip' })
    setDecisions(d)
  }
  const handleAddAll = () => {
    const d: Record<number, 'skip' | 'add'> = {}
    duplicates.forEach(r => { d[r.index] = 'add' })
    setDecisions(d)
  }

  const handleConfirm = () => {
    const finalRows = rows.map(r => ({
      ...r,
      action: r.isDuplicate ? decisions[r.index] : 'add' as 'skip' | 'add'
    }))
    onConfirm(finalRows)
  }

  const skipCount = Object.values(decisions).filter(d => d === 'skip').length
  const addCount = Object.values(decisions).filter(d => d === 'add').length

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="font-bold text-lg">Duplicate Cases Detected</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {duplicates.length} duplicate{duplicates.length > 1 ? 's' : ''} found in import
              </p>
            </div>
          </div>
          <button onClick={onCancel} id="close-duplicate-modal"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="text-xl font-bold" style={{ color: '#60a5fa' }}>{rows.length}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Rows</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="text-xl font-bold" style={{ color: '#10b981' }}>{clean.length}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>New (to add)</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="text-xl font-bold" style={{ color: '#f59e0b' }}>{duplicates.length}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Duplicates</div>
          </div>
        </div>

        {/* Clean records notice */}
        {clean.length > 0 && (
          <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl flex items-center gap-2"
            style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <CheckCircle size={14} style={{ color: '#10b981' }} />
            <span className="text-xs" style={{ color: '#10b981' }}>
              <strong>{clean.length} new records</strong> will be added automatically
            </span>
          </div>
        )}

        {/* Duplicate rows */}
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Duplicate Records — Choose action for each:
            </p>
            <div className="flex gap-2">
              <button onClick={handleSkipAll} className="btn-ghost py-1.5 px-3 text-xs" id="skip-all-duplicates">
                <SkipForward size={12} /> Skip All
              </button>
              <button onClick={handleAddAll} className="btn-primary py-1.5 px-3 text-xs" id="add-all-duplicates">
                <Play size={12} /> Add All
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {duplicates.map(row => {
              const decision = decisions[row.index]
              const name = String(row.data['Applicant'] || row.data['applicant_name'] || `Row ${row.index + 1}`)
              const caseNo = String(row.data['Case No'] || row.data['case_no'] || '—')
              return (
                <div key={row.index} className="rounded-xl p-3 flex items-center gap-3"
                  style={{
                    background: decision === 'skip' ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                    border: `1px solid ${decision === 'skip' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    transition: 'all 0.2s ease'
                  }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium truncate">{name}</span>
                      {caseNo !== '—' && (
                        <span className="text-xs font-mono" style={{ color: '#60a5fa' }}>{caseNo}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <AlertTriangle size={10} style={{ color: '#f59e0b' }} />
                      <span>Duplicate: <strong style={{ color: '#f59e0b' }}>{row.duplicateField}</strong> already exists</span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleDecision(row.index, 'skip')}
                      id={`skip-row-${row.index}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: decision === 'skip' ? '#ef4444' : 'transparent',
                        color: decision === 'skip' ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${decision === 'skip' ? '#ef4444' : 'var(--border)'}`,
                        cursor: 'pointer'
                      }}>
                      Reject
                    </button>
                    <button
                      onClick={() => handleDecision(row.index, 'add')}
                      id={`add-row-${row.index}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: decision === 'add' ? '#10b981' : 'transparent',
                        color: decision === 'add' ? 'white' : 'var(--text-muted)',
                        border: `1px solid ${decision === 'add' ? '#10b981' : 'var(--border)'}`,
                        cursor: 'pointer'
                      }}>
                      Continue
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer summary + confirm */}
        <div className="p-6 pt-0">
          <div className="rounded-xl p-3 mb-4 flex items-center justify-between text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-4">
              <span style={{ color: 'var(--text-muted)' }}>Will add:</span>
              <strong style={{ color: '#10b981' }}>{clean.length + addCount} records</strong>
              <span style={{ color: 'var(--text-muted)' }}>Will skip:</span>
              <strong style={{ color: '#ef4444' }}>{skipCount} duplicates</strong>
            </div>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="flex gap-3">
            <button onClick={onCancel} className="btn-ghost flex-1" id="cancel-import">Cancel Import</button>
            <button onClick={handleConfirm} className="btn-primary flex-1 justify-center" id="confirm-import">
              <Play size={16} /> Proceed with Import
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// React imported at top
