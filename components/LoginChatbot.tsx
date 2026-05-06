'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, ChevronRight, RotateCcw } from 'lucide-react'

/* ─── Types ─────────────────────────────────────── */
interface Message {
  id: number
  from: 'bot' | 'user'
  text: string
  options?: Option[]
}

interface Option {
  label: string
  value: string
}

/* ─── Knowledge base ─────────────────────────────── */
const FAQ: Record<string, { answer: string; options?: Option[] }> = {
  start: {
    answer: "👋 Hi! I'm the **Rights Tracker Assistant**. How can I help you today?",
    options: [
      { label: '🔐 How to login?',         value: 'login_help' },
      { label: '📊 What is MIS Tracker?',   value: 'mis_info' },
      { label: '⚙️ How does the system work?', value: 'system_info' },
      { label: '📋 What reports are available?', value: 'reports_info' },
      { label: '👤 Contact Administrator',  value: 'contact_admin' },
    ],
  },
  login_help: {
    answer:
      '🔐 **Login Help**\n\nTo sign in:\n1. Enter your registered **email address**\n2. Enter your **password**\n3. Click **Sign In**\n\n🔒 Your credentials are provided by your branch administrator. If you've forgotten your password, contact the admin.',
    options: [
      { label: '📧 Who provides my credentials?', value: 'credentials_info' },
      { label: '🔑 Forgot password?',             value: 'forgot_password' },
      { label: '⬅️ Back to main menu',            value: 'start' },
    ],
  },
  credentials_info: {
    answer:
      '📧 **Credentials are provided by your Branch Admin or Super Admin.**\n\nWhen your account is created, you\'ll receive your email and password from the administrator. Each user is assigned a specific **role** (Admin / Editor / Viewer) that controls what you can see and do.',
    options: [
      { label: '👤 Contact Administrator', value: 'contact_admin' },
      { label: '⬅️ Back to login help',   value: 'login_help' },
      { label: '🏠 Main menu',            value: 'start' },
    ],
  },
  forgot_password: {
    answer:
      '🔑 **Forgot Your Password?**\n\nPasswords are managed by the system administrator. You cannot reset it yourself.\n\nPlease **contact your branch administrator** or the Super Admin to get your password reset.',
    options: [
      { label: '👤 Contact Administrator', value: 'contact_admin' },
      { label: '⬅️ Back to main menu',    value: 'start' },
    ],
  },
  mis_info: {
    answer:
      '📊 **MIS Tracker**\n\nThe **MIS (Management Information System) Tracker** is a real-time reporting module that tracks:\n\n• Monthly loan case progress\n• Branch-wise targets vs. achievements\n• Approval, pending & disbursement status\n• Team performance metrics\n\nIt helps managers make data-driven decisions quickly.',
    options: [
      { label: '📋 What reports are available?', value: 'reports_info' },
      { label: '⚙️ How does the system work?',   value: 'system_info' },
      { label: '⬅️ Back to main menu',           value: 'start' },
    ],
  },
  reports_info: {
    answer:
      '📋 **Available Reports**\n\n✅ **Credit Tracker** — Live status of all loan cases\n✅ **MIS Reports** — Consolidated monthly summaries\n✅ **MIS Tracker** — Real-time case tracking board\n✅ **Last 6 Months** — Historical performance trends\n✅ **Login Desk** — Daily login & case entry logs\n\n📌 Reports can be filtered by branch, cluster, month, and status.\n\n💡 *Need custom reports? Contact your administrator.*',
    options: [
      { label: '📊 Tell me about MIS Tracker',   value: 'mis_info' },
      { label: '👤 Contact Administrator',        value: 'contact_admin' },
      { label: '⬅️ Back to main menu',           value: 'start' },
    ],
  },
  system_info: {
    answer:
      '⚙️ **How Rights Tracker Works**\n\n**Rights Tracker** is a Credit & Loan Management System built for banking operations:\n\n🏢 **Branches** are grouped into **Clusters**\n👥 **Users** have role-based access (Admin / Editor / Viewer)\n📁 **Cases** are entered and tracked monthly\n📊 **Reports** are generated automatically\n🔄 **Real-time updates** keep all data synchronized\n\nThe system supports 51+ branches and multiple clusters.',
    options: [
      { label: '📊 What is MIS Tracker?',         value: 'mis_info' },
      { label: '📋 What reports are available?',   value: 'reports_info' },
      { label: '👤 Want to know more? Contact Admin', value: 'contact_admin' },
      { label: '⬅️ Back to main menu',            value: 'start' },
    ],
  },
  contact_admin: {
    answer:
      '👤 **Contact Administrator**\n\nFor any of the following, please reach out to your administrator:\n\n• Account creation or access issues\n• Password reset\n• Role / permission changes\n• Branch or cluster mapping queries\n• Custom report requests\n• Any technical issues\n\n📧 Contact your **Branch Admin** or **Super Admin** directly through your organization\'s internal communication channel.',
    options: [
      { label: '🔐 Back to login help', value: 'login_help' },
      { label: '🏠 Main menu',         value: 'start' },
    ],
  },
}

