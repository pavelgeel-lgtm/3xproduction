import { useState, useEffect } from 'react'
import ProductionLayout from './ProductionLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import UnitCardModal from '../shared/UnitCardModal'
import { STATUS_LABEL, STATUS_COLOR } from '../../constants/statuses'
import { units as unitsApi } from '../../services/api'

const CATEGORIES = ['Все категории', 'Мебель', 'Декор', 'Костюмы', 'Реквизит', 'Декорации', 'Бутафория', 'Худ. наполнение', 'Автомобили', 'Прочее']

const REQUEST_STATUSES = {
  none:      null,
  pending:   { label: 'Запрос отправлен', color: 'amber' },
  approved:  { label: 'Одобрено',         color: 'green' },
  rejected:  { label: 'Отклонено',        color: 'red' },
}

export default function WarehouseViewPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Все категории')
  const [requests, setRequests] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)
  const [cardId, setCardId] = useState(null)

  useEffect(() => {
    unitsApi.list().then(d => setUnits(d.units || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = units.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.serial || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'Все категории' || u.category === category
    return matchSearch && matchCat
  })

  function requestUnit(id) {
    setRequests(r => ({ ...r, [id]: 'pending' }))
  }

  return (
    <ProductionLayout>
      <div style={{ padding: '24px 32px', maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Склад</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Вирки 22 · Просмотр остатков</p>
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Поиск..."
              style={{
                width: '100%', height: 40, padding: '0 12px 0 36px',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
                fontSize: 14, background: 'var(--white)', outline: 'none',
              }} />
          </div>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{
            height: 40, padding: '0 12px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)', cursor: 'pointer',
          }}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Units */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(u => {
            const reqStatus = requests[u.id]
            const isOpen = expanded === u.id
            return (
              <div key={u.id} style={{
                background: 'var(--white)', borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border)', overflow: 'hidden',
              }}>
                {/* Main row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : u.id)}>
                  {/* Photo */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>📦</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, cursor: 'pointer', color: 'var(--accent)' }}
                      onClick={e => { e.stopPropagation(); setCardId(u.id) }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {u.serial ? `${u.serial} · ` : ''}{u.category}{(u.cell_custom || u.cell_code) ? ` · Ячейка ${u.cell_custom || u.cell_code}` : ''}
                    </div>
                  </div>

                  <Badge color={STATUS_COLOR[u.status]}>{STATUS_LABEL[u.status]}</Badge>

                  {/* Request button / status */}
                  <div onClick={e => e.stopPropagation()}>
                    {!reqStatus && u.status === 'on_stock' ? (
                      <Button style={{ height: 34, fontSize: 13, padding: '0 14px' }}
                        onClick={() => requestUnit(u.id)}>
                        Запросить
                      </Button>
                    ) : reqStatus ? (
                      <Badge color={REQUEST_STATUSES[reqStatus].color}>
                        {REQUEST_STATUSES[reqStatus].label}
                      </Badge>
                    ) : (
                      <Badge color="muted">Недоступно</Badge>
                    )}
                  </div>

                  <span style={{ color: 'var(--muted)', fontSize: 14, transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
                </div>

                {/* Expanded details */}
                {isOpen && u.description && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px', background: 'var(--bg)' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Описание</div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{u.description}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>Загрузка...</div>}
      </div>
      {cardId && <UnitCardModal unitId={cardId} onClose={() => setCardId(null)} />}
    </ProductionLayout>
  )
}
