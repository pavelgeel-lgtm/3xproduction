import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { units as unitsApi, requests as requestsApi } from '../../services/api'
import { useNotifications } from '../../hooks/useNotifications'

const CELL_COLORS = {
  free:     { bg: 'var(--bg)', border: '1px solid var(--border)' },
  occupied: { bg: 'var(--blue-dim)', border: '1px solid rgba(30,157,218,0.2)' },
  overdue:  { bg: 'var(--red-dim)',  border: '1px solid rgba(220,38,38,0.2)' },
  pending:  { bg: 'var(--amber-dim)',border: '1px solid rgba(217,119,6,0.2)' },
}

const TYPE_DOT = {
  overdue:     'red',
  damage:      'amber',
  new_request: 'blue',
  new_version: 'blue',
}

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)    return 'только что'
  if (diff < 3600)  return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} д назад`
}

const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export default function DashboardPage() {
  const navigate = useNavigate()
  const { items: notifs, unreadCount } = useNotifications()
  const [stats, setStats] = useState({ on_stock: 0, issued: 0, overdue: 0, pending: 0 })
  const [reqs, setReqs] = useState([])

  useEffect(() => {
    unitsApi.list().then(data => {
      const us = data.units || []
      setStats({
        on_stock: us.filter(u => u.status === 'on_stock').length,
        issued:   us.filter(u => u.status === 'issued').length,
        overdue:  us.filter(u => u.status === 'overdue').length,
        pending:  us.filter(u => u.status === 'pending').length,
      })
    }).catch(() => {})

    requestsApi.list({ status: 'new' }).then(data => {
      setReqs((data.requests || []).slice(0, 4))
    }).catch(() => {})
  }, [])

  const STATS = [
    { label: 'На складе',      value: stats.on_stock, color: 'green', icon: '📦' },
    { label: 'Выдано',         value: stats.issued,   color: 'blue',  icon: '🔄' },
    { label: 'Просрочено',     value: stats.overdue,  color: 'red',   icon: '⚠️' },
    { label: 'На утверждении', value: stats.pending,  color: 'amber', icon: '⏳' },
  ]

  return (
    <WarehouseLayout>
      <div style={{ padding: '28px 32px', maxWidth: 1100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>Главная</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Обзор склада · {today}</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => navigate('/units/new')}>+ Добавить единицу</Button>
            <NotificationBell count={unreadCount} onClick={() => navigate('/notifications')} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <Card title="Запросы от проектов" action={{ label: 'Все запросы', to: '/requests' }} navigate={navigate}>
            {reqs.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>Нет новых запросов</div>
            )}
            {reqs.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Запрос #{r.id}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                    {(r.unit_ids || []).length} ед. · {r.notes || ''}
                  </div>
                </div>
                <Button variant="secondary" style={{ height: 32, fontSize: 13, padding: '0 12px' }}
                  onClick={() => navigate(`/issue/${r.id}`)}>
                  Выдать
                </Button>
              </div>
            ))}
          </Card>

          <Card title="Уведомления" action={{ label: 'Все', to: '/notifications' }} navigate={navigate}>
            {notifs.slice(0, 4).map(n => (
              <div key={n.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                  background: TYPE_DOT[n.type] === 'red' ? 'var(--red)' : TYPE_DOT[n.type] === 'blue' ? 'var(--blue)' : TYPE_DOT[n.type] === 'amber' ? 'var(--amber)' : 'var(--border)',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{timeAgo(n.created_at)}</div>
                </div>
              </div>
            ))}
            {notifs.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>Нет уведомлений</div>
            )}
          </Card>
        </div>
      </div>
    </WarehouseLayout>
  )
}

function StatCard({ label, value, color, icon }) {
  const bgMap = { green: 'var(--green-dim)', blue: 'var(--blue-dim)', red: 'var(--red-dim)', amber: 'var(--amber-dim)' }
  const clrMap = { green: 'var(--green)', blue: 'var(--blue)', red: 'var(--red)', amber: 'var(--amber)' }
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 'var(--radius-card)',
      border: '1px solid var(--border)', padding: '20px',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: bgMap[color], display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 18, marginBottom: 14,
      }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: clrMap[color], lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Card({ title, action, navigate, children }) {
  return (
    <div style={{
      background: 'var(--white)', borderRadius: 'var(--radius-card)',
      border: '1px solid var(--border)', padding: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
        {action && (
          <button onClick={() => navigate(action.to)} style={{
            background: 'none', border: 'none', color: 'var(--blue)',
            fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>{action.label} →</button>
        )}
      </div>
      {children}
    </div>
  )
}

function NotificationBell({ count, onClick }) {
  return (
    <button onClick={onClick} style={{
      position: 'relative', width: 40, height: 40, borderRadius: 'var(--radius-btn)',
      border: '1px solid var(--border)', background: 'var(--white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
    }}>
      🔔
      {count > 0 && (
        <span style={{
          position: 'absolute', top: 6, right: 6,
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--red)',
        }} />
      )}
    </button>
  )
}
