'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, ChevronRight, RotateCcw } from 'lucide-react'

interface Message {
  id: number
  from: 'bot' | 'user'
  text: string
  options?: { label: string; value: string }[]
}

/* ─── Knowledge Base ─────────────────────────────── */
const RESPONSES: Record<string, { answer: string; options?: { label: string; value: string }[] }> = {
  main_menu: {
    answer: 'How can I help you today? Please choose an option below or type your question:',
    options: [
      { label: '🔐 How to login?',               value: 'login_help' },
      { label: '📊 What is MIS Tracker?',         value: 'mis_info' },
      { label: '⚙️ How does the system work?',    value: 'system_info' },
      { label: '📋 What reports are available?',  value: 'reports_info' },
      { label: '👤 Contact Administrator',        value: 'contact_admin' },
      { label: '❌ Exit Chat',                    value: '__exit__' },
    ],
  },

  login_help: {
    answer:
      '🔐 Login Help\n\nTo sign in to Rights Tracker:\n\n1️⃣ Enter your registered Email Address\n2️⃣ Enter your Password\n3️⃣ Click the Sign In button\n\n🔒 Your credentials are provided by your branch administrator. If you have forgotten your password, please contact the admin.',
    options: [
      { label: '📧 Who gives me my credentials?', value: 'credentials_info' },
      { label: '🔑 I forgot my password',         value: 'forgot_password' },
      { label: '⬅️ Back to main menu',            value: 'main_menu' },
      { label: '❌ Exit Chat',                    value: '__exit__' },
    ],
  },

  credentials_info: {
    answer:
      '📧 Credentials Info\n\nYour login credentials (email & password) are created and provided by your Branch Admin or Super Admin.\n\nEach user is assigned a Role:\n• Admin — Full access\n• Editor — Can add/edit data\n• Viewer — Read-only access\n\nContact your administrator to get your account set up.',
    options: [
      { label: '👤 Contact Administrator', value: 'contact_admin' },
      { label: '⬅️ Back to login help',   value: 'login_help' },
      { label: '🏠 Main menu',            value: 'main_menu' },
      { label: '❌ Exit Chat',            value: '__exit__' },
    ],
  },

  forgot_password: {
    answer:
      '🔑 Forgot Password?\n\nPassword resets are handled by the system administrator. You cannot reset it yourself.\n\nPlease contact your Branch Admin or Super Admin to get a new password.',
    options: [
      { label: '👤 Contact Administrator', value: 'contact_admin' },
      { label: '⬅️ Back to main menu',    value: 'main_menu' },
      { label: '❌ Exit Chat',            value: '__exit__' },
    ],
  },

  mis_info: {
    answer:
      '📊 MIS Tracker\n\nThe MIS (Management Information System) Tracker is a real-time reporting module that helps track:\n\n• Monthly loan case progress\n• Branch-wise targets vs. achievements\n• Approval, pending & disbursement status\n• Team performance metrics\n\nIt helps managers make fast, data-driven decisions.',
    options: [
      { label: '📋 What reports are available?', value: 'reports_info' },
      { label: '⚙️ How does the system work?',   value: 'system_info' },
      { label: '⬅️ Back to main menu',           value: 'main_menu' },
      { label: '❌ Exit Chat',                   value: '__exit__' },
    ],
  },

  reports_info: {
    answer:
      '📋 Available Reports\n\n✅ Credit Tracker — Live status of all loan cases\n✅ MIS Reports — Consolidated monthly summaries\n✅ MIS Tracker — Real-time case tracking board\n✅ Last 6 Months — Historical performance trends\n✅ Login Desk — Daily login & case entry logs\n\n📌 All reports can be filtered by branch, cluster, month, and status.\n\nNeed custom reports? Contact your administrator.',
    options: [
      { label: '📊 Tell me about MIS Tracker',    value: 'mis_info' },
      { label: '👤 Contact Administrator',         value: 'contact_admin' },
      { label: '⬅️ Back to main menu',            value: 'main_menu' },
      { label: '❌ Exit Chat',                    value: '__exit__' },
    ],
  },

  system_info: {
    answer:
      '⚙️ How Rights Tracker Works\n\nRights Tracker is a Credit & Loan Management System for banking operations:\n\n🏢 Branches are grouped into Clusters\n👥 Users have role-based access (Admin / Editor / Viewer)\n📁 Cases are entered and tracked every month\n📊 Reports are generated automatically\n🔄 Real-time data sync across all users\n\nThe system supports 51+ branches across multiple clusters.',
    options: [
      { label: '📊 What is MIS Tracker?',              value: 'mis_info' },
      { label: '📋 What reports are available?',        value: 'reports_info' },
      { label: '👤 Want to know more? Contact Admin',  value: 'contact_admin' },
      { label: '⬅️ Back to main menu',                value: 'main_menu' },
      { label: '❌ Exit Chat',                         value: '__exit__' },
    ],
  },

  contact_admin: {
    answer:
      '👤 Contact Administrator\n\nPlease reach out to your administrator for:\n\n• Account creation or login issues\n• Password reset\n• Role or permission changes\n• Branch / cluster mapping queries\n• Custom report requests\n• Any other technical support\n\n📧 Contact your Branch Admin or Super Admin through your organization\'s internal communication channel.',
    options: [
      { label: '🔐 Back to login help', value: 'login_help' },
      { label: '🏠 Main menu',         value: 'main_menu' },
      { label: '❌ Exit Chat',         value: '__exit__' },
    ],
  },

  fallback: {
    answer:
      'I\'m not sure I understood that. Here are some things I can help you with:',
    options: [
      { label: '🔐 How to login?',               value: 'login_help' },
      { label: '📊 What is MIS Tracker?',         value: 'mis_info' },
      { label: '⚙️ How does the system work?',    value: 'system_info' },
      { label: '📋 What reports are available?',  value: 'reports_info' },
      { label: '👤 Contact Administrator',        value: 'contact_admin' },
    ],
  },
}

