import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Ana Sayfa',
    testId: 'dashboard-link',
    icon: <span className="text-lg leading-none">🏠</span>,
  },
  {
    to: '/log',
    label: 'Kayıt',
    testId: 'log-link',
    icon: <span className="text-lg leading-none">📋</span>,
  },
  {
    to: '/progress',
    label: 'İlerleme',
    testId: 'progress-link',
    icon: <span className="text-lg leading-none">📈</span>,
  },
  {
    to: '/settings',
    label: 'Ayarlar',
    testId: 'settings-link',
    icon: <span className="text-lg leading-none">⚙️</span>,
  },
]

function BottomTabBar() {
  const location = useLocation()

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.to}
              to={item.to}
              data-testid={item.testId}
              className="flex flex-col items-center justify-center flex-1 py-2 transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-muted)',
                minWidth: 0,
              }}
            >
              {item.icon}
              <span className="text-xs mt-0.5 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function Sidebar({ open, onClose }) {
  const location = useLocation()

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className="fixed left-0 top-0 h-full w-64 z-50 transition-transform duration-300 md:translate-x-0 md:z-30"
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 style={{ color: 'var(--text-heading)', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Antrenman Takip
          </h1>
        </div>
        <nav className="flex flex-col py-3">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={item.testId}
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text)',
                  background: active ? 'var(--accent)' + '10' : 'transparent',
                }}
              >
                {item.icon}
                {item.label === 'Kayıt' ? 'Antrenman Kaydet' : item.label}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-64">
        <header
          className="hidden md:flex items-center justify-between px-6 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text)' }}
            aria-label="Kenar çubuğunu aç/kapat"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
            </svg>
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>Antrenman Takip</h1>
          <div className="w-9" />
        </header>

        <main className="p-4 pb-24 md:p-8 md:pb-8">
          {children}
        </main>
      </div>

      <BottomTabBar />
    </div>
  )
}
