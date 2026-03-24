import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import WarehouseLayout from './WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { requests as requestsApi } from '../../services/api'

const css = `
.req-page { padding: 28px 32px; max-width: 900px; }
.req-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.req-title { font-size: 22px; font-weight: 600; letter-spacing: -0.03em; margin-bottom: 2px; }
.req-sub { color: var(--muted); font-size: 13px; }
.req-filters { display: flex; gap: 6px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.req-filters::-webkit-scrollbar { display: none; }
.req-filter {
  padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;
  border: 1px solid var(--border); background: var(--card); color: var(--text);
  cursor: pointer; white-space: nowrap; transition: all 0.12s;
}
.req-filter.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.req-empty { color: var(--muted); font-size: 14px; padding: 60px 0; text-align: center; }
.req-loading { color: var(--muted); font-size: 14px; padding: 60px 0; text-align: center; }
.req-list { display: flex; flex-direction: column; gap: 10px; }
.req-item {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-card); padding: 16px 20px;
  display: flex; align-items: center; gap: 16;
  box-shadow: var(--shadow-sm);
}
.req-item-body { flex: 1; min-width: 0; }
.req-item-title { font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.req-item-meta { font-size: 12px; color: var(--muted); display: flex; gap: 14px; flex-wrap: wrap; }
.req-item-actions { display: flex; gap: 8px; flex-shrink: 0; }

@media (max-width: 768px) {
  .req-page { padding: 16px; }
  .req-title { font-size: 18px; }
  .req-item { flex-direction: column; align-items: flex-start; gap: 12px; padding: 14px 16px; }
  .req-item-actions { width: 100%; }
  .req-item-actions .btn { flex: 1; }
}
`

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
      <style>{css}</style>
      <div className="req-page">
        <div className="req-header">
          <div>
            <h1 className="req-title">Запросы</h1>
            <p className="req-sub">Запросы на выдачу оборудования со склада</p>
          </div>
        </div>

        <div className="req-filters">
          {FILTERS.map(f => (
            <button key={f.value} className={`req-filter${filter === f.value ? ' active' : ''}`}
              onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="req-loading">Загрузка...</div>
        ) : items.length === 0 ? (
          <div className="req-empty">Нет запросов</div>
        ) : (
          <div className="req-list">
            {items.map(r => {
              const st = STATUS_LABELS[r.status] || { label: r.status, color: 'blue' }
              return (
                <div key={r.id} className="req-item">
                  <div className="req-item-body">
                    <div className="req-item-title">
                      Запрос #{r.id.slice(0, 8)}
                      <Badge color={st.color}>{st.label}</Badge>
                    </div>
                    <div className="req-item-meta">
                      <span>{r.requester_name}</span>
                      <span>{(r.unit_ids || []).length} ед.</span>
                      {r.deadline && <span>до {formatDate(r.deadline)}</span>}
                      <span>{formatDate(r.created_at)}</span>
                    </div>
                  </div>
                  <div className="req-item-actions">
                    {r.status === 'new' && (<>
                      <Button variant="secondary" style={{ height: 34, fontSize: 13 }}
                        disabled={updating === r.id} onClick={() => changeStatus(r.id, 'collecting')}>
                        Собирать
                      </Button>
                      <Button variant="danger" style={{ height: 34, fontSize: 13 }}
                        disabled={updating === r.id} onClick={() => changeStatus(r.id, 'cancelled')}>
                        Отменить
                      </Button>
                    </>)}
                    {r.status === 'collecting' && (<>
                      <Button variant="secondary" style={{ height: 34, fontSize: 13 }}
                        disabled={updating === r.id} onClick={() => changeStatus(r.id, 'ready')}>
                        Готово
                      </Button>
                      <Button variant="danger" style={{ height: 34, fontSize: 13 }}
                        disabled={updating === r.id} onClick={() => changeStatus(r.id, 'cancelled')}>
                        Отменить
                      </Button>
                    </>)}
                    {r.status === 'ready' && (
                      <Button variant="primary" style={{ height: 34, fontSize: 13 }}
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
