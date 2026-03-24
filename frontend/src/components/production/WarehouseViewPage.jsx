import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from '../warehouse/WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { STATUS_LABEL, STATUS_COLOR } from '../../constants/statuses'

const CATEGORIES = ['Все категории', 'Мебель', 'Декор', 'Костюмы', 'Реквизит', 'Декорации']

const MOCK_UNITS = [
  { id: '1', name: 'Кресло Честерфилд', serial: 'CHR-001', category: 'Мебель', cell: 'A-1', description: 'Кожаное, коричневое, 2 шт. Потёртости на подлокотниках.', status: 'on_stock', projects: ['Проект «Закат»', 'Проект «Восход»'] },
  { id: '2', name: 'Ваза напольная', serial: 'VZA-002', category: 'Декор', cell: 'A-3', description: 'Керамика, белая, высота 80 см.', status: 'issued', projects: ['Проект «Рассвет»'] },
  { id: '3', name: 'Зеркало настенное', serial: 'ZRK-003', category: 'Декор', cell: 'A-4', description: 'Рама золочёная, 120×80 см.', status: 'on_stock', projects: [] },
  { id: '4', name: 'Стол обеденный', serial: 'STL-004', category: 'Мебель', cell: 'A-6', description: 'Дерево, раздвижной, 6 персон.', status: 'on_stock', projects: ['Проект «Закат»', 'Проект «Рассвет»', 'Проект «Лето»'] },
  { id: '5', name: 'Диван угловой', serial: 'DVN-005', category: 'Мебель', cell: 'B-2', description: 'Серая рогожка, модульный.', status: 'on_stock', projects: [] },
  { id: '6', name: 'Торшер бронзовый', serial: 'TRS-006', category: 'Декор', cell: 'B-5', description: 'Бронза, высота 160 см, абажур кремовый.', status: 'on_stock', projects: ['Проект «Восход»'] },
  { id: '7', name: 'Книжный шкаф', serial: 'KNS-007', category: 'Мебель', cell: 'B-6', description: 'Дуб, 6 полок, остекление.', status: 'on_stock', projects: [] },
  { id: '8', name: 'Сервиз чайный', serial: 'SRV-008', category: 'Реквизит', cell: 'C-3', description: 'Фарфор, 12 предметов, роспись.', status: 'issued', projects: ['Проект «Закат»'] },
]

const REQUEST_STATUSES = {
  none:      null,
  pending:   { label: 'Запрос отправлен', color: 'amber' },
  approved:  { label: 'Одобрено',         color: 'green' },
  rejected:  { label: 'Отклонено',        color: 'red' },
}

export default function WarehouseViewPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Все категории')
  const [requests, setRequests] = useState({})
  const [expanded, setExpanded] = useState(null)

  const filtered = MOCK_UNITS.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.serial.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'Все категории' || u.category === category
    return matchSearch && matchCat
  })

  function requestUnit(id) {
    setRequests(r => ({ ...r, [id]: 'pending' }))
  }

  return (
    <WarehouseLayout>
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
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                      {u.serial} · {u.category} · Ячейка {u.cell}
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
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px', background: 'var(--bg)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Описание</div>
                        <div style={{ fontSize: 13, lineHeight: 1.5 }}>{u.description}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>История проектов</div>
                        {u.projects.length > 0 ? u.projects.map((p, i) => (
                          <div key={i} style={{
                            fontSize: 12, padding: '4px 10px', borderRadius: 6,
                            background: 'var(--white)', border: '1px solid var(--border)',
                            display: 'inline-block', marginRight: 6, marginBottom: 6,
                          }}>{p}</div>
                        )) : (
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Не использовалось</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </WarehouseLayout>
  )
}
