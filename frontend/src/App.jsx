import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// 1. IMPORT SYNTAX HIGHLIGHTING UTILITIES
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism"

const DARK = {
  bg:               "#0e0e0e",
  bgSecondary:      "#161616",
  bgTertiary:       "#1e1e1e",
  border:           "#2a2a2a",
  borderFocus:      "#3a3a3a",
  text:             "#e8e8e8",
  textMuted:        "#555",
  textAi:           "#c8c8c8",
  accent:           "#7c6dfa",
  codeInlineBg:     "#1e1e1e",
  codeInlineBorder: "#2e2e2e",
  codeBlockBg:      "#111",
  codeBlockBorder:  "#222",
  scrollTrack:      "#0e0e0e",
  scrollThumb:      "#2a2a2a",
  scrollThumbHover: "#3a3a3a",
}

const LIGHT = {
  bg:               "#ffffff",
  bgSecondary:      "#f7f7f7",
  bgTertiary:       "#efefef",
  border:           "#e4e4e4",
  borderFocus:      "#c0c0c0",
  text:             "#111111",
  textMuted:        "#999",
  textAi:           "#333333",
  accent:           "#7c6dfa",
  codeInlineBg:     "#f0eeff",
  codeInlineBorder: "#e0d9ff",
  codeBlockBg:      "#f5f5f5",
  codeBlockBorder:  "#e4e4e4",
  scrollTrack:      "#ffffff",
  scrollThumb:      "#d0d0d0",
  scrollThumbHover: "#b0b0b0",
}

function makeStyles(t) {
  return {
    shell: {
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: t.bg,
      color: t.text,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflow: "hidden",
    },
    header: {
      padding: "16px 24px",
      borderBottom: `1px solid ${t.border}`,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: t.bg,
      flexShrink: 0,
    },
    headerDot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: t.accent,
      boxShadow: `0 0 8px ${t.accent}`,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: 500,
      color: t.text,
      letterSpacing: "0.02em",
    },
    headerSub: {
      fontSize: 12,
      color: t.textMuted,
      marginLeft: "auto",
      letterSpacing: "0.03em",
    },
    modelSelect: {
      background: t.bgSecondary,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      color: t.text,
      fontSize: 12,
      padding: "4px 8px",
      fontFamily: "inherit",
      cursor: "pointer",
      outline: "none",
    },
    headerBtn: {
      marginLeft: 8,
      background: "none",
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      cursor: "pointer",
      padding: "4px 10px",
      color: t.textMuted,
      fontSize: 12,
      lineHeight: 1,
      transition: "border-color 0.2s, color 0.2s",
    },
    body: {
      flex: 1,
      display: "flex",
      flexDirection: "row",
      overflow: "hidden",
    },
    sidebar: {
      width: 224,
      borderRight: `1px solid ${t.border}`,
      display: "flex",
      flexDirection: "column",
      background: t.bgSecondary,
      flexShrink: 0,
      overflow: "hidden",
    },
    sidebarTop: {
      padding: "12px 10px 8px",
      flexShrink: 0,
    },
    newChatBtn: {
      width: "100%",
      padding: "7px 10px",
      background: "none",
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      cursor: "pointer",
      color: t.text,
      fontSize: 13,
      fontFamily: "inherit",
      textAlign: "left",
      display: "flex",
      alignItems: "center",
      gap: 7,
      transition: "border-color 0.2s, background 0.15s",
    },
    sidebarScroll: {
      flex: 1,
      overflowY: "auto",
      scrollbarWidth: "thin",
      scrollbarColor: `${t.scrollThumb} ${t.scrollTrack}`,
      padding: "0 6px 8px",
    },
    groupLabel: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: t.textMuted,
      padding: "10px 6px 3px",
    },
    sessionItem: {
      padding: "7px 8px",
      borderRadius: 7,
      cursor: "pointer",
      fontSize: 13,
      color: t.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 4,
      marginBottom: 1,
    },
    sessionTitle: {
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      minWidth: 0,
    },
    sessionDeleteBtn: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: t.textMuted,
      fontSize: 14,
      padding: "0 2px",
      lineHeight: 1,
      flexShrink: 0,
    },
    chatCol: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minWidth: 0,
      position: "relative",
    },
    feed: {
      flex: 1,
      overflowY: "auto",
      scrollbarWidth: "thin",
      scrollbarColor: `${t.scrollThumb} ${t.scrollTrack}`,
      padding: "32px 0 16px",
    },
    feedInner: {
      maxWidth: 720,
      margin: "0 auto",
      padding: "0 24px",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    emptyState: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "50vh",
      gap: 12,
      userSelect: "none",
    },
    emptyIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: "rgba(124,109,250,0.12)",
      border: "1px solid rgba(124,109,250,0.2)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    emptyTitle: { fontSize: 20, fontWeight: 500, color: t.text, letterSpacing: "-0.01em" },
    emptySubtitle: { fontSize: 13, color: t.textMuted },
    rowUser: { display: "flex", justifyContent: "flex-end", marginTop: 4 },
    rowAi: { display: "flex", justifyContent: "flex-start", marginTop: 4 },
    bubbleUser: {
      background: t.bgTertiary,
      border: `1px solid ${t.border}`,
      borderRadius: "18px 18px 4px 18px",
      padding: "10px 16px",
      maxWidth: 560,
      fontSize: 14,
      lineHeight: 1.6,
      color: t.text,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    },
    bubbleAi: {
      background: "transparent",
      maxWidth: 640,
      fontSize: 14,
      lineHeight: 1.7,
      color: t.textAi,
      wordBreak: "break-word",
    },
    thinking: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "10px 0",
      color: t.textMuted,
      fontSize: 13,
    },
    thinkingDot: {
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: t.accent,
      animation: "pulse 1.2s ease-in-out infinite",
    },
    inputWrap: {
      padding: "12px 24px 16px",
      borderTop: `1px solid ${t.border}`,
      background: t.bg,
      flexShrink: 0,
    },
    inputInner: {
      maxWidth: 720,
      margin: "0 auto",
      background: t.bgSecondary,
      border: `1px solid ${t.border}`,
      borderRadius: 16,
      display: "flex",
      alignItems: "flex-end",
      gap: 8,
      padding: "12px 12px 12px 16px",
      transition: "border-color 0.2s",
    },
    textarea: {
      flex: 1,
      background: "transparent",
      border: "none",
      outline: "none",
      resize: "none",
      color: t.text,
      fontSize: 14,
      lineHeight: 1.6,
      fontFamily: "inherit",
      minHeight: 24,
      maxHeight: 180,
      overflowY: "auto",
    },
    sendBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: t.accent,
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      transition: "opacity 0.15s",
    },
    attachBtn: {
      width: 28,
      height: 28,
      borderRadius: 7,
      background: "none",
      border: `1px solid ${t.border}`,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: t.textMuted,
      transition: "border-color 0.2s, color 0.2s",
    },
    attachStrip: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      padding: "8px 0 4px",
      borderBottom: `1px solid ${t.border}`,
      marginBottom: 8,
    },
    attachChip: {
      position: "relative",
      borderRadius: 8,
      overflow: "hidden",
      border: `1px solid ${t.border}`,
      background: t.bgTertiary,
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 8px",
      fontSize: 12,
      color: t.textMuted,
      maxWidth: 160,
    },
    attachThumb: {
      width: 40,
      height: 40,
      objectFit: "cover",
      borderRadius: 6,
      flexShrink: 0,
    },
    attachRemove: {
      position: "absolute",
      top: 2,
      right: 2,
      background: "rgba(0,0,0,0.5)",
      border: "none",
      borderRadius: "50%",
      color: "#fff",
      width: 16,
      height: 16,
      fontSize: 10,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 1,
      padding: 0,
    },
    previewPanel: {
      width: "48%",
      borderLeft: `1px solid ${t.border}`,
      display: "flex",
      flexDirection: "column",
      background: t.bgSecondary,
      flexShrink: 0,
    },
    previewHeader: {
      padding: "10px 16px",
      borderBottom: `1px solid ${t.border}`,
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexShrink: 0,
    },
    previewDot: { width: 6, height: 6, borderRadius: "50%", background: t.accent },
    previewTitle: {
      fontSize: 12,
      fontWeight: 500,
      color: t.textMuted,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      flex: 1,
    },
    previewClose: {
      background: "none",
      border: "none",
      cursor: "pointer",
      color: t.textMuted,
      fontSize: 16,
      lineHeight: 1,
      padding: "2px 4px",
    },
    // Auth page
    authShell: {
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: t.bg,
      color: t.text,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    authCard: {
      width: 360,
      background: t.bgSecondary,
      border: `1px solid ${t.border}`,
      borderRadius: 16,
      padding: "36px 32px 32px",
      display: "flex",
      flexDirection: "column",
      gap: 20,
    },
    authHeader: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
    },
    authTitle: {
      fontSize: 20,
      fontWeight: 500,
      color: t.text,
      letterSpacing: "-0.01em",
    },
    authSub: { fontSize: 13, color: t.textMuted },
    authForm: { display: "flex", flexDirection: "column", gap: 12 },
    authLabel: { fontSize: 12, color: t.textMuted, marginBottom: 4, display: "block" },
    authInput: {
      width: "100%",
      padding: "9px 12px",
      background: t.bgTertiary,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      color: t.text,
      fontSize: 14,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
      transition: "border-color 0.2s",
    },
    authSubmitBtn: {
      width: "100%",
      padding: "10px",
      background: t.accent,
      border: "none",
      borderRadius: 8,
      color: "#fff",
      fontSize: 14,
      fontWeight: 500,
      fontFamily: "inherit",
      cursor: "pointer",
      marginTop: 4,
      transition: "opacity 0.15s",
    },
    authError: {
      fontSize: 13,
      color: "#f87171",
      background: "rgba(239,68,68,0.08)",
      border: "1px solid rgba(239,68,68,0.2)",
      borderRadius: 8,
      padding: "8px 12px",
    },
    authToggle: {
      fontSize: 13,
      color: t.textMuted,
      textAlign: "center",
    },
    authToggleBtn: {
      background: "none",
      border: "none",
      color: t.accent,
      cursor: "pointer",
      fontSize: 13,
      fontFamily: "inherit",
      padding: 0,
    },
  }
}

