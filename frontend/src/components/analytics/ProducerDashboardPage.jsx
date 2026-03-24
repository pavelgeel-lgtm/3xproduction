import { useState, useEffect } from 'react'
import ProductionLayout from '../production/ProductionLayout'
import { analytics } from '../../services/api'

export default function ProducerDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analytics.producer().then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <ProductionLayout><div style={{ padding: '24px 32px', color: 'var(--muted)', fontSize: 14 }}>Загрузка аналитики...</div></ProductionLayout>
  }

  const budgetByCat   = data?.budget_by_category || []
  const projectComp   = data?.project_comparison  || []
  const topUsers      = data?.top_users           || []
  const categoryLoad  = data?.category_load       || []

  const totalBudget = budgetByCat.reduce((s, c) => s + Number(c.estimated_cost || 0), 0)
  const maxBudget = Math.max(...budgetByCat.map(c => Number(c.estimated_cost || 0)), 1)

  const COLORS = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--red)', 'var(--muted)']

  return (
    <ProductionLayout>
      <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Аналитика компании</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Все проекты</p>
        </div>

        <div className="resp-3-col" style={{ marginBottom: 28 }}>
          <StatCard label="Общие расходы" value={totalBudget.toLocaleString('ru-RU') + ' ₽'} color="var(--blue)" />
          <StatCard label="Активных проектов" value={projectComp.length} color="var(--green)" />
          <StatCard label="Категорий задействовано" value={categoryLoad.length} color="var(--amber)" />
        </div>

        <div className="resp-2-col" style={{ marginBottom: 20 }}>
          <Card title="Расходы по категориям">
            {budgetByCat.length === 0 && <Empty />}
            {budgetByCat.map((c, i) => {
              const pct = Math.round((Number(c.estimated_cost) / totalBudget) * 100)
              return (
                <div key={c.category} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      {c.category || '—'}
                    </span>
                    <span style={{ fontWeight: 600 }}>{Number(c.estimated_cost || 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((Number(c.estimated_cost) / maxBudget) * 100)}%`, background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{pct}%</div>
                </div>
              )
            })}
          </Card>

          <Card title="Сравнение проектов">
            {projectComp.length === 0 && <Empty />}
            {projectComp.slice(0, 5).map((p, i) => (
              <div key={p.id} style={{
                padding: '12px 0',
                borderBottom: i < Math.min(projectComp.length, 5) - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{p.name || `Проект #${p.id}`}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <span style={{ color: 'var(--blue)' }}>📋 {p.requests} запросов</span>
                  <span style={{ color: 'var(--green)' }}>📦 {p.unique_units} ед.</span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="resp-2-col">
          <Card title="Топ участников по выдачам">
            {topUsers.length === 0 && <Empty />}
            {topUsers.slice(0, 5).map((u, i) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.role}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--blue)', fontWeight: 600 }}>{u.issuances} выдач</span>
                  {Number(u.currently_holding) > 0 && (
                    <span style={{ color: 'var(--amber)' }}>держит {u.currently_holding}</span>
                  )}
                </div>
              </div>
            ))}
          </Card>

          <Card title="Нагрузка по категориям">
            {categoryLoad.length === 0 && <Empty />}
            {categoryLoad.slice(0, 5).map((c, i) => {
              const maxR = Math.max(...categoryLoad.map(x => Number(x.request_count)), 1)
              return (
                <div key={c.category} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span>{c.category || '—'}</span>
                    <span style={{ fontWeight: 500 }}>{c.request_count} запросов</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--bg)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.round((Number(c.request_count) / maxR) * 100)}%`, background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </ProductionLayout>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '18px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '20px' }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  )
}

function Empty() {
  return <div style={{ color: 'var(--muted)', fontSize: 13, padding: '12px 0' }}>Нет данных</div>
}
