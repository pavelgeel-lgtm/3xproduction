import { useState, useEffect } from 'react'
import WarehouseLayout from './WarehouseLayout'
import { issuances as issuancesApi } from '../../services/api'

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ActRow({ children }) {
  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-card)', padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      {children}
    </div>
  )
}

export default function ActsPage() {
  const [tab, setTab] = useState('issue')
  const [data, setData] = useState({ issuances: [], returns: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    issuancesApi.acts()
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const tabs = [
    { key: 'issue',  label: 'Акты выдачи',  count: data.issuances.length },
    { key: 'return', label: 'Акты возврата', count: data.returns.length },
  ]

  return (
    <WarehouseLayout>
      <div style={{ padding: '28px 32px', maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>Акты</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Акты выдачи и возврата оборудования</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '8px 18px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              background: 'none', border: 'none',
              borderBottom: tab === t.key ? '2px solid var(--blue)' : '2px solid transparent',
              color: tab === t.key ? 'var(--blue)' : 'var(--muted)',
              marginBottom: -1,
            }}>
              {t.label}
              <span style={{
                marginLeft: 6, fontSize: 11, fontWeight: 600,
                background: tab === t.key ? 'var(--blue-dim)' : 'var(--border)',
                color: tab === t.key ? 'var(--blue)' : 'var(--muted)',
                padding: '1px 6px', borderRadius: 8,
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Загрузка...</div>
        ) : tab === 'issue' ? (
          data.issuances.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Нет актов выдачи</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.issuances.map(i => (
                <ActRow key={i.id}>
                  <div style={{ fontSize: 22 }}>📄</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      Акт выдачи · {formatDate(i.issued_at)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>Выдал: {i.issued_by_name}</span>
                      <span>Получил: {i.received_by_name}</span>
                      <span>Единиц: {(i.unit_ids || []).length}</span>
                      <span>До: {formatDate(i.deadline)}</span>
                      {i.returned && (
                        <span style={{ color: 'var(--green)', fontWeight: 500 }}>✓ Возвращено</span>
                      )}
                    </div>
                  </div>
                  {i.act_pdf_url ? (
                    <a href={i.act_pdf_url} target="_blank" rel="noreferrer" style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: 'var(--blue-dim)', color: 'var(--blue)',
                      textDecoration: 'none', flexShrink: 0,
                    }}>
                      PDF →
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Нет PDF</span>
                  )}
                </ActRow>
              ))}
            </div>
          )
        ) : (
          data.returns.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Нет актов возврата</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.returns.map(r => (
                <ActRow key={r.id}>
                  <div style={{ fontSize: 22 }}>📋</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                      Акт возврата · {formatDate(r.returned_at)}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>Вернул: {r.returned_by_name}</span>
                      <span>Принял: {r.accepted_by_name}</span>
                      <span>Единиц: {(r.unit_ids || []).length}</span>
                      {r.condition_notes && (
                        <span style={{ color: 'var(--amber)' }}>⚠️ {r.condition_notes}</span>
                      )}
                    </div>
                  </div>
                  {r.act_pdf_url ? (
                    <a href={r.act_pdf_url} target="_blank" rel="noreferrer" style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: 'var(--blue-dim)', color: 'var(--blue)',
                      textDecoration: 'none', flexShrink: 0,
                    }}>
                      PDF →
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>Нет PDF</span>
                  )}
                </ActRow>
              ))}
            </div>
          )
        )}
      </div>
    </WarehouseLayout>
  )
}