function makeProseStyle(t) {
  return `
  .ai-prose p { margin: 0 0 10px; }
  .ai-prose p:last-child { margin-bottom: 0; }

  /* Inline code only */
  .ai-prose :not(pre) > code {
    background: ${t.codeInlineBg};
    border: 1px solid ${t.codeInlineBorder};
    border-radius: 5px;
    padding: 1px 6px;
    font-size: 12.5px;
    color: ${t.accent};
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  /* Code block wrapper */
  .ai-prose pre {
    margin: 12px 0;
    width: 100%;
    box-sizing: border-box;
    background: transparent !important;
  }

  /* Remove ALL Prism token backgrounds */
  .ai-prose pre *,
  .ai-prose code * {
    background: transparent !important;
    box-shadow: none !important;
  }

  /* Remove token block backgrounds specifically */
  .ai-prose .token {
    background: transparent !important;
  }

  /* Prevent weird highlighted spans */
  .ai-prose .token.operator,
  .ai-prose .token.entity,
  .ai-prose .token.url,
  .ai-prose .token.selector,
  .ai-prose .token.atrule,
  .ai-prose .token.keyword,
  .ai-prose .token.regex,
  .ai-prose .token.important {
    background: transparent !important;
  }

  /* Lists */
  .ai-prose ul,
  .ai-prose ol {
    padding-left: 20px;
    margin: 8px 0;
  }

  .ai-prose li {
    margin: 3px 0;
  }

  /* Typography */
  .ai-prose strong {
    color: ${t.text};
    font-weight: 500;
  }

  .ai-prose a {
    color: ${t.accent};
    text-decoration: none;
  }

  .ai-prose a:hover {
    text-decoration: underline;
  }

  .ai-prose h1,
  .ai-prose h2,
  .ai-prose h3 {
    color: ${t.text};
    font-weight: 500;
    margin: 16px 0 8px;
    letter-spacing: -0.01em;
  }

  /* Blockquotes */
  .ai-prose blockquote {
    border-left: 2px solid ${t.accent};
    margin: 8px 0;
    padding: 4px 0 4px 14px;
    color: ${t.textMuted};
  }

  /* Animations */
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.3;
      transform: scale(0.8);
    }

    50% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Feed scrollbar */
  .feed::-webkit-scrollbar {
    width: 6px;
  }

  .feed::-webkit-scrollbar-track {
    background: ${t.scrollTrack};
  }

  .feed::-webkit-scrollbar-thumb {
    background: ${t.scrollThumb};
    border-radius: 3px;
  }

  .feed::-webkit-scrollbar-thumb:hover {
    background: ${t.scrollThumbHover};
  }

  /* Sidebar scrollbar */
  .sidebar-scroll::-webkit-scrollbar {
    width: 4px;
  }

  .sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar-scroll::-webkit-scrollbar-thumb {
    background: ${t.scrollThumb};
    border-radius: 2px;
  }

  /* Message timestamps */
  .msg-row .msg-ts {
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
  }
  .msg-row:hover .msg-ts {
    opacity: 1;
  }

  /* Focus states */
  .input-inner:focus-within {
    border-color: ${t.borderFocus} !important;
  }

  .auth-input:focus {
    border-color: ${t.borderFocus} !important;
  }

  /* Hover states */
  .new-chat-btn:hover {
    background: ${t.bgTertiary} !important;
    border-color: ${t.borderFocus} !important;
  }

  .session-item:hover {
    background: ${t.bgTertiary};
  }

  .session-item-active {
    background: ${t.bgTertiary};
  }

  .session-item .del-btn {
    opacity: 0;
    transition: opacity 0.15s;
  }

  .session-item:hover .del-btn {
    opacity: 1;
  }
  `
}

function formatTimestamp(ts) {
  if (!ts) return ""
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  if (isToday) return time
  const isThisYear = d.getFullYear() === now.getFullYear()
  const date = d.toLocaleDateString([], { month: "short", day: "numeric", ...(isThisYear ? {} : { year: "numeric" }) })
  return `${date}, ${time}`
}

function extractHtml(content) {
  const docMatch = content.match(/```html\n([\s\S]*?)\n```/i)
  if (docMatch) return docMatch[1].trim()
  if (/^\s*<!DOCTYPE\s+html/i.test(content) || /^\s*<html/i.test(content)) return content.trim()
  return null
}