/* ─── Keyword matcher ────────────────────────────── */
function matchKey(q: string): string {
  if (/login|sign.?in|password|credentials|access/.test(q)) return 'login_help'
  if (/forgot|reset|lost/.test(q))                           return 'forgot_password'
  if (/mis|management information/.test(q))                  return 'mis_info'
  if (/report|tracker|credit|6 month|six month/.test(q))     return 'reports_info'
  if (/how|work|system|what is|explain/.test(q))             return 'system_info'
  if (/admin|contact|help|support/.test(q))                  return 'contact_admin'
  return 'fallback'
}

/* ─── Greeting sequence ──────────────────────────── */
const GREETINGS = [
  { id: 1, from: 'bot' as const, text: 'Hello! 👋 Welcome to Rights Tracker.' },
  { id: 2, from: 'bot' as const, text: 'I\'m your virtual assistant. How can I help you, Sir?' },
]

let _idCounter = 10

const newId = () => ++_idCounter

/* ─── Component ──────────────────────────────────── */
export default function LoginChatbot() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [greeted, setGreeted]   = useState(false)
  const [pulse, setPulse]       = useState(true)
  const bottomRef               = useRef<HTMLDivElement>(null)

  /* stop pulse after 6s */
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 6000)
    return () => clearTimeout(t)
  }, [])

  /* auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /* open chat → play greeting sequence */
  const handleOpen = () => {
    setOpen(true)
    if (!greeted) {
      setGreeted(true)
      // Step 1 — greeting line 1
      setTimeout(() => {
        setMessages([{ ...GREETINGS[0], id: newId() }])
      }, 100)
      // Step 2 — greeting line 2
      setTimeout(() => {
        setMessages(prev => [...prev, { ...GREETINGS[1], id: newId() }])
      }, 800)
      // Step 3 — main menu options
      setTimeout(() => {
        const menu = RESPONSES['main_menu']
        setMessages(prev => [...prev, {
          id: newId(), from: 'bot',
          text: menu.answer,
          options: menu.options,
        }])
      }, 1500)
    }
  }

  const pushBot = (key: string) => {
    const entry = RESPONSES[key] ?? RESPONSES['fallback']
    setMessages(prev => [...prev, {
      id: newId(), from: 'bot',
      text: entry.answer,
      options: entry.options,
    }])
  }

  const handleOption = (opt: { label: string; value: string }) => {
    if (opt.value === '__exit__') {
      setMessages(prev => [...prev, { id: newId(), from: 'user', text: opt.label }])
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: newId(), from: 'bot',
          text: 'Thank you for using RT Assistant. Have a great day! 👋\n\nYou can reopen the chat anytime.',
        }])
        setTimeout(() => setOpen(false), 1800)
      }, 350)
      return
    }
    setMessages(prev => [...prev, { id: newId(), from: 'user', text: opt.label }])
    setTimeout(() => pushBot(opt.value), 350)
  }

  const handleSend = () => {
    const raw = inputText.trim()
    if (!raw) return
    setMessages(prev => [...prev, { id: newId(), from: 'user', text: raw }])
    setInputText('')
    const q = raw.toLowerCase()

    // Greet back if user says hi
    if (/^(hi|hello|hey|hii+|good morning|good evening|namaste)/.test(q)) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: newId(), from: 'bot',
          text: 'Hello! 😊 Great to hear from you, Sir. How can I help you today?',
          options: RESPONSES['main_menu'].options,
        }])
      }, 350)
      return
    }

    setTimeout(() => pushBot(matchKey(q)), 350)
  }

  const handleReset = () => {
    setMessages([])
    setGreeted(false)
    setTimeout(() => handleOpen(), 100)
  }

  /* ── Render ── */
  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={handleOpen}
        title="Chat with RT Assistant"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          width: '58px', height: '58px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 6px 24px rgba(37,99,235,0.5)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(37,99,235,0.6)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,0.5)' }}
      >
        {open ? <X size={22} color="white" /> : <MessageCircle size={23} color="white" />}

        {!open && pulse && (
          <span style={{
            position: 'absolute', inset: '-4px', borderRadius: '50%',
            border: '2px solid rgba(37,99,235,0.5)',
            animation: 'rtPulse 1.6s ease-out infinite',
          }} />
        )}
        {!open && (
          <span style={{
            position: 'absolute', top: '0px', right: '0px',
            width: '14px', height: '14px', borderRadius: '50%',
            background: '#22c55e', border: '2.5px solid white',
          }} />
        )}
      </button>

      {/* ── Chat window ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '96px', right: '24px', zIndex: 9998,
          width: '345px',
          background: 'white', borderRadius: '20px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.16), 0 2px 8px rgba(37,99,235,0.1)',
          border: '1px solid #e0eaff',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'rtSlideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)',
          maxHeight: '540px',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            padding: '13px 15px',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Bot size={19} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '13.5px', lineHeight: 1.2 }}>
                RT Assistant
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px' }}>Online · Rights Tracker Help</span>
              </div>
            </div>
            <button onClick={handleReset} title="Restart chat"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', padding: '5px 7px', display: 'flex', alignItems: 'center' }}>
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 12px 8px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            background: '#f5f8ff',
          }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.from === 'user' ? 'flex-end' : 'flex-start' }}>

                {/* Bubble */}
                <div style={{
                  maxWidth: '90%',
                  padding: '9px 13px',
                  borderRadius: msg.from === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                  background: msg.from === 'user'
                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                    : 'white',
                  color: msg.from === 'user' ? 'white' : '#1e293b',
                  fontSize: '12.5px', lineHeight: 1.65,
                  boxShadow: msg.from === 'user'
                    ? '0 2px 10px rgba(37,99,235,0.3)'
                    : '0 1px 4px rgba(0,0,0,0.07)',
                  border: msg.from === 'bot' ? '1px solid #e0eaff' : 'none',
                  whiteSpace: 'pre-line', wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>

                {/* Quick-reply options */}
                {msg.options && msg.from === 'bot' && (
                  <div style={{ marginTop: '7px', display: 'flex', flexDirection: 'column', gap: '5px', width: '100%', maxWidth: '310px' }}>
                    {msg.options.map((opt, i) => (
                      <button key={i} onClick={() => handleOption(opt)}
                        style={{
                          background: 'white', border: '1.5px solid #bfdbfe',
                          borderRadius: '9px', padding: '7px 12px',
                          fontSize: '12px', color: '#1d4ed8', fontWeight: 600,
                          cursor: 'pointer', textAlign: 'left',
                          display: 'flex', alignItems: 'center', gap: '7px',
                          transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateX(3px)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.transform = 'translateX(0)' }}
                      >
                        <ChevronRight size={11} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid #e0eaff',
            display: 'flex', gap: '8px', background: 'white', alignItems: 'center',
          }}>
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type your question..."
              style={{
                flex: 1, border: '1.5px solid #dbeafe', borderRadius: '10px',
                padding: '9px 13px', fontSize: '12.5px', outline: 'none',
                color: '#0f172a', background: '#f8faff', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = '#2563eb')}
              onBlur={e => (e.target.style.borderColor = '#dbeafe')}
            />
            <button onClick={handleSend}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none', borderRadius: '10px', padding: '9px 13px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                boxShadow: '0 2px 8px rgba(37,99,235,0.35)', flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Send size={14} color="white" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes rtSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rtPulse {
          0%   { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.55); opacity: 0; }
        }
      `}</style>
    </>
  )
}
