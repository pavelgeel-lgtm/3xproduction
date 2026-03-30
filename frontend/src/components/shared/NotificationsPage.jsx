import { useState } from 'react'
import WarehouseLayout from '../warehouse/WarehouseLayout'
import Button from './Button'
import { useNotifications } from '../../hooks/useNotifications'
import { usePush } from '../../hooks/usePush'

const TYPE_ICON = {
  overdue:       '⚠️',
  new_request:   '📋',
  damage:        '🔧',
  status_change: '🔄',
  new_version:   '📄',
  deadline:      '⏰',
}

const TYPE_DOT = {
  overdue:     'red',
  damage:      'amber',
  new_request: 'blue',
  new_version: 'blue',
  deadline:    'amber',
}

const FILTERS = ['Все', 'Непрочитанные']

function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const diff = (Date.now() - d.getTime()) / 1000
  if (diff < 60)   return 'только что'
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`
  return `${Math.floor(diff / 86400)} д назад`
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState('Все')
  const { items, unreadCount, markRead, markAllRead } = useNotifications()
  const { supported, subscribed, subscribe, unsubscribe } = usePush()

  const filtered = items.filter(n => filter === 'Все' || !n.read)

  return (
    <WarehouseLayout>
      <div style={{ padding: '24px 32px', maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Что нового?</h1>
            {unreadCount > 0 && (
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{unreadCount} непрочитанных</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {supported && (
              <Button variant="secondary" style={{ height: 34, fontSize: 13 }}
                onClick={subscribed ? unsubscribe : subscribe}>
                {subscribed ? '🔔 Вкл' : '🔕 Выкл'}
              </Button>
            )}
            {unreadCount > 0 && (
              <Button variant="secondary" style={{ height: 34, fontSize: 13 }} onClick={markAllRead}>
                Прочитать все
              </Button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              height: 32, padding: '0 14px', borderRadius: 'var(--radius-badge)',
              border: `1px solid ${filter === f ? 'var(--blue)' : 'var(--border)'}`,
              background: filter === f ? 'var(--blue-dim)' : 'var(--white)',
              color: filter === f ? 'var(--blue)' : 'var(--muted)',
              fontSize: 13, fontWeight: filter === f ? 500 : 400, cursor: 'pointer',
            }}>{f}</button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
            Нет уведомлений
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(n => {
            const dot = TYPE_DOT[n.type] || 'muted'
            return (
              <div key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '14px 16px', borderRadius: 'var(--radius-card)',
                  background: n.read ? 'var(--white)' : 'var(--blue-dim)',
                  border: `1px solid ${n.read ? 'var(--border)' : 'rgba(30,157,218,0.2)'}`,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: dot === 'red' ? 'var(--red-dim)' : dot === 'blue' ? 'var(--blue-dim)' : dot === 'amber' ? 'var(--amber-dim)' : 'var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>
                  {TYPE_ICON[n.type] || '🔔'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: n.read ? 400 : 500 }}>{n.text}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{timeAgo(n.created_at)}</div>
                </div>
                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </WarehouseLayout>
  )
}
