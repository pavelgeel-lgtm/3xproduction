import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { STATUS_LABEL, STATUS_COLOR } from '../../constants/statuses'
import { units as unitsApi } from '../../services/api'

const CATEGORIES = ['Все категории', 'Мебель', 'Декор', 'Костюмы', 'Техника', 'Реквизит', 'Декорации']
const STATUSES = ['Все статусы', 'На складе', 'Выдано', 'Просрочено', 'На утверждении', 'Списано']

const STATUS_KEY = {
  'На складе': 'on_stock',
  'Выдано': 'issued',
  'Просрочено': 'overdue',
  'На утверждении': 'pending',
  'Списано': 'written_off',
}

export default function UnitsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Все категории')
  const [statusFilter, setStatusFilter] = useState('Все статусы')
  const [allUnits, setAllUnits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    unitsApi.list().then(data => {
      setAllUnits(data.units || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = allUnits.filter(u => {
    const matchSearch = !search ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.serial || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'Все категории' || u.category === category
    const matchStatus = statusFilter === 'Все статусы' || u.status === STATUS_KEY[statusFilter]
    return matchSearch && matchCat && matchStatus
  })

  return (
    <WarehouseLayout>
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Остатки</h1>
          <Button onClick={() => navigate('/units/new')}>+ Добавить единицу</Button>
        </div>

        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или серийному номеру..."
            style={{
              width: '100%', height: 40, padding: '0 12px 0 36px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
              fontSize: 14, background: 'var(--white)', outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Select value={statusFilter} onChange={setStatusFilter} options={STATUSES} />
          <Select value={category} onChange={setCategory} options={CATEGORIES} />
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>
            {filtered.length} ед.
          </span>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
            Загрузка...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
              Ничего не найдено
            </div>
          )}
          {filtered.map(u => {
            const isWrittenOff = u.status === 'written_off'
            const photo = u.photos?.[0]
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: isWrittenOff ? 'var(--bg-secondary)' : 'var(--card)',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border)',
                filter: isWrittenOff ? 'grayscale(1)' : 'none',
                opacity: isWrittenOff ? 0.6 : 1,
                transition: 'box-shadow 0.15s',
                cursor: 'pointer',
                position: 'relative',
              }}
                onClick={() => navigate(`/units/${u.id}`)}
                onMouseEnter={e => !isWrittenOff && (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, overflow: 'hidden',
                  position: 'relative',
                }}>
                  {photo
                    ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isWrittenOff ? 'blur(2px)' : 'none' }} />
                    : <span style={{ filter: isWrittenOff ? 'grayscale(1)' : 'none' }}>📦</span>}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 500, fontSize: 14,
                    textDecoration: isWrittenOff ? 'line-through' : 'none',
                    color: isWrittenOff ? 'var(--muted)' : 'var(--text)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {u.serial} · {u.category}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0 }}>
                  {u.cell_name && <div>Ячейка {u.cell_name}</div>}
                  {u.warehouse_name && <div style={{ marginTop: 2 }}>{u.warehouse_name}</div>}
                </div>

                <div style={{ flexShrink: 0 }}>
                  <Badge color={STATUS_COLOR[u.status]}>{STATUS_LABEL[u.status]}</Badge>
                </div>

                <span style={{ color: 'var(--muted)', fontSize: 16, flexShrink: 0 }}>›</span>
              </div>
            )
          })}
        </div>
      </div>
    </WarehouseLayout>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      height: 36, padding: '0 10px',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
      fontSize: 13, background: 'var(--white)', cursor: 'pointer', color: 'var(--text)',
    }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}
