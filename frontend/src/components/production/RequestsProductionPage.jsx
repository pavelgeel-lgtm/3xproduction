import { useState, useEffect } from 'react'
import ProductionLayout from './ProductionLayout'
import { requests as requestsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

const TABS = ['На рассмотрении', 'Выдано', 'Архив']

const STATUS_MAP = {
  'На рассмотрении': ['new', 'approved'],
  'Выдано':          ['issued'],
  'Архив':           ['cancelled', 'rejected'],
}

const STATUS_BADGE = {
  new:       { label: 'Новая',         bg: 'var(--blue-dim)',   color: 'var(--blue)' },
  approved:  { label: 'Одобрено',      bg: 'var(--green-dim)',  color: 'var(--green)' },
  issued:    { label: 'Выдано',        bg: 'var(--green-dim)',  color: 'var(--green)' },
  cancelled: { label: 'Отменено',      bg: 'var(--bg)',         color: 'var(--muted)' },
  rejected:  { label: 'Отклонено',     bg: 'var(--red-dim)',    color: 'var(--red)' },
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const css = `
@media (max-width: 768px) {
  .rp-page { padding: 16px !important; }
  .rp-tabs { overflow-x: auto; scrollbar-width: none; }
  .rp-tabs::-webkit-scrollbar { display: none; }
  .rp-tabs button { white-space: nowrap; padding: 9px 14px !important; font-size: 13px !important; }
  .rp-card { padding: 14px 16px !important; }
  .rp-card-head { flex-wrap: wrap; gap: 6px; }
}
`

export default function RequestsProductionPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('На рассмотрении')
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    requestsApi.list({ project_id: user?.project_id })
      .then(data => setAllRequests(data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user?.project_id])

  const filtered = allRequests.filter(r => (STATUS_MAP[tab] || []).includes(r.status))

  return (
    <ProductionLayout>
      <style>{css}</style>
      <div className="rp-page" style={{ padding: '24px 32px', maxWidth: 800 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Заявки на склад</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {allRequests.length} всего · {allRequests.filter(r => r.status === 'new').length} на рассмотрении
          </p>
        </div>

        <div className="rp-tabs" style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 20px', border: 'none', background: 'none',
              fontWeight: 500, fontSize: 14, cursor: 'pointer',
              color: tab === t ? 'var(--blue)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}`,
              marginBottom: -2,
            }}>
              {t}
              {t === 'На рассмотрении' && allRequests.filter(r => STATUS_MAP[t].includes(r.status)).length > 0 && (
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 10, background: 'var(--blue-dim)', color: 'var(--blue)' }}>
                  {allRequests.filter(r => STATUS_MAP[t].includes(r.status)).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
            {tab === 'На рассмотрении' ? 'Нет активных заявок' : 'Нет заявок'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(r => {
              const badge = STATUS_BADGE[r.status] || { label: r.status, bg: 'var(--bg)', color: 'var(--muted)' }
              return (
                <div key={r.id} className="rp-card" style={{
                  background: 'var(--white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)', padding: '16px 20px',
                }}>
                  <div className="rp-card-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>
                      Заявка #{String(r.id).slice(0, 8)}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 'var(--radius-badge)', background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </div>
                  {r.notes && (
                    <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 8, lineHeight: 1.5 }}>
                      {r.notes}
                    </div>
                  )}
                  {(r.unit_ids || []).length > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                      {r.unit_ids.length} ед. имущества
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {formatDate(r.created_at)}
                    {r.user_name && ` · ${r.user_name}`}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ProductionLayout>
  )
}