/* ─── Component ──────────────────────────────────── */
export default function LoginChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [msgId, setMsgId] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [pulse, setPulse] = useState(true)

  /* stop pulsing after 5s */
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 5000)
    return () => clearTimeout(t)
  }, [])

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* open → show welcome */
  const handleOpen = () => {
    setOpen(true)
    if (messages.length === 0) pushBot('start')
  }

  const nextId = () => {
    const id = msgId + 1
    setMsgId(id)
    return id
  }

  const pushBot = (key: string) => {
    const entry = FAQ[key] ?? FAQ['start']
    const id = nextId()
    setMessages(prev => [...prev, {
      id,
      from: 'bot',
      text: entry.answer,
      options: entry.options,
    }])
  }

  const handleOption = (opt: Option) => {
    const uid = nextId()
    setMessages(prev => [...prev, { id: uid, from: 'user', text: opt.label }])
    setTimeout(() => pushBot(opt.value), 400)
  }

  const handleSend = () => {
    const q = inputText.trim().toLowerCase()
    if (!q) return
    const uid = nextId()
    setMessages(prev => [...prev, { id: uid, from: 'user', text: inputText.trim() }])
    setInputText('')

    setTimeout(() => {
      let key = 'start'
      if (q.includes('login') || q.includes('sign in') || q.includes('password'))
        key = 'login_help'
      else if (q.includes('mis') || q.includes('management'))
        key = 'mis_info'
      else if (q.includes('report'))
        key = 'reports_info'
      else if (q.includes('how') || q.includes('work') || q.includes('system'))
        key = 'system_info'
      else if (q.includes('admin') || q.includes('contact') || q.includes('help'))
        key = 'contact_admin'
      pushBot(key)
    }, 400)
  }

  const handleReset = () => {
    setMessages([])
    setTimeout(() => pushBot('start'), 100)
  }

  /* ── Render ── */
  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          border: 'none', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(37,99,235,0.45)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        title="Chat with us"
      >
        {open ? <X size={22} color="white" /> : <MessageCircle size={22} color="white" />}

        {/* Pulse ring when closed */}
        {!open && pulse && (
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(37,99,235,0.6)',
            animation: 'chatPulse 1.5s ease-out infinite',
          }} />
        )}

        {/* Badge */}
        {!open && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            width: '14px', height: '14px', borderRadius: '50%',
            background: '#22c55e', border: '2px solid white',
          }} />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '92px', right: '24px', zIndex: 9998,
          width: '340px', maxHeight: '520px',
          background: 'white', borderRadius: '18px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(37,99,235,0.12)',
          border: '1px solid #e8f0fe',
          display: 'flex', flexDirection: 'column',
          animation: 'chatSlideUp 0.25s ease',
          overflow: 'hidden',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'white', fontWeight: 700, fontSize: '13.5px', lineHeight: 1.2 }}>RT Assistant</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>Online · Rights Tracker Help</p>
              </div>
            </div>
            <button onClick={handleReset} title="Restart"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.65)', padding: '4px' }}>
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            background: '#f8faff',
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '88%', padding: '10px 13px', borderRadius: msg.from === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.from === 'user' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'white',
                  color: msg.from === 'user' ? 'white' : '#1e293b',
                  fontSize: '12.5px', lineHeight: '1.6',
                  boxShadow: msg.from === 'user' ? '0 2px 8px rgba(37,99,235,0.25)' : '0 1px 4px rgba(0,0,0,0.07)',
                  border: msg.from === 'bot' ? '1px solid #e8f0fe' : 'none',
                  whiteSpace: 'pre-line',
                }}>
                  {/* Simple bold markdown */}
                  {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i}>{part.slice(2, -2)}</strong>
                      : part
                  )}
                </div>

                {/* Option buttons */}
                {msg.options && msg.from === 'bot' && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                    {msg.options.map((opt, oi) => (
                      <button key={oi} onClick={() => handleOption(opt)}
                        style={{
                          background: 'white', border: '1.5px solid #dbeafe',
                          borderRadius: '8px', padding: '7px 11px',
                          fontSize: '12px', color: '#1d4ed8', fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#dbeafe' }}
                      >
                        <ChevronRight size={11} style={{ flexShrink: 0 }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid #e8f0fe',
            display: 'flex', gap: '8px', background: 'white',
          }}>
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a question..."
              style={{
                flex: 1, border: '1.5px solid #dbeafe', borderRadius: '9px',
                padding: '8px 12px', fontSize: '12.5px', outline: 'none',
                color: '#0f172a', background: '#f8faff', fontFamily: 'inherit',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#dbeafe')}
            />
            <button onClick={handleSend}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none', borderRadius: '9px', padding: '8px 12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
              }}>
              <Send size={14} color="white" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatPulse {
          0%   { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </>
  )
}
