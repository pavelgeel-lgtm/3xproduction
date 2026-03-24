import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, Package, Grid3x3,
  Users, FileText, Handshake, BarChart2, Bell,
  User, X, Menu, ChevronDown, LogOut, Clock
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  {
    section: 'Склад',
    items: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Главная' },
      { to: '/requests',   icon: ClipboardList,   label: 'Заявки',     badge: true },
      { to: '/units',      icon: Package,          label: 'Склад' },
      { to: '/cells',      icon: Grid3x3,          label: 'Карта ячеек' },
      { to: '/team',       icon: Users,            label: 'Команда' },
      { to: '/approvals',  icon: Clock,            label: 'На утверждении' },
    ],
  },
  {
    section: 'Финансы',
    items: [
      { to: '/acts',  icon: FileText,  label: 'Акты' },
      { to: '/rent',  icon: Handshake, label: 'Аренда' },
    ],
  },
  {
    section: 'Аналитика',
    items: [
      { to: '/analytics', icon: BarChart2, label: 'Отчёты' },
    ],
  },
]

const MOBILE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { to: '/requests',  icon: ClipboardList,   label: 'Заявки' },
  { to: '/units',     icon: Package,          label: 'Склад' },
  { to: '/analytics', icon: BarChart2,        label: 'Отчёты' },
]

const MOBILE_BURGER = [
  { to: '/cells',      icon: Grid3x3,   label: 'Карта ячеек' },
  { to: '/team',       icon: Users,     label: 'Команда' },
  { to: '/acts',       icon: FileText,  label: 'Акты' },
  { to: '/rent',       icon: Handshake, label: 'Аренда' },
  { to: '/notifications', icon: Bell,  label: 'Уведомления' },
  { to: '/profile',    icon: User,      label: 'Профиль' },
]

