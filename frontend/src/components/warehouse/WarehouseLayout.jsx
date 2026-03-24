import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const NAV = [
  {
    section: 'Склад',
    items: [
      { to: '/dashboard',      icon: '⊞', label: 'Главная' },
      { to: '/requests',       icon: '📋', label: 'Запросы',    badge: 3 },
      { to: '/units',          icon: '📦', label: 'Остатки' },
      { to: '/cells',          icon: '🗂', label: 'Карта ячеек' },
      { to: '/team',           icon: '👥', label: 'Команда' },
    ],
  },
  {
    section: 'Финансы',
    items: [
      { to: '/acts',  icon: '📄', label: 'Акты' },
      { to: '/rent',  icon: '🤝', label: 'Аренда' },
    ],
  },
  {
    section: 'Аналитика',
    items: [
      { to: '/analytics', icon: '📊', label: 'Отчёты' },
    ],
  },
]

const MOBILE_NAV = [
  { to: '/dashboard',  icon: '⊞', label: 'Главная' },
  { to: '/requests',   icon: '📋', label: 'Запросы', badge: 3 },
  { to: '/analytics',  icon: '📊', label: 'Отчёты' },
  { to: '/profile',    icon: '👤', label: 'Профиль' },
]

const MOBILE_BURGER = [
  { to: '/units', label: 'Остатки' },
  { to: '/cells', label: 'Карта ячеек' },
  { to: '/team',  label: 'Команда' },
  { to: '/acts',  label: 'Акты' },
  { to: '/rent',  label: 'Аренда' },
]

export default function WarehouseLayout({ children }) {
  const [burger, setBurger] = useState(false)
  const navigate = useNavigate()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Desktop Sidebar */}
      <aside style={{
        width: 220, background: 'var(--black)', color: 'var(--white)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
      }} className="sidebar-desktop">
        {/* Logo */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            <span style={{ color: 'var(--blue)' }}>3X</span>Media
          </div>
          <div style={{ fontSize: 8, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            Production
          </div>
        </div>

        {/* Warehouse selector */}
        <div style={{ padding: '0 12px 16px' }}>
          <select style={{
            width: '100%', height: 34, padding: '0 10px',
            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: 'var(--white)', fontSize: 13, cursor: 'pointer',
          }}>
            <option>Все склады</option>
            <option>Вирки 22</option>
            <option>Чапаева 6</option>
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          {NAV.map(group => (
            <div key={group.section} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', padding: '8px 12px 4px' }}>
                {group.section}
              </div>
              {group.items.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          ))}
        </nav>

        {/* Profile */}
        <div style={{ padding: '12px 12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => navigate('/profile')}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--blue)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 13, fontWeight: 600,
            }}>ИП</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Иван Петров</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Директор склада</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh' }} className="main-desktop">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--white)', borderTop: '1px solid var(--border)',
        zIndex: 200, padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      }} className="mobile-nav">
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {MOBILE_NAV.map(item => (
            <NavLink key={item.to} to={item.to} style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '4px 12px', fontSize: 10, fontWeight: 500,
              color: isActive ? 'var(--blue)' : 'var(--muted)',
              textDecoration: 'none',
            })}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
              {item.badge ? (
                <span style={{
                  position: 'absolute', marginTop: -4, marginLeft: 14,
                  background: 'var(--red)', color: '#fff', borderRadius: 8,
                  fontSize: 10, padding: '1px 5px', fontWeight: 600,
                }}>{item.badge}</span>
              ) : null}
            </NavLink>
          ))}
          <button onClick={() => setBurger(true)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '4px 12px', fontSize: 10, fontWeight: 500,
            color: 'var(--muted)', background: 'none', border: 'none',
          }}>
            <span style={{ fontSize: 20 }}>☰</span>
            Ещё
          </button>
        </div>
      </nav>

      {/* Burger menu overlay */}
      {burger && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.4)',
        }} onClick={() => setBurger(false)}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--white)', borderRadius: '16px 16px 0 0',
            padding: 24,
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Меню</div>
            {MOBILE_BURGER.map(item => (
              <NavLink key={item.to} to={item.to}
                onClick={() => setBurger(false)}
                style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--border)', color: 'var(--text)', fontWeight: 500, textDecoration: 'none' }}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .main-desktop { margin-left: 0 !important; padding-bottom: 72px; }
          .mobile-nav { display: block !important; }
        }
      `}</style>
    </div>
  )
}

function NavItem({ to, icon, label, badge }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 8, marginBottom: 2,
      background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
      color: isActive ? 'var(--white)' : 'rgba(255,255,255,0.55)',
      textDecoration: 'none', fontSize: 14, fontWeight: 500,
      transition: 'background 0.15s',
    })}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge ? (
        <span style={{
          background: 'var(--red)', color: '#fff', borderRadius: 10,
          fontSize: 11, padding: '1px 7px', fontWeight: 600,
        }}>{badge}</span>
      ) : null}
    </NavLink>
  )
}