function wrapHtml(raw) {
  if (/^\s*<!DOCTYPE\s+html/i.test(raw) || /^\s*<html/i.test(raw)) return raw
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; }
  </style></head><body>${raw}</body></html>`
}

function groupByDate(sessions) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart - 86400000)
  const weekStart = new Date(todayStart - 6 * 86400000)
  const groups = { Today: [], Yesterday: [], "Last 7 Days": [], Older: [] }
  for (const s of sessions) {
    const d = new Date(s.updated_at)
    if (d >= todayStart) groups.Today.push(s)
    else if (d >= yesterdayStart) groups.Yesterday.push(s)
    else if (d >= weekStart) groups["Last 7 Days"].push(s)
    else groups.Older.push(s)
  }
  return groups
}

// 2. UNIFIED CODEBLOCK COMPONENT WITH RICH HIGHLIGHTING
function CodeBlock({ language, value, theme, dark }) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const lineCount = value.split("\n").length

  function copy() {
    navigator.clipboard.writeText(value).then(() => { 
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) 
    })
  }

  const btnStyle = {
    background: "none", border: `1px solid ${theme.border}`, borderRadius: 5,
    cursor: "pointer", padding: "2px 8px", fontSize: 10, fontFamily: "inherit",
    color: theme.textMuted, transition: "color 0.2s",
  }

  return (
    <div style={{ position: "relative", margin: "14px 0" }}>
      {/* Control bar overlay inside the block */}
      <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 6, zIndex: 10, alignItems: "center" }}>
        {language && (
          <span style={{ fontSize: 9, color: theme.textMuted, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 4 }}>
            {language}
          </span>
        )}
        <button onClick={() => setCollapsed(c => !c)} style={btnStyle}>
          {collapsed ? "Show" : "Hide"}
        </button>
        <button onClick={copy} style={{ ...btnStyle, color: copied ? theme.accent : theme.textMuted }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {collapsed ? (
        <div style={{
          background: theme.codeBlockBg, border: `1px solid ${theme.codeBlockBorder}`,
          borderRadius: 10, padding: "10px 16px",
          fontSize: 12, color: theme.textMuted, fontFamily: "'SF Mono', 'Fira Code', monospace",
          cursor: "pointer",
        }} onClick={() => setCollapsed(false)}>
          {lineCount} line{lineCount !== 1 ? "s" : ""} hidden — click to expand
        </div>
      ) : (
        <div style={{ 
          borderRadius: 10, 
          overflow: "hidden", 
          border: `1px solid ${theme.codeBlockBorder}` 
        }}>
          <SyntaxHighlighter
            language={language || "text"}
            style={dark ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              paddingTop: "45px",
              padding: "16px",
              background: theme.codeBlockBg,
              fontSize: "13px",
              fontFamily: "'SF Mono', 'Fira Code', monospace",
            }}
          >
            {value}
          </SyntaxHighlighter>
        </div>
      )}
    </div>
  )
}

const TOOL_BADGE = {
  nmap:     { label: "nmap",     color: "#3b82f6" },
  zap:      { label: "ZAP",      color: "#f97316" },
  acunetix: { label: "Acunetix", color: "#a855f7" },
  system:   { label: "system",   color: "#6b7280" },
}

function ToolBadge({ tool }) {
  const badge = TOOL_BADGE[tool]
  if (!badge) return null
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 500, letterSpacing: "0.06em",
      textTransform: "uppercase", color: badge.color, border: `1px solid ${badge.color}`,
      borderRadius: 4, padding: "1px 6px", marginBottom: 6, opacity: 0.8,
    }}>
      {badge.label}
    </span>
  )
}

function CopyButton({ text, theme }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <button onClick={copy} style={{
      background: "none", border: `1px solid ${theme.border}`, borderRadius: 6,
      cursor: "pointer", padding: "3px 8px", fontSize: 11,
      color: copied ? theme.accent : theme.textMuted, marginTop: 6, transition: "color 0.2s",
    }}>
      {copied ? "Copied" : "Copy"}
    </button>
  )
}

const API = import.meta.env.VITE_API_URL || ""

function AuthPage({ onLogin, theme, s, dark, setDark }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.detail
        setError(Array.isArray(msg) ? msg.map(e => e.msg).join(", ") : msg || "Something went wrong")
      } else {
        onLogin(data.token, data.username, data.is_admin ?? false)
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{makeProseStyle(theme)}</style>
      <div style={s.authShell}>
        <div style={{ position: "absolute", top: 16, right: 20 }}>
          <button style={s.headerBtn} onClick={() => setDark(d => !d)}>
            {dark ? "☀ Light" : "☾ Dark"}
          </button>
        </div>
        <div style={s.authCard}>
          <div style={s.authHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }} />
              <span style={{ fontSize: 12, color: theme.textMuted, letterSpacing: "0.04em" }}>AI ASSISTANT</span>
            </div>
            <div style={s.authTitle}>Welcome back</div>
            <div style={s.authSub}>Sign in to continue</div>
          </div>

          <form style={s.authForm} onSubmit={submit}>
            <div>
              <label style={s.authLabel}>Username</label>
              <input
                className="auth-input"
                style={s.authInput}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your_username"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
            <div>
              <label style={s.authLabel}>Password</label>
              <input
                className="auth-input"
                style={s.authInput}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
            {error && <div style={s.authError}>{error}</div>}
            <button style={{ ...s.authSubmitBtn, opacity: loading ? 0.6 : 1 }} disabled={loading}>
              {loading ? "Please wait…" : "Sign in"}
            </button>
          </form>

          <div style={{ fontSize: 11, color: theme.textMuted, textAlign: "center", lineHeight: 1.5, borderTop: `1px solid ${theme.border}`, paddingTop: 14 }}>
            All conversations on this platform are monitored and may be reviewed by administrators.
          </div>
        </div>
      </div>
    </>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme")
    return saved ? saved === "dark" : true
  })
  const [token, setToken] = useState(() => localStorage.getItem("token"))
  const [username, setUsername] = useState(() => localStorage.getItem("username"))
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("is_admin") === "true")
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("model") || "gemini")
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("anthropic_key") || "")
  const [keyInput, setKeyInput] = useState("")
  const [personalities, setPersonalities] = useState([])
  const [activePersonalityId, setActivePersonalityId] = useState(() =>
    localStorage.getItem("active_personality") || "cyber"
  )
  const [showPersonalityModal, setShowPersonalityModal] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminSelectedUser, setAdminSelectedUser] = useState(null)
  const [adminSessions, setAdminSessions] = useState([])
  const [adminPersonalities, setAdminPersonalities] = useState([])
  const [adminAddingUser, setAdminAddingUser] = useState(false)
  const [adminNewUsername, setAdminNewUsername] = useState("")
  const [adminNewPassword, setAdminNewPassword] = useState("")
  const [adminError, setAdminError] = useState("")
  const [adminViewingSession, setAdminViewingSession] = useState(null)
  const [adminSessionMessages, setAdminSessionMessages] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState("")
  const [draftPrompt, setDraftPrompt] = useState("")
  const [availableModels, setAvailableModels] = useState([{ id: "gemini", label: "Gemini Flash Lite" }])
  const [sessionCost, setSessionCost] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(() => localStorage.getItem("sidebar") !== "closed")
  const [sessions, setSessions] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [previewHtml, setPreviewHtml] = useState(null)

  const messagesEndRef = useRef(null)
  const feedRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const inputWrapRef = useRef(null)
  const [attachments, setAttachments] = useState([])
  const promptRef = useRef("")
  const [hasInput, setHasInput] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounterRef = useRef(0)
  const [codeMode, setCodeMode] = useState(false)
  const [codeLang, setCodeLang] = useState("")
  const [sidebarSearch, setSidebarSearch] = useState("")
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState("")
  const [expanded, setExpanded] = useState(false)
  const modalTextareaRef = useRef(null)
  const abortControllerRef = useRef(null)
  const inputHistoryRef = useRef([])
  const historyIdxRef = useRef(-1)
  const savedDraftRef = useRef("")

  const theme = useMemo(() => dark ? DARK : LIGHT, [dark])
  const s = useMemo(() => makeStyles(theme), [theme])

  const authHeaders = useCallback((extra = {}) => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...extra,
  }), [token])

  // 3. UPDATED MARKDOWN RENDER CONFIGURATION FOR SYNTAX HIGHLIGHTING
  const mdComponents = useMemo(() => ({
    pre: ({ children }) => <>{children}</>, // Strip React-Markdown's default pre wrapping layout
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "")
      return !inline ? (
        <CodeBlock
          language={match ? match[1] : ""}
          value={String(children).replace(/\n$/, "")}
          theme={theme}
          dark={dark}
        />
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      )
    }
  }), [theme, dark])

  useEffect(() => { localStorage.setItem("theme", dark ? "dark" : "light") }, [dark])
  useEffect(() => { localStorage.setItem("model", selectedModel) }, [selectedModel])
  useEffect(() => { localStorage.setItem("sidebar", sidebarOpen ? "open" : "closed") }, [sidebarOpen])
  useEffect(() => { localStorage.setItem("active_personality", activePersonalityId) }, [activePersonalityId])
  useEffect(() => {
    fetch(`${API}/models`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || !data.length) return
        setAvailableModels(data)
        const ids = data.map(m => m.id)
        if (!ids.includes(selectedModel)) {
          const fallback = data.find(m => m.default) ?? data[0]
          setSelectedModel(fallback.id)
        }
      })
      .catch(() => {})
  }, [])
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const { scrollTop, scrollHeight, clientHeight } = feed
    if (scrollHeight - scrollTop - clientHeight < 150) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, loading])

  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = feed
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 120)
    }
    feed.addEventListener("scroll", onScroll, { passive: true })
    return () => feed.removeEventListener("scroll", onScroll)
  }, [])

  const refreshSessions = useCallback(() => {
    if (!token) return
    fetch(`${API}/sessions`, { headers: authHeaders() })
      .then(r => {
        if (r.status === 401) { handleLogout(); return [] }
        return r.json()
      })
      .then(data => Array.isArray(data) && setSessions(data))
      .catch(() => {})
  }, [token, authHeaders])

  useEffect(() => { refreshSessions() }, [refreshSessions])

  const fetchPersonalities = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/personalities`, { headers: authHeaders() })
      if (res.status === 401) { handleLogout(); return }
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return
      setPersonalities(data)
      if (data.length > 0) {
        setActivePersonalityId(prev => data.some(p => p.id === prev) ? prev : data[0].id)
      }
    } catch {}
  }, [token, authHeaders])

  useEffect(() => { fetchPersonalities() }, [fetchPersonalities])

  function handleLogin(tok, user, admin = false) {
    localStorage.setItem("token", tok)
    localStorage.setItem("username", user)
    localStorage.setItem("is_admin", admin ? "true" : "false")
    setToken(tok)
    setUsername(user)
    setIsAdmin(admin)
  }

  function handleLogout() {
    localStorage.removeItem("token")
    localStorage.removeItem("username")
    localStorage.removeItem("is_admin")
    setToken(null)
    setUsername(null)
    setIsAdmin(false)
    setSessions([])
    setPersonalities([])
    setMessages([])
    setSessionId(null)
    setPreviewHtml(null)
  }

  async function openAdminPanel() {
    setShowAdminPanel(true)
    setAdminSelectedUser(null)
    setAdminAddingUser(false)
    setAdminError("")
    const res = await fetch(`${API}/admin/users`, { headers: authHeaders() })
    if (res.ok) setAdminUsers(await res.json())
  }

  async function adminSelectUser(user) {
    setAdminSelectedUser(user)
    setAdminViewingSession(null)
    setAdminSessionMessages([])
    setAdminAddingUser(false)
    setAdminError("")
    const [sr, pr] = await Promise.all([
      fetch(`${API}/admin/users/${user.id}/sessions`, { headers: authHeaders() }),
      fetch(`${API}/admin/users/${user.id}/personalities`, { headers: authHeaders() }),
    ])
    if (sr.ok) setAdminSessions(await sr.json())
    if (pr.ok) setAdminPersonalities(await pr.json())
  }

  async function adminViewSession(session) {
    setAdminViewingSession(session)
    const res = await fetch(`${API}/admin/users/${adminSelectedUser.id}/sessions/${session.id}/messages`, { headers: authHeaders() })
    if (res.ok) setAdminSessionMessages(await res.json())
  }

  async function adminDeleteUser(userId) {
    if (!confirm("Delete this user and ALL their data? This cannot be undone.")) return
    const res = await fetch(`${API}/admin/users/${userId}`, { method: "DELETE", headers: authHeaders() })
    if (res.ok || res.status === 204) {
      setAdminUsers(prev => prev.filter(u => u.id !== userId))
      if (adminSelectedUser?.id === userId) { setAdminSelectedUser(null); setAdminSessions([]); setAdminPersonalities([]) }
    }
  }

  async function adminDeleteSession(userId, sessionId) {
    await fetch(`${API}/admin/users/${userId}/sessions/${sessionId}`, { method: "DELETE", headers: authHeaders() })
    setAdminSessions(prev => prev.filter(s => s.id !== sessionId))
    setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, session_count: u.session_count - 1 } : u))
    if (adminViewingSession?.id === sessionId) { setAdminViewingSession(null); setAdminSessionMessages([]) }
  }

  async function adminDeletePersonality(userId, personalityId) {
    await fetch(`${API}/admin/users/${userId}/personalities/${personalityId}`, { method: "DELETE", headers: authHeaders() })
    setAdminPersonalities(prev => prev.filter(p => p.id !== personalityId))
    setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, personality_count: u.personality_count - 1 } : u))
  }

  async function adminCreateUser(e) {
    e.preventDefault()
    setAdminError("")
    const res = await fetch(`${API}/admin/users`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ username: adminNewUsername.trim(), password: adminNewPassword }),
    })
    const data = await res.json()
    if (!res.ok) { setAdminError(data.detail || "Failed to create user"); return }
    setAdminUsers(prev => [...prev, data])
    setAdminNewUsername("")
    setAdminNewPassword("")
    setAdminAddingUser(false)
  }

  function newChat() {
    setMessages([])
    setSessionId(null)
    setPreviewHtml(null)
    setSessionCost(0)
  }

  async function loadSession(id) {
    const msgs = await fetch(`${API}/sessions/${id}/messages`, { headers: authHeaders() }).then(r => r.json())
    setMessages(msgs.map(m => ({
      role: m.role,
      content: m.content,
      tool: m.tool,
      error: m.error,
      hasPreview: !!extractHtml(m.content),
      timestamp: m.created_at,
    })))
    setSessionId(id)
    setPreviewHtml(null)
  }

  async function deleteSession(id, e) {
    e.stopPropagation()
    setMenuOpenId(null)
    await fetch(`${API}/sessions/${id}`, { method: "DELETE", headers: authHeaders() })
    setSessions(prev => prev.filter(s => s.id !== id))
    if (sessionId === id) newChat()
  }

  async function confirmRename(id) {
    const title = renameValue.trim()
    setRenamingId(null)
    setRenameValue("")
    if (!title) return
    setSessions(prev => prev.map(s => s.id === id ? { ...s, title } : s))
    await fetch(`${API}/sessions/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ title }),
    }).catch(() => {})
  }

  useEffect(() => {
    if (!menuOpenId) return
    const close = () => setMenuOpenId(null)
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [menuOpenId])

  async function sendPrompt(retryPayload = null) {
    const currentPrompt = retryPayload?.prompt ?? promptRef.current
    const currentAttachments = retryPayload?.files ?? attachments
    const isCode = retryPayload?.isCode ?? codeMode
    const currentCodeLang = retryPayload?.codeLang ?? (codeMode ? codeLang : "")
    if (!currentPrompt.trim() && currentAttachments.length === 0) return

    if (!retryPayload) {
      const attachedFiles = currentAttachments.map(f => ({
        name: f.name,
        type: f.type,
        previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      }))
      setMessages(prev => [...prev, { role: "user", content: currentPrompt, attachedFiles, isCode, codeLang: currentCodeLang, timestamp: new Date().toISOString() }])
      if (currentPrompt.trim()) {
        const hist = inputHistoryRef.current
        if (hist[hist.length - 1] !== currentPrompt) hist.push(currentPrompt)
      }
      historyIdxRef.current = -1
      savedDraftRef.current = ""
      promptRef.current = ""
      if (textareaRef.current) {
        textareaRef.current.value = ""
        textareaRef.current.style.height = "auto"
      }
      setHasInput(false)
      setCodeMode(false)
      setCodeLang("")
      setExpanded(false)
      setAttachments([])
    }

    // Add streaming placeholder
    setMessages(prev => [...prev, { role: "assistant", content: "", tool: "ai", streaming: true, error: false, timestamp: new Date().toISOString() }])
    setLoading(true)

    // Wrap in code fence for the AI when in code mode
    const promptForApi = isCode ? `\`\`\`${currentCodeLang}\n${currentPrompt}\n\`\`\`` : currentPrompt

    // Variables declared outside try so catch can access them for graceful abort
    let streamedText = ""
    let pending = ""
    let rafId = null

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const body = new FormData()
      body.append("prompt", promptForApi)
      body.append("model", selectedModel)
      if (sessionId) body.append("session_id", sessionId)
      for (const file of currentAttachments) body.append("files", file)
      const activePersonality = personalities.find(p => p.id === activePersonalityId)
      if (activePersonality?.prompt) body.append("system_prompt", activePersonality.prompt)

      const extraHeaders = selectedModel === "claude" && anthropicKey
        ? { "X-Anthropic-Key": anthropicKey } : {}
      const { "Content-Type": _, ...headersWithoutContentType } = authHeaders(extraHeaders)
      const res = await fetch(`${API}/agent`, {
        method: "POST",
        headers: headersWithoutContentType,
        body,
        signal: controller.signal,
      })

      if (res.status === 401) { handleLogout(); return }
      if (!res.body) throw new Error("No response body")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ""

      // Batch token updates to animation frames to avoid flooding React
      const flush = () => {
        rafId = null
        if (!pending) return
        const chunk = pending
        pending = ""
        setMessages(prev => {
          const msgs = [...prev]
          const last = msgs[msgs.length - 1]
          if (!last?.streaming) return prev
          msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
          return msgs
        })
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        const parts = buf.split("\n\n")
        buf = parts.pop() ?? ""

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue
          let event
          try { event = JSON.parse(part.slice(6)) } catch { continue }

          if (event.t === "tok") {
            streamedText += event.v
            pending += event.v
            if (!rafId) rafId = requestAnimationFrame(flush)

          } else if (event.t === "done") {
            // pending is already in streamedText — just cancel the RAF and clear it
            if (rafId) { cancelAnimationFrame(rafId); rafId = null }
            pending = ""

            const html = extractHtml(streamedText)
            if (html) setPreviewHtml(wrapHtml(html))

            if (event.session_id && event.session_id !== sessionId) {
              setSessionId(event.session_id)
              refreshSessions()
            } else if (event.session_id) {
              refreshSessions()
            }

            setMessages(prev => {
              const msgs = [...prev]
              const last = msgs[msgs.length - 1]
              if (!last?.streaming) return prev
              msgs[msgs.length - 1] = {
                ...last,
                content: streamedText,
                streaming: false,
                tool: event.tool ?? "ai",
                error: event.error ?? false,
                hasPreview: !!html,
                retryPayload: event.error ? { prompt: currentPrompt, files: currentAttachments, isCode, codeLang: currentCodeLang } : null,
              }
              return msgs
            })
          }
        }
      }
    } catch (e) {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null }

      if (e?.name === "AbortError") {
        // User stopped generation — keep whatever was streamed
        const finalContent = streamedText + pending
        setMessages(prev => {
          const msgs = [...prev]
          const last = msgs[msgs.length - 1]
          if (!last?.streaming) return prev
          if (!finalContent) return msgs.slice(0, -1)
          msgs[msgs.length - 1] = { ...last, content: finalContent, streaming: false, tool: last.tool || "ai", error: false }
          return msgs
        })
      } else {
        setMessages(prev => {
          const msgs = [...prev]
          const last = msgs[msgs.length - 1]
          if (last?.streaming) {
            msgs[msgs.length - 1] = {
              ...last,
              content: "Failed to reach the server. Check that the backend is running.",
              streaming: false,
              tool: "system",
              error: true,
              retryPayload: { prompt: currentPrompt, files: currentAttachments, isCode, codeLang: currentCodeLang },
            }
            return msgs
          }
          return [...prev, {
            role: "assistant",
            content: "Failed to reach the server. Check that the backend is running.",
            tool: "system",
            error: true,
            retryPayload: { prompt: currentPrompt, files: currentAttachments, isCode, codeLang: currentCodeLang },
          }]
        })
      }
    } finally {
      abortControllerRef.current = null
      setLoading(false)
    }
  }

  async function retryMessage(msgIndex) {
    const msg = messages[msgIndex]
    if (!msg?.retryPayload || loading) return
    setMessages(prev => prev.filter((_, i) => i !== msgIndex))
    await sendPrompt(msg.retryPayload)
  }

  function stopGeneration() {
    abortControllerRef.current?.abort()
  }


  function onDragEnter(e) {
    e.preventDefault()
    if (!e.dataTransfer.types.includes("Files")) return
    dragCounterRef.current++
    setIsDragging(true)
  }

  function onDragLeave(e) {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragging(false)
  }

  function onDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  function onDrop(e) {
    e.preventDefault()
    dragCounterRef.current = 0
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) setAttachments(prev => [...prev, ...files])
  }

  function exportConversation() {
    if (messages.length === 0) return
    const sessionTitle = sessions.find(s => s.id === sessionId)?.title || "Conversation"
    const lines = [
      `# ${sessionTitle}`,
      `*Exported: ${new Date().toLocaleString()}*`,
      "",
      "---",
      "",
    ]
    for (const msg of messages) {
      if (msg.streaming) continue
      if (msg.role === "user") {
        lines.push("**You**", "")
        if (msg.isCode) {
          lines.push(`\`\`\`${msg.codeLang || ""}`, msg.content, "```")
        } else {
          lines.push(msg.content)
        }
      } else {
        const toolLabel = msg.tool && msg.tool !== "ai" ? ` · ${msg.tool}` : ""
        lines.push(`**Assistant${toolLabel}**`, "")
        lines.push(msg.content)
      }
      lines.push("", "---", "")
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!token) {
    return <AuthPage onLogin={handleLogin} theme={theme} s={s} dark={dark} setDark={setDark} />
  }

  const filteredSessions = sidebarSearch
    ? sessions.filter(s => s.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : sessions
  const grouped = groupByDate(filteredSessions)

  return (
    <>
      <style>{makeProseStyle(theme)}</style>
      <div style={s.shell}>

        {/* Header */}
        <div style={s.header}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? "Hide history" : "Show history"}
            style={{ ...s.headerBtn, marginLeft: 0, padding: "4px 8px", display: "flex", alignItems: "center", gap: 3 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
          <div style={s.headerDot} />
          <span style={s.headerTitle}>AI Assistant</span>
          <select
            style={s.modelSelect}
            value={selectedModel}
            onChange={e => { setSelectedModel(e.target.value); setSessionCost(0) }}
            title="Select AI model"
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          {selectedModel === "claude" && !anthropicKey && (
            <form
              onSubmit={e => {
                e.preventDefault()
                const k = keyInput.trim()
                if (!k) return
                localStorage.setItem("anthropic_key", k)
                setAnthropicKey(k)
                setKeyInput("")
              }}
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                placeholder="sk-ant-… API key"
                autoComplete="off"
                style={{
                  ...s.modelSelect,
                  width: 180,
                  padding: "4px 10px",
                  fontFamily: "inherit",
                }}
              />
              <button type="submit" style={{ ...s.headerBtn, marginLeft: 0 }}>Save</button>
            </form>
          )}
          {selectedModel === "claude" && anthropicKey && (
            <span style={{ fontSize: 11, color: theme.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
              Key saved
              <button
                onClick={() => { localStorage.removeItem("anthropic_key"); setAnthropicKey("") }}
                style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 13, lineHeight: 1, padding: 0 }}
                title="Remove key"
              >×</button>
            </span>
          )}
          {selectedModel === "claude" && anthropicKey && sessionCost > 0 && (
            <span style={{ fontSize: 11, color: theme.textMuted, letterSpacing: "0.02em" }}>
              session: ${sessionCost.toFixed(4)}
            </span>
          )}
          {/* Personality selector */}
          <select
            style={s.modelSelect}
            value={activePersonalityId}
            onChange={e => setActivePersonalityId(e.target.value)}
            title="Active personality"
          >
            {personalities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            style={{ ...s.headerBtn, marginLeft: 0, padding: "4px 8px", display: "flex", alignItems: "center" }}
            onClick={() => {
              const p = personalities.find(x => x.id === activePersonalityId) || personalities[0]
              setEditingId(p?.id ?? null)
              setDraftName(p?.name ?? "")
              setDraftPrompt(p?.prompt ?? "")
              setShowPersonalityModal(true)
            }}
            title="Manage personalities"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <span style={s.headerSub}>{username}</span>
          {messages.length > 0 && (
            <button
              style={s.headerBtn}
              onClick={exportConversation}
              title="Export conversation as Markdown"
            >
              Export
            </button>
          )}
          <button style={s.headerBtn} onClick={() => setDark(d => !d)}>
            {dark ? "☀ Light" : "☾ Dark"}
          </button>
          {isAdmin && (
            <button style={{ ...s.headerBtn, color: theme.accent, borderColor: theme.accent }} onClick={openAdminPanel}>
              Admin
            </button>
          )}
          <button style={s.headerBtn} onClick={handleLogout}>Sign out</button>
        </div>

        {/* Body */}
        <div style={s.body}>

          {/* Sidebar */}
          <div style={{ ...s.sidebar, width: sidebarOpen ? 224 : 0, transition: "width 0.2s ease" }}>
            <div style={s.sidebarTop}>
              <button className="new-chat-btn" style={s.newChatBtn} onClick={newChat}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New chat
              </button>
              <div style={{ position: "relative", marginTop: 8 }}>
                <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={theme.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search…"
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "5px 8px 5px 26px",
                    background: theme.bgTertiary, border: `1px solid ${theme.border}`,
                    borderRadius: 7, color: theme.text, fontSize: 12,
                    fontFamily: "inherit", outline: "none",
                  }}
                />
                {sidebarSearch && (
                  <button
                    onClick={() => setSidebarSearch("")}
                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 14, lineHeight: 1, padding: 0 }}
                  >×</button>
                )}
              </div>
            </div>
            <div style={s.sidebarScroll} className="sidebar-scroll">
              {Object.entries(grouped).map(([label, items]) =>
                items.length === 0 ? null : (
                  <div key={label}>
                    <div style={s.groupLabel}>{label}</div>
                    {items.map(sess => (
                      <div
                        key={sess.id}
                        className={`session-item${sessionId === sess.id ? " session-item-active" : ""}`}
                        style={{ ...s.sessionItem, position: "relative" }}
                        onClick={() => renamingId !== sess.id && loadSession(sess.id)}
                      >
                        {renamingId === sess.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") confirmRename(sess.id)
                              if (e.key === "Escape") { setRenamingId(null); setRenameValue("") }
                            }}
                            onBlur={() => confirmRename(sess.id)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              flex: 1, minWidth: 0, background: "transparent",
                              border: "none", outline: `1px solid ${theme.accent}`,
                              borderRadius: 4, color: theme.text, fontSize: 13,
                              padding: "1px 4px", fontFamily: "inherit",
                            }}
                          />
                        ) : (
                          <span style={s.sessionTitle}>{sess.title}</span>
                        )}
                        {renamingId !== sess.id && (
                          <button
                            className="del-btn"
                            style={s.sessionDeleteBtn}
                            title="Options"
                            onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === sess.id ? null : sess.id) }}
                          >•••</button>
                        )}
                        {menuOpenId === sess.id && (
                          <div
                            onMouseDown={e => e.stopPropagation()}
                            style={{
                              position: "absolute", top: "100%", right: 0, zIndex: 50,
                              background: theme.bgSecondary, border: `1px solid ${theme.border}`,
                              borderRadius: 8, padding: 4, minWidth: 120,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.25)", marginTop: 2,
                            }}
                          >
                            <button
                              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", fontSize: 13, color: theme.text, cursor: "pointer", borderRadius: 5 }}
                              onMouseEnter={e => e.currentTarget.style.background = theme.bgTertiary}
                              onMouseLeave={e => e.currentTarget.style.background = "none"}
                              onClick={e => { e.stopPropagation(); setRenamingId(sess.id); setRenameValue(sess.title); setMenuOpenId(null) }}
                            >Rename</button>
                            <button
                              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 10px", fontSize: 13, color: "#f87171", cursor: "pointer", borderRadius: 5 }}
                              onMouseEnter={e => e.currentTarget.style.background = theme.bgTertiary}
                              onMouseLeave={e => e.currentTarget.style.background = "none"}
                              onClick={e => deleteSession(sess.id, e)}
                            >Delete</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
              {filteredSessions.length === 0 && (
                <div style={{ padding: "12px 8px", fontSize: 12, color: theme.textMuted }}>
                  {sidebarSearch ? "No matches" : "No conversations yet"}
                </div>
              )}
            </div>
          </div>

          {/* Chat column */}
          <div
            style={s.chatCol}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            {/* Drag-and-drop overlay */}
            {isDragging && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 200,
                background: dark ? "rgba(124,109,250,0.08)" : "rgba(124,109,250,0.05)",
                border: `2px dashed ${theme.accent}`,
                borderRadius: 12,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 10, pointerEvents: "none",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
                <span style={{ fontSize: 15, fontWeight: 500, color: theme.accent }}>Drop files to attach</span>
              </div>
            )}
            <div ref={feedRef} style={s.feed} className="feed">
              <div style={s.feedInner}>
                {messages.length === 0 && (
                  <div style={s.emptyState}>
                    <div style={s.emptyIcon}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c6dfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </div>
                    <div style={s.emptyTitle}>AI Assistant</div>
                    <div style={s.emptySubtitle}>Ask anything</div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i} className="msg-row" style={msg.role === "user" ? s.rowUser : s.rowAi}>
                    {msg.role === "user" ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, maxWidth: 560 }}>
                        {msg.attachedFiles?.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>
                            {msg.attachedFiles.map((f, i) =>
                              f.previewUrl ? (
                                <img
                                  key={i}
                                  src={f.previewUrl}
                                  alt={f.name}
                                  style={{ maxWidth: 220, maxHeight: 160, borderRadius: 10, border: `1px solid ${theme.border}`, display: "block" }}
                                />
                              ) : (
                                <div key={i} style={{
                                  display: "flex", alignItems: "center", gap: 6,
                                  background: theme.bgTertiary, border: `1px solid ${theme.border}`,
                                  borderRadius: 8, padding: "5px 10px", fontSize: 12, color: theme.textMuted,
                                  maxWidth: 200,
                                }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                  </svg>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                </div>
                              )
                            )}
                          </div>
                        )}
                        {msg.content && (
                          msg.isCode ? (
                            <div style={{ maxWidth: 560, width: "100%" }}>
                              <CodeBlock language={msg.codeLang || ""} value={msg.content} theme={theme} dark={dark} />
                            </div>
                          ) : msg.content.includes("```") ? (
                            <div style={{ ...s.bubbleUser, whiteSpace: undefined }} className="ai-prose">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <div style={s.bubbleUser}>{msg.content}</div>
                          )
                        )}
                        {msg.timestamp && (
                          <span className="msg-ts" style={{ fontSize: 10, color: theme.textMuted, paddingRight: 2 }}>
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", width: "100%", maxWidth: 640 }}>
                        {!msg.streaming && <ToolBadge tool={msg.tool} />}
                        <div
                          style={{
                            ...s.bubbleAi,
                            ...(msg.error ? {
                              background: "rgba(239,68,68,0.06)",
                              border: "1px solid rgba(239,68,68,0.2)",
                              borderRadius: 10,
                              padding: "10px 14px",
                              color: "#f87171",
                            } : {}),
                          }}
                          className={msg.streaming ? undefined : "ai-prose"}
                        >
                          {msg.streaming ? (
                            <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {msg.content}
                            </span>
                          ) : (
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                              {msg.content}
                            </ReactMarkdown>
                          )}
                        </div>
                        {!msg.streaming && msg.usage && (
                          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, fontFamily: "'SF Mono', monospace" }}>
                            {msg.usage.input_tokens.toLocaleString()} in · {msg.usage.output_tokens.toLocaleString()} out tokens · est. ${msg.usage.cost_usd.toFixed(4)}
                          </div>
                        )}
                        {!msg.streaming && <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                          <CopyButton text={msg.content} theme={theme} />
                          {msg.timestamp && (
                            <span className="msg-ts" style={{ fontSize: 10, color: theme.textMuted, marginLeft: 2 }}>
                              {formatTimestamp(msg.timestamp)}
                            </span>
                          )}
                          {msg.hasPreview && (
                            <button
                              onClick={() => setPreviewHtml(wrapHtml(extractHtml(msg.content)))}
                              style={{
                                background: "none", border: `1px solid ${theme.accent}`,
                                borderRadius: 6, cursor: "pointer", padding: "3px 8px",
                                fontSize: 11, color: theme.accent,
                              }}
                            >Show Preview</button>
                          )}
                          {msg.error && msg.retryPayload && (
                            <button
                              onClick={() => retryMessage(i)}
                              disabled={loading}
                              style={{
                                display: "flex", alignItems: "center", gap: 4,
                                background: "none", border: "1px solid rgba(239,68,68,0.4)",
                                borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
                                padding: "3px 8px", fontSize: 11, color: "#f87171",
                                opacity: loading ? 0.5 : 1,
                              }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.8"/>
                              </svg>
                              Retry
                            </button>
                          )}
                        </div>}
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div style={s.rowAi}>
                    <div style={s.thinking}>
                      <div style={{ ...s.thinkingDot, animationDelay: "0s" }} />
                      <div style={{ ...s.thinkingDot, animationDelay: "0.2s" }} />
                      <div style={{ ...s.thinkingDot, animationDelay: "0.4s" }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Scroll-to-bottom button */}
            {showScrollBtn && (
              <button
                onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  position: "absolute",
                  bottom: 90,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: theme.bgSecondary,
                  border: `1px solid ${theme.border}`,
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                  zIndex: 10,
                  color: theme.textMuted,
                  transition: "opacity 0.15s ease",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            )}

            {/* Input */}
            <div ref={inputWrapRef} style={{ ...s.inputWrap, opacity: expanded ? 0 : 1, pointerEvents: expanded ? "none" : "auto", transition: "opacity 0.15s ease" }}>
              <div style={{
                ...s.inputInner,
                ...(codeMode ? {
                  background: theme.codeBlockBg,
                  border: `1px solid ${theme.codeBlockBorder}`,
                  borderRadius: 10,
                } : {}),
              }} className="input-inner">
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                  {/* Code mode badge */}
                  {codeMode && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 500, letterSpacing: "0.06em",
                        textTransform: "uppercase", color: theme.accent,
                        border: `1px solid ${theme.accent}`, borderRadius: 4,
                        padding: "1px 6px", opacity: 0.8,
                      }}>{codeLang ? codeLang : "code"}</span>
                      <span style={{ fontSize: 11, color: theme.textMuted }}>Ctrl+Enter to send · Esc to exit</span>
                    </div>
                  )}
                  {/* Attachment previews */}
                  {attachments.length > 0 && (
                    <div style={s.attachStrip}>
                      {attachments.map((file, i) => {
                        const isImage = file.type.startsWith("image/")
                        const url = isImage ? URL.createObjectURL(file) : null
                        return (
                          <div key={i} style={s.attachChip}>
                            {isImage
                              ? <img src={url} style={s.attachThumb} alt={file.name} onLoad={() => url && URL.revokeObjectURL(url)} />
                              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            }
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                            <button
                              style={s.attachRemove}
                              onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                            >×</button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder={codeMode ? "Paste or type code…" : "Message..."}
                    style={{
                      ...s.textarea,
                      ...(codeMode ? {
                        fontFamily: "'SF Mono', 'Fira Code', monospace",
                        fontSize: 13,
                      } : {}),
                    }}
                    onChange={(e) => {
                      let val = e.target.value
                      if (val.startsWith("```")) {
                        const afterTicks = val.slice(3)
                        if (!codeMode) {
                          // Parse optional language identifier before first newline/space
                          const m = afterTicks.match(/^([a-zA-Z0-9+#._-]*)\n?([\s\S]*)$/)
                          const lang = (m?.[1] || "").trim()
                          const code = m?.[2] || ""
                          setCodeMode(true)
                          setCodeLang(lang)
                          val = code
                        } else {
                          val = afterTicks
                        }
                        e.target.value = val
                      } else if (codeMode && val === "") {
                        setCodeMode(false)
                        setCodeLang("")
                      }
                      historyIdxRef.current = -1
                      promptRef.current = val
                      setHasInput(prev => {
                        const next = val.length > 0
                        return prev === next ? prev : next
                      })
                      e.target.style.height = "auto"
                      e.target.style.height = e.target.scrollHeight + "px"
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape" && codeMode) {
                        setCodeMode(false)
                        setCodeLang("")
                        return
                      }
                      if (!codeMode && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
                        const hist = inputHistoryRef.current
                        if (hist.length === 0) return
                        e.preventDefault()
                        let nextIdx
                        if (e.key === "ArrowUp") {
                          if (historyIdxRef.current === -1) savedDraftRef.current = promptRef.current
                          nextIdx = Math.min(historyIdxRef.current + 1, hist.length - 1)
                        } else {
                          if (historyIdxRef.current === -1) return
                          nextIdx = historyIdxRef.current - 1
                        }
                        historyIdxRef.current = nextIdx
                        const val = nextIdx === -1 ? savedDraftRef.current : hist[hist.length - 1 - nextIdx]
                        promptRef.current = val
                        if (textareaRef.current) {
                          textareaRef.current.value = val
                          textareaRef.current.style.height = "auto"
                          textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
                        }
                        setHasInput(val.length > 0)
                        return
                      }
                      if (e.key === "Enter") {
                        if (codeMode) {
                          if (e.ctrlKey || e.metaKey) { e.preventDefault(); sendPrompt() }
                          // else: allow natural newline
                        } else {
                          if (!e.shiftKey) { e.preventDefault(); sendPrompt() }
                        }
                      }
                    }}
                    onPaste={(e) => {
                      const items = e.clipboardData?.items
                      if (!items) return
                      for (const item of items) {
                        if (item.type.startsWith("image/")) {
                          const file = item.getAsFile()
                          if (file) setAttachments(prev => [...prev, file])
                        }
                      }
                    }}
                  />
                </div>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.txt,.md,.csv,.json,.xml,.py,.js,.ts,.html,.css,.yaml,.yml,.log"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const picked = Array.from(e.target.files || [])
                    setAttachments(prev => [...prev, ...picked])
                    e.target.value = ""
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  style={s.attachBtn}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <button
                  onClick={() => setExpanded(true)}
                  title="Expand input"
                  style={s.attachBtn}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </button>
                {loading ? (
                  <button
                    onClick={stopGeneration}
                    title="Stop generation"
                    style={{ ...s.sendBtn, background: theme.bgTertiary, border: `1px solid ${theme.border}` }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={theme.text}>
                      <rect x="4" y="4" width="16" height="16" rx="2"/>
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={sendPrompt}
                    disabled={!hasInput && attachments.length === 0}
                    style={{ ...s.sendBtn, opacity: (!hasInput && attachments.length === 0) ? 0.3 : 1 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5"/>
                      <polyline points="5 12 12 5 19 12"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Preview panel */}
          {previewHtml && (
            <div style={s.previewPanel}>
              <div style={s.previewHeader}>
                <div style={s.previewDot} />
                <span style={s.previewTitle}>Preview</span>
                <button style={s.previewClose} onClick={() => setPreviewHtml(null)}>✕</button>
              </div>
              <iframe
                key={previewHtml}
                srcDoc={previewHtml}
                style={{ flex: 1, border: "none", width: "100%" }}
                sandbox="allow-scripts"
                title="Preview"
              />
            </div>
          )}

        </div>
      </div>

      {/* Expanded input modal */}
      {expanded && (
        <div
          onClick={() => {
            promptRef.current = modalTextareaRef.current?.value ?? promptRef.current
            const ta = textareaRef.current
            if (ta) {
              ta.value = promptRef.current
              ta.style.height = "auto"
              ta.style.height = Math.min(ta.scrollHeight, 180) + "px"
            }
            setExpanded(false)
          }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "62%", height: "55%",
              background: codeMode ? theme.codeBlockBg : theme.bgSecondary,
              border: codeMode ? `1px solid ${theme.codeBlockBorder}` : `1px solid ${theme.border}`,
              borderRadius: 16,
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", borderBottom: `1px solid ${codeMode ? theme.codeBlockBorder : theme.border}`, flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: theme.textMuted }}>Message</span>
                {codeMode && (
                  <span style={{
                    fontSize: 10, fontWeight: 500, letterSpacing: "0.06em",
                    textTransform: "uppercase", color: theme.accent,
                    border: `1px solid ${theme.accent}`, borderRadius: 4,
                    padding: "1px 6px", opacity: 0.8,
                  }}>{codeLang ? codeLang : "code"}</span>
                )}
              </div>
              <button
                onClick={() => {
                  promptRef.current = modalTextareaRef.current?.value ?? promptRef.current
                  const ta = textareaRef.current
                  if (ta) {
                    ta.value = promptRef.current
                    ta.style.height = "auto"
                    ta.style.height = Math.min(ta.scrollHeight, 180) + "px"
                  }
                  setExpanded(false)
                }}
                style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 18, lineHeight: 1, padding: "0 2px" }}
              >✕</button>
            </div>
            <textarea
              ref={modalTextareaRef}
              defaultValue={promptRef.current}
              autoFocus
              placeholder={codeMode ? "Paste or type code…" : "Message..."}
              style={{
                flex: 1, width: "100%", boxSizing: "border-box",
                background: "transparent", border: "none", outline: "none", resize: "none",
                color: theme.text, lineHeight: 1.6, padding: "14px 16px",
                ...(codeMode
                  ? { fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: 13 }
                  : { fontFamily: "inherit", fontSize: 14 }),
              }}
              onChange={e => {
                let val = e.target.value
                if (val.startsWith("```")) {
                  const afterTicks = val.slice(3)
                  if (!codeMode) {
                    const m = afterTicks.match(/^([a-zA-Z0-9+#._-]*)\n?([\s\S]*)$/)
                    const lang = (m?.[1] || "").trim()
                    const code = m?.[2] || ""
                    setCodeMode(true)
                    setCodeLang(lang)
                    val = code
                  } else {
                    val = afterTicks
                  }
                  e.target.value = val
                } else if (codeMode && val === "") {
                  setCodeMode(false)
                  setCodeLang("")
                }
                promptRef.current = val
                setHasInput(prev => {
                  const next = val.length > 0
                  return prev === next ? prev : next
                })
              }}
              onKeyDown={e => {
                if (e.key === "Escape") {
                  if (codeMode) { setCodeMode(false); setCodeLang(""); return }
                  promptRef.current = e.target.value
                  const ta = textareaRef.current
                  if (ta) {
                    ta.value = promptRef.current
                    ta.style.height = "auto"
                    ta.style.height = Math.min(ta.scrollHeight, 180) + "px"
                  }
                  setExpanded(false)
                }
                if (e.key === "Enter") {
                  if (codeMode) {
                    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setExpanded(false); sendPrompt() }
                  } else {
                    if (!e.shiftKey) { e.preventDefault(); setExpanded(false); sendPrompt() }
                  }
                }
              }}
            />
            <div style={{
              display: "flex", justifyContent: "flex-end",
              padding: "10px 14px", borderTop: `1px solid ${theme.border}`, flexShrink: 0, gap: 8,
            }}>
              <span style={{ fontSize: 11, color: theme.textMuted, alignSelf: "center" }}>
                {codeMode ? "Ctrl+Enter to send · Esc to exit code mode" : "Shift+Enter for new line · Enter to send"}
              </span>
              {loading ? (
                <button
                  onClick={stopGeneration}
                  title="Stop generation"
                  style={{ ...s.sendBtn, background: theme.bgTertiary, border: `1px solid ${theme.border}` }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={theme.text}>
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => { setExpanded(false); sendPrompt() }}
                  disabled={!hasInput && attachments.length === 0}
                  style={{ ...s.sendBtn, opacity: (!hasInput && attachments.length === 0) ? 0.3 : 1 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin panel */}
      {showAdminPanel && isAdmin && (
        <div
          onClick={() => setShowAdminPanel(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 820, height: 560, background: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: 16, display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>Admin Panel</span>
              <button onClick={() => setShowAdminPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 18, lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              {/* Left: user list */}
              <div style={{ width: 220, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
                <div style={{ padding: "10px 12px 6px", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.textMuted }}>
                  Users ({adminUsers.length})
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {adminUsers.map(u => (
                    <div
                      key={u.id}
                      onClick={() => adminSelectUser(u)}
                      style={{
                        padding: "8px 12px", cursor: "pointer", fontSize: 13,
                        background: adminSelectedUser?.id === u.id ? theme.bgTertiary : "transparent",
                        borderLeft: adminSelectedUser?.id === u.id ? `2px solid ${theme.accent}` : "2px solid transparent",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</div>
                        <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 1 }}>
                          {u.session_count} chats · {u.personality_count} personalities{u.is_admin ? " · admin" : ""}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); adminDeleteUser(u.id) }}
                        title="Delete user"
                        style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 15, lineHeight: 1, flexShrink: 0, padding: "0 2px" }}
                      >×</button>
                    </div>
                  ))}
                </div>
                <div style={{ padding: 10, borderTop: `1px solid ${theme.border}` }}>
                  {adminAddingUser ? (
                    <form onSubmit={adminCreateUser} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <input
                        autoFocus
                        placeholder="Username"
                        value={adminNewUsername}
                        onChange={e => setAdminNewUsername(e.target.value)}
                        style={{ ...s.authInput, fontSize: 12, padding: "5px 8px" }}
                        className="auth-input"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={adminNewPassword}
                        onChange={e => setAdminNewPassword(e.target.value)}
                        style={{ ...s.authInput, fontSize: 12, padding: "5px 8px" }}
                        className="auth-input"
                      />
                      {adminError && <div style={{ fontSize: 11, color: "#f87171" }}>{adminError}</div>}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button type="submit" style={{ ...s.authSubmitBtn, flex: 1, marginTop: 0, padding: "5px", fontSize: 12 }}>Create</button>
                        <button type="button" onClick={() => { setAdminAddingUser(false); setAdminError("") }} style={{ padding: "5px 10px", background: "none", border: `1px solid ${theme.border}`, borderRadius: 6, color: theme.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => { setAdminAddingUser(true); setAdminError("") }}
                      style={{ ...s.newChatBtn, fontSize: 12, padding: "6px 10px" }}
                      className="new-chat-btn"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add user
                    </button>
                  )}
                </div>
              </div>

              {/* Right: selected user detail or session viewer */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {adminSelectedUser ? (
                  adminViewingSession ? (
                    <>
                      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          onClick={() => { setAdminViewingSession(null); setAdminSessionMessages([]) }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: theme.accent, fontSize: 12, fontFamily: "inherit", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                          {adminSelectedUser.username}
                        </button>
                        <span style={{ color: theme.textMuted, fontSize: 12 }}>·</span>
                        <span style={{ fontSize: 13, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminViewingSession.title}</span>
                      </div>
                      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
                        {adminSessionMessages.length === 0
                          ? <div style={{ fontSize: 12, color: theme.textMuted }}>No messages</div>
                          : adminSessionMessages.map((m, i) => (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start" }}>
                              <div style={{ fontSize: 10, color: theme.textMuted, marginBottom: 3 }}>
                                {m.role === "user" ? adminSelectedUser.username : `AI${m.tool && m.tool !== "ai" ? ` · ${m.tool}` : ""}`}
                                {m.created_at ? ` · ${formatTimestamp(m.created_at)}` : ""}
                              </div>
                              <div style={{
                                maxWidth: "80%", fontSize: 13, lineHeight: 1.6, wordBreak: "break-word",
                                padding: "8px 12px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                                background: m.role === "user" ? theme.bgTertiary : "transparent",
                                border: m.role === "user" ? `1px solid ${theme.border}` : "none",
                                color: m.error ? "#f87171" : theme.text,
                                whiteSpace: "pre-wrap",
                              }}>
                                {m.content}
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>{adminSelectedUser.username}</span>
                          {adminSelectedUser.is_admin && <span style={{ marginLeft: 8, fontSize: 10, color: theme.accent, border: `1px solid ${theme.accent}`, borderRadius: 4, padding: "1px 5px" }}>admin</span>}
                          <span style={{ marginLeft: 10, fontSize: 11, color: theme.textMuted }}>
                            Joined {adminSelectedUser.created_at ? new Date(adminSelectedUser.created_at).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <button
                          onClick={() => adminDeleteUser(adminSelectedUser.id)}
                          style={{ fontSize: 12, padding: "4px 10px", background: "none", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 6, color: "#f87171", cursor: "pointer", fontFamily: "inherit" }}
                        >Delete user</button>
                      </div>
                      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
                        {/* Sessions */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: theme.textMuted, marginBottom: 8 }}>
                            Chat Sessions ({adminSessions.length})
                          </div>
                          {adminSessions.length === 0
                            ? <div style={{ fontSize: 12, color: theme.textMuted }}>No sessions</div>
                            : adminSessions.map(s => (
                              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
                                <div
                                  onClick={() => adminViewSession(s)}
                                  style={{ cursor: "pointer", flex: 1, minWidth: 0 }}
                                >
                                  <div style={{ fontSize: 13, color: theme.accent, textDecoration: "underline", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
                                  <div style={{ fontSize: 10, color: theme.textMuted }}>{s.message_count} messages · {s.updated_at ? new Date(s.updated_at).toLocaleDateString() : ""}</div>
                                </div>
                                <button
                                  onClick={() => adminDeleteSession(adminSelectedUser.id, s.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 15, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}
                                >×</button>
                              </div>
                            ))
                          }
                        </div>
                        {/* Personalities */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: theme.textMuted, marginBottom: 8 }}>
                            Personalities ({adminPersonalities.length})
                          </div>
                          {adminPersonalities.length === 0
                            ? <div style={{ fontSize: 12, color: theme.textMuted }}>No personalities</div>
                            : adminPersonalities.map(p => (
                              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
                                <div>
                                  <div style={{ fontSize: 13, color: theme.text }}>{p.name}</div>
                                  <div style={{ fontSize: 10, color: theme.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 480 }}>{p.prompt}</div>
                                </div>
                                <button
                                  onClick={() => adminDeletePersonality(adminSelectedUser.id, p.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 15, lineHeight: 1, padding: "0 4px" }}
                                >×</button>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </>
                  )
                ) : (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontSize: 13 }}>
                    Select a user to view details
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personality manager modal */}
      {showPersonalityModal && (
        <div
          onClick={() => setShowPersonalityModal(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 680, height: 480, background: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: 16, display: "flex", overflow: "hidden" }}
          >
            {/* Left — personality list */}
            <div style={{ width: 210, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "14px 14px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: theme.textMuted }}>
                Personalities
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {personalities.map(p => (
                  <div
                    key={p.id}
                    onClick={() => { setEditingId(p.id); setDraftName(p.name); setDraftPrompt(p.prompt) }}
                    style={{
                      padding: "8px 14px", cursor: "pointer", fontSize: 13,
                      background: editingId === p.id ? theme.bgTertiary : "transparent",
                      color: editingId === p.id ? theme.text : theme.textMuted,
                      borderLeft: editingId === p.id ? `2px solid ${theme.accent}` : "2px solid transparent",
                    }}
                  >
                    {p.name}
                  </div>
                ))}
              </div>
              <div style={{ padding: 10, borderTop: `1px solid ${theme.border}` }}>
                <button
                  onClick={() => {
                    setEditingId("new")
                    setDraftName("New Personality")
                    setDraftPrompt("")
                  }}
                  style={{ ...s.newChatBtn, fontSize: 12, padding: "6px 10px" }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  New
                </button>
              </div>
            </div>

            {/* Right — editor */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, flexShrink: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>Edit Personality</span>
                <button onClick={() => setShowPersonalityModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textMuted, fontSize: 18, lineHeight: 1 }}>✕</button>
              </div>

              {editingId ? (
                <>
                  <div style={{ padding: "14px 16px 0", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>Name</div>
                    <input
                      value={draftName}
                      onChange={e => setDraftName(e.target.value)}
                      style={{ ...s.authInput, marginBottom: 0 }}
                      className="auth-input"
                    />
                  </div>
                  <div style={{ flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", minHeight: 0 }}>
                    <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>System prompt</div>
                    <textarea
                      value={draftPrompt}
                      onChange={e => setDraftPrompt(e.target.value)}
                      placeholder="Describe how the AI should behave…"
                      style={{
                        flex: 1, resize: "none", background: theme.bgTertiary,
                        border: `1px solid ${theme.border}`, borderRadius: 8,
                        color: theme.text, fontSize: 13, lineHeight: 1.6,
                        fontFamily: "inherit", padding: "10px 12px", outline: "none",
                      }}
                      className="auth-input"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, padding: "0 16px 14px", flexShrink: 0 }}>
                    <button
                      onClick={async () => {
                        const name = draftName.trim() || "Unnamed"
                        if (editingId === "new") {
                          const res = await fetch(`${API}/personalities`, {
                            method: "POST",
                            headers: authHeaders(),
                            body: JSON.stringify({ name, prompt: draftPrompt }),
                          })
                          if (res.ok) {
                            const created = await res.json()
                            setPersonalities(prev => [...prev, created])
                            setActivePersonalityId(created.id)
                          }
                        } else {
                          const res = await fetch(`${API}/personalities/${editingId}`, {
                            method: "PUT",
                            headers: authHeaders(),
                            body: JSON.stringify({ name, prompt: draftPrompt }),
                          })
                          if (res.ok) {
                            const updated = await res.json()
                            setPersonalities(prev => prev.map(p => p.id === editingId ? updated : p))
                            setActivePersonalityId(editingId)
                          }
                        }
                        setShowPersonalityModal(false)
                      }}
                      style={{ ...s.authSubmitBtn, flex: 1, marginTop: 0, padding: "8px" }}
                    >Save & use</button>
                    {personalities.length > 1 && editingId !== "new" && (
                      <button
                        onClick={async () => {
                          await fetch(`${API}/personalities/${editingId}`, {
                            method: "DELETE",
                            headers: authHeaders(),
                          })
                          const remaining = personalities.filter(p => p.id !== editingId)
                          setPersonalities(remaining)
                          const next = remaining[0]
                          setEditingId(next.id)
                          setDraftName(next.name)
                          setDraftPrompt(next.prompt)
                          if (activePersonalityId === editingId) setActivePersonalityId(next.id)
                        }}
                        style={{ padding: "8px 14px", background: "none", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 8, color: "#f87171", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
                      >Delete</button>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textMuted, fontSize: 13 }}>
                  Select a personality to edit
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}