const css = `
/* ── Layout ── */
.wl-root { display: flex; min-height: 100vh; background: var(--bg); }

/* ── Sidebar ── */
.wl-sidebar {
  width: 240px;
  background: var(--sidebar-bg);
  color: var(--sidebar-text);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  border-right: 1px solid rgba(255,255,255,0.06);
}
.wl-logo {
  padding: 22px 20px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.wl-logo-title { font-size: 19px; font-weight: 600; letter-spacing: -0.02em; cursor: pointer; }
.wl-logo-sub { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--sidebar-muted); margin-top: 2px; }

.wl-warehouse {
  padding: 12px 12px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: relative;
}
.wl-warehouse-btn {
  width: 100%; padding: 7px 10px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: var(--sidebar-text);
  font-size: 12px; cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
  font-family: inherit;
}
.wl-warehouse-btn:hover { background: rgba(255,255,255,0.10); }
.wl-warehouse-dd {
  position: absolute; top: calc(100% - 8px); left: 12px; right: 12px;
  background: #252525; border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px; overflow: hidden; z-index: 200;
}
.wl-warehouse-opt {
  padding: 9px 12px; font-size: 12px; color: rgba(255,255,255,0.85);
  cursor: pointer; display: block; width: 100%; text-align: left;
  background: none; border: none; font-family: inherit;
}
.wl-warehouse-opt:hover { background: rgba(255,255,255,0.08); }
.wl-warehouse-opt.sel { color: var(--accent); }

.wl-nav { flex: 1; overflow-y: auto; padding: 8px 10px; }
.wl-section-label {
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--sidebar-muted);
  padding: 12px 10px 4px;
}
.wl-nav-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px; border-radius: 8px; margin-bottom: 1px;
  color: var(--sidebar-text);
  font-size: 13.5px; font-weight: 450;
  text-decoration: none;
  transition: background 0.12s, color 0.12s;
  position: relative;
}
.wl-nav-item:hover { background: var(--sidebar-hover-bg); color: #fff; }
.wl-nav-item.active { background: var(--sidebar-active-bg); color: var(--sidebar-active-text); }
.wl-nav-badge {
  margin-left: auto;
  background: var(--accent);
  color: #fff;
  font-size: 10px; font-weight: 600;
  padding: 1px 6px; border-radius: 10px;
}

.wl-profile {
  padding: 12px 12px 18px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.wl-profile-inner {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 9px;
  cursor: pointer;
  transition: background 0.12s;
}
.wl-profile-inner:hover { background: var(--sidebar-hover-bg); }
.wl-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; color: #fff;
  flex-shrink: 0;
}
.wl-profile-name { font-size: 13px; font-weight: 500; }
.wl-profile-role { font-size: 11px; color: var(--sidebar-muted); margin-top: 1px; }

/* ── Main ── */
.wl-main { margin-left: 240px; flex: 1; min-height: 100vh; }

/* ── Mobile top bar ── */
.wl-topbar {
  display: none;
  position: fixed; top: 0; left: 0; right: 0; height: 52px;
  background: var(--sidebar-bg);
  color: #fff;
  align-items: center; justify-content: space-between;
  padding: 0 16px;
  z-index: 200;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.wl-topbar-logo { font-size: 16px; font-weight: 600; }
.wl-topbar-btn {
  width: 36px; height: 36px; border-radius: 9px;
  background: rgba(255,255,255,0.08);
  border: none; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}

/* ── Mobile bottom nav ── */
.wl-mobile-nav {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--white);
  border-top: 1px solid var(--border);
  z-index: 200;
  padding: 6px 0 max(6px, env(safe-area-inset-bottom));
}
.wl-mobile-nav-inner { display: flex; justify-content: space-around; }
.wl-mobile-nav-item {
  display: flex; flex-direction: column; align-items: center;
  gap: 3px; padding: 4px 12px;
  font-size: 10px; font-weight: 500;
  color: var(--muted); text-decoration: none;
  border: none; background: none; cursor: pointer;
  transition: color 0.12s;
}
.wl-mobile-nav-item.active, .wl-mobile-nav-item:hover { color: var(--accent); }

/* ── Drawer (burger) ── */
.wl-drawer-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(2px);
}
.wl-drawer {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: var(--white);
  border-radius: 18px 18px 0 0;
  padding: 8px 16px max(20px, env(safe-area-inset-bottom));
  max-height: 80vh;
  overflow-y: auto;
}
.wl-drawer-handle {
  width: 36px; height: 4px; border-radius: 4px;
  background: var(--border-strong);
  margin: 8px auto 16px;
}
.wl-drawer-title { font-size: 13px; font-weight: 600; color: var(--muted); margin-bottom: 8px; padding: 0 4px; }
.wl-drawer-item {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 4px;
  border-bottom: 1px solid var(--border);
  color: var(--text); font-size: 15px; font-weight: 450;
  text-decoration: none;
}
.wl-drawer-item:last-child { border-bottom: none; }
.wl-drawer-item-icon {
  width: 36px; height: 36px; border-radius: 9px;
  background: var(--bg-secondary);
  display: flex; align-items: center; justify-content: center;
  color: var(--accent);
  flex-shrink: 0;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .wl-sidebar   { display: none !important; }
  .wl-main      { margin-left: 0 !important; padding-top: 52px; padding-bottom: 72px; }
  .wl-topbar    { display: flex !important; }
  .wl-mobile-nav { display: block !important; }
}

/* 769–1024px: compact sidebar */
@media (min-width: 769px) and (max-width: 1024px) {
  .wl-sidebar { width: 200px; }
  .wl-main    { margin-left: 200px; }
  .wl-logo-title { font-size: 15px; }
  .wl-nav-item { font-size: 13px; padding: 7px 8px; }
  .wl-section-label { font-size: 9px; }
}

/* 1024–1280px: normal sidebar, slightly tighter */
@media (min-width: 1025px) and (max-width: 1280px) {
  .wl-sidebar { width: 220px; }
  .wl-main    { margin-left: 220px; }
}

/* 1280px+: full sidebar */
@media (min-width: 1281px) {
  .wl-sidebar { width: 240px; }
  .wl-main    { margin-left: 240px; }
}

/* 1440px+: wider content breathing room */
@media (min-width: 1440px) {
  .wl-main { padding-left: 8px; }
}
`

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const WAREHOUSES = ['Все склады', 'Вирки 22', 'Чапаева 6']

