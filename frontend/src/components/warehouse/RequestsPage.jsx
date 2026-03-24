import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { requests as requestsApi } from '../../services/api'

const STATUS_LABELS = {
  new:        { label: 'Новый',       color: 'blue' },
  collecting: { label: 'Собирается',  color: 'amber' },
  ready:      { label: 'Готов',       color: 'green' },
  issued:     { label: 'Выдан',       color: 'green' },
  cancelled:  { label: 'Отменён',     color: 'red' },
}

const FILTERS = [
  { value: '',           label: 'Все' },
  { value: 'new',        label: 'Новые' },
  { value: 'collecting', label: 'Собираются' },
  { value: 'ready',      label: 'Готовы' },
  { value: 'issued',     label: 'Выданы' },
  { value: 'cancelled',  label: 'Отменены' },
]

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RequestsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

  function load(status) {
    setLoading(true)
    const params = status ? { status } : {}
    requestsApi.list(params)
      .then(data => setItems(data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(filter) }, [filter])

  async function changeStatus(id, status) {
    setUpdating(id)
    try {
      await requestsApi.status(id, status)
      load(filter)
    } catch (e) {
      alert(e.message)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <WarehouseLayout>
      <div style={{ padding: '28px 32px', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>Запросы</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>Запросы на выдачу оборудования со склада</p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              border: '1px solid var(--border)',
              background: filter === f.value ? 'var(--blue)' : 'var(--white)',
              color: filter === f.value ? '#fff' : 'var(--text)',
            }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Загрузка...</div>
        ) : items.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Нет запросов</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(r => {
              const st = STATUS_LABELS[r.status] || { label: r.status, color: 'blue' }
              return (
                <div key={r.id} style={{
                  background: 'var(--white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)', padding: '18px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 15 }}>Запрос #{r.id.slice(0, 8)}</span>
                      <Badge color={st.color}>{st.label}</Badge>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 16 }}>
                      <span>👤 {r.requester_name}</span>
                      <span>📦 {(r.unit_ids || []).length} ед.</span>
                      {r.deadline && <span>📅 до {formatDate(r.deadline)}</span>}
                      <span>🕐 {formatDate(r.created_at)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {r.status === 'new' && (
                      <>
                        <Button variant="secondary" style={{ height: 34, fontSize: 13, padding: '0 12px' }}
                          disabled={updating === r.id}
                          onClick={() => changeStatus(r.id, 'collecting')}>
                          Собирать
                        </Button>
                        <Button variant="danger" style={{ height: 34, fontSize: 13, padding: '0 12px' }}
                          disabled={updating === r.id}
                          onClick={() => changeStatus(r.id, 'cancelled')}>
                          Отменить
                        </Button>
                      </>
                    )}
                    {r.status === 'collecting' && (
                      <>
                        <Button variant="secondary" style={{ height: 34, fontSize: 13, padding: '0 12px' }}
                          disabled={updating === r.id}
                          onClick={() => changeStatus(r.id, 'ready')}>
                          Готово
                        </Button>
                        <Button variant="danger" style={{ height: 34, fontSize: 13, padding: '0 12px' }}
                          disabled={updating === r.id}
                          onClick={() => changeStatus(r.id, 'cancelled')}>
                          Отменить
                        </Button>
                      </>
                    )}
                    {r.status === 'ready' && (
                      <Button variant="primary" style={{ height: 34, fontSize: 13, padding: '0 14px' }}
                        onClick={() => navigate(`/issue/${r.id}`)}>
                        Выдать →
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </WarehouseLayout>
  )
}
