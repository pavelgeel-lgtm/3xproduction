import { useState, useEffect } from 'react'
import WarehouseLayout from './WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { debts as debtsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'open', label: 'Открытые' },
  { value: 'closed', label: 'Закрытые' },
]

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DebtsPage() {
  const { user } = useAuth()
  const canClose = ['warehouse_director', 'warehouse_deputy'].includes(user?.role)
  const [filter, setFilter] = useState('open')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  function load(status) {
    setLoading(true)
    debtsApi.list(status)
      .then(data => setItems(data.debts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(filter) }, [filter])

  async function handleClose(id) {
    if (!window.confirm('Закрыть долг? Предмет вернётся на склад.')) return
    await debtsApi.close(id).catch(() => {})
    load(filter)
  }

  return (
    <WarehouseLayout>
      <div style={{ padding: '28px 32px', maxWidth: 900 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>Долги</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
          Невозвращённое имущество
        </p>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
              border: `1px solid ${filter === f.value ? 'var(--accent)' : 'var(--border)'}`,
              background: filter === f.value ? 'var(--accent)' : 'var(--card)',
              color: filter === f.value ? '#fff' : 'var(--text)',
              cursor: 'pointer',
            }}>{f.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '60px 0', textAlign: 'center' }}>Загрузка...</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '60px 0', textAlign: 'center' }}>Нет долгов</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(d => (
              <div key={d.id} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)', padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    {d.unit_name}
                    <Badge color={d.status === 'open' ? 'red' : 'green'}>
                      {d.status === 'open' ? 'Открыт' : 'Закрыт'}
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span>{d.user_name}</span>
                    {d.project_name && <span>{d.project_name}</span>}
                    <span>{formatDate(d.created_at)}</span>
                    {d.reason && <span>{d.reason}</span>}
                  </div>
                </div>
                {d.status === 'open' && canClose && (
                  <Button variant="secondary" style={{ height: 34, fontSize: 13 }}
                    onClick={() => handleClose(d.id)}>
                    Закрыть долг
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </WarehouseLayout>
  )
}