export default function WarehouseLayout({ children }) {
  const [burger, setBurger] = useState(false)
  const [whOpen, setWhOpen] = useState(false)
  const [selectedWh, setSelectedWh] = useState(() => localStorage.getItem('warehouse') || 'Все склады')
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function selectWarehouse(w) {
    localStorage.setItem('warehouse', w)
    setSelectedWh(w)
    setWhOpen(false)
    window.location.reload()
  }

  return (
    <>
      <style>{css}</style>
      <div className="wl-root">

        {/* Desktop Sidebar */}
        <aside className="wl-sidebar">
          <div className="wl-logo" onClick={() => navigate('/dashboard')}>
            <div className="wl-logo-title">
              <span style={{ color: 'var(--accent)' }}>3X</span>Media
            </div>
            <div className="wl-logo-sub">Production</div>
          </div>

          <div className="wl-warehouse">
            <button className="wl-warehouse-btn" onClick={() => setWhOpen(o => !o)}>
              <span>{selectedWh}</span>
              <ChevronDown size={12} style={{ transform: whOpen ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
            </button>
            {whOpen && (
              <div className="wl-warehouse-dd">
                {WAREHOUSES.map(w => (
                  <button key={w} className={`wl-warehouse-opt${selectedWh === w ? ' sel' : ''}`} onClick={() => selectWarehouse(w)}>{w}</button>
                ))}
              </div>
            )}
          </div>

          <nav className="wl-nav">
            {NAV.map(group => (
              <div key={group.section}>
                <div className="wl-section-label">{group.section}</div>
                {group.items.map(item => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => `wl-nav-item${isActive ? ' active' : ''}`}>
                    <item.icon size={16} strokeWidth={1.8} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="wl-profile">
            <div className="wl-profile-inner" onClick={() => navigate('/profile')}>
              <div className="wl-avatar">{getInitials(user?.name || 'ИП')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wl-profile-name truncate">{user?.name || 'Профиль'}</div>
                <div className="wl-profile-role truncate">{user?.role || ''}</div>
              </div>
              <User size={14} style={{ color: 'var(--sidebar-muted)', flexShrink: 0 }} />
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="wl-topbar">
          <div className="wl-topbar-logo">
            <span style={{ color: 'var(--accent)' }}>3X</span>Media
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="wl-topbar-btn" onClick={() => navigate('/notifications')}>
              <Bell size={18} />
            </button>
            <button className="wl-topbar-btn" onClick={() => setBurger(true)}>
              <Menu size={18} />
            </button>
          </div>
        </div>

        {/* Main content */}
        <main className="wl-main">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="wl-mobile-nav">
          <div className="wl-mobile-nav-inner">
            {MOBILE_NAV.map(item => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `wl-mobile-nav-item${isActive ? ' active' : ''}`}>
                <item.icon size={22} strokeWidth={1.8} />
                {item.label}
              </NavLink>
            ))}
            <button className="wl-mobile-nav-item" onClick={() => setBurger(true)}>
              <Menu size={22} strokeWidth={1.8} />
              Ещё
            </button>
          </div>
        </nav>

        {/* Drawer */}
        {burger && (
          <div className="wl-drawer-overlay" onClick={() => setBurger(false)}>
            <div className="wl-drawer" onClick={e => e.stopPropagation()}>
              <div className="wl-drawer-handle" />
              <div className="wl-drawer-title">Меню</div>
              {MOBILE_BURGER.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="wl-drawer-item"
                  onClick={() => setBurger(false)}
                >
                  <div className="wl-drawer-item-icon">
                    <item.icon size={18} strokeWidth={1.8} />
                  </div>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
