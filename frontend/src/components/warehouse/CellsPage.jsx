import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { STATUS_LABEL, STATUS_COLOR } from '../../constants/statuses'

const CELL_STATUS = {
  free:     { bg: 'var(--bg)',        border: '1px solid var(--border)',                label: 'Свободно' },
  occupied: { bg: 'var(--blue-dim)',  border: '1px solid rgba(30,157,218,0.25)',         label: 'Занято' },
  overdue:  { bg: 'var(--red-dim)',   border: '1px solid rgba(220,38,38,0.25)',          label: 'Просрочено' },
  pending:  { bg: 'var(--amber-dim)', border: '1px solid rgba(217,119,6,0.25)',          label: 'На утверждении' },
  written_off: { bg: 'var(--bg)',     border: '1px solid var(--border)', opacity: 0.35, label: 'Списано' },
}

const FILTERS = ['Все', 'Свободные', 'Занятые', 'Просроченные']

const SECTIONS = [
  {
    id: 'A', name: 'А · Реквизит', rows: 3, shelves: 6,
    cells: [
      { id: 'A-1', status: 'occupied', unit: { name: 'Кресло Честерфилд', serial: 'CHR-001', project: 'Проект «Рассвет»', deadline: '28.03.2026', status: 'issued' } },
      { id: 'A-2', status: 'free' },
      { id: 'A-3', status: 'overdue', unit: { name: 'Ваза напольная', serial: 'VZA-002', project: 'Проект «Закат»', deadline: '20.03.2026', status: 'overdue' } },
      { id: 'A-4', status: 'occupied', unit: { name: 'Зеркало настенное', serial: 'ZRK-003', project: 'Проект «Рассвет»', deadline: '01.04.2026', status: 'issued' } },
      { id: 'A-5', status: 'free' },
      { id: 'A-6', status: 'pending', unit: { name: 'Стол обеденный', serial: 'STL-004', project: '—', deadline: '—', status: 'pending' } },
      { id: 'B-1', status: 'free' },
      { id: 'B-2', status: 'occupied', unit: { name: 'Диван угловой', serial: 'DVN-005', project: 'Проект «Закат»', deadline: '05.04.2026', status: 'issued' } },
      { id: 'B-3', status: 'free' },
      { id: 'B-4', status: 'free' },
      { id: 'B-5', status: 'overdue', unit: { name: 'Торшер бронзовый', serial: 'TRS-006', project: 'Проект «Рассвет»', deadline: '18.03.2026', status: 'overdue' } },
      { id: 'B-6', status: 'occupied', unit: { name: 'Книжный шкаф', serial: 'KNS-007', project: 'Проект «Рассвет»', deadline: '28.03.2026', status: 'issued' } },
      { id: 'C-1', status: 'free' },
      { id: 'C-2', status: 'free' },
      { id: 'C-3', status: 'occupied', unit: { name: 'Сервиз чайный', serial: 'SRV-008', project: 'Проект «Закат»', deadline: '10.04.2026', status: 'issued' } },
      { id: 'C-4', status: 'free' },
      { id: 'C-5', status: 'written_off', unit: { name: 'Ваза битая', serial: 'VZA-009', project: '—', deadline: '—', status: 'written_off' } },
      { id: 'C-6', status: 'free' },
    ],
  },
  {
    id: 'B', name: 'Б · Костюмы', rows: 2, shelves: 4,
    cells: [
      { id: 'D-1', status: 'occupied', unit: { name: 'Платье вечернее', serial: 'PLT-010', project: 'Проект «Рассвет»', deadline: '28.03.2026', status: 'issued' } },
      { id: 'D-2', status: 'free' },
      { id: 'D-3', status: 'free' },
      { id: 'D-4', status: 'occupied', unit: { name: 'Костюм деловой', serial: 'KST-011', project: 'Проект «Закат»', deadline: '05.04.2026', status: 'issued' } },
      { id: 'E-1', status: 'free' },
      { id: 'E-2', status: 'pending', unit: { name: 'Шуба норковая', serial: 'SHB-012', project: '—', deadline: '—', status: 'pending' } },
      { id: 'E-3', status: 'free' },
      { id: 'E-4', status: 'free' },
    ],
  },
  {
    id: 'SUB', name: 'Подсклад · Проект «Рассвет»', isSubWarehouse: true, rows: 1, shelves: 4,
    cells: [
      { id: 'P-1', status: 'occupied', unit: { name: 'Камера Sony FX3', serial: 'CAM-020', project: 'Проект «Рассвет»', deadline: '28.03.2026', status: 'issued' } },
      { id: 'P-2', status: 'occupied', unit: { name: 'Штатив Sachtler', serial: 'SHT-021', project: 'Проект «Рассвет»', deadline: '28.03.2026', status: 'issued' } },
      { id: 'P-3', status: 'free' },
      { id: 'P-4', status: 'free' },
    ],
  },
]

const FILTER_MAP = {
  'Все': () => true,
  'Свободные': c => c.status === 'free',
  'Занятые': c => c.status === 'occupied',
  'Просроченные': c => c.status === 'overdue',
}

export default function CellsPage() {
  const navigate = useNavigate()
  const [warehouse, setWarehouse] = useState('Вирки 22')
  const [filter, setFilter] = useState('Все')
  const [selected, setSelected] = useState(null)

  const selectedCell = SECTIONS.flatMap(s => s.cells).find(c => c.id === selected)

  return (
    <WarehouseLayout>
      <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 0px)' }}>
        {/* Main area */}
        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Карта ячеек</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={warehouse} onChange={e => setWarehouse(e.target.value)} style={{
                height: 36, padding: '0 10px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)', cursor: 'pointer',
              }}>
                <option>Вирки 22</option>
                <option>Чапаева 6</option>
              </select>
              <Button variant="secondary" style={{ height: 36, fontSize: 13 }}
                onClick={() => navigate('/cells/constructor')}>
                + Секция
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
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

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {Object.entries(CELL_STATUS).map(([key, val]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: val.bg, border: val.border, opacity: val.opacity || 1 }} />
                {val.label}
              </div>
            ))}
          </div>

          {/* Sections */}
          {SECTIONS.map(section => {
            const filtered = section.cells.filter(FILTER_MAP[filter])
            if (filtered.length === 0 && filter !== 'Все') return null
            return (
              <div key={section.id} style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{section.name}</div>
                  {section.isSubWarehouse && (
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-badge)',
                      background: 'var(--blue-dim)', color: 'var(--blue)', fontWeight: 500,
                    }}>Подсклад</span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {section.cells.filter(c => c.status === 'free').length} свободных из {section.cells.length}
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${section.shelves}, 1fr)`,
                  gap: 8,
                }}>
                  {section.cells.filter(FILTER_MAP[filter]).map(cell => {
                    const s = CELL_STATUS[cell.status]
                    return (
                      <div key={cell.id}
                        onClick={() => setSelected(selected === cell.id ? null : cell.id)}
                        style={{
                          aspectRatio: '1',
                          background: s.bg,
                          border: selected === cell.id ? '2px solid var(--blue)' : s.border,
                          borderRadius: 8,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          opacity: s.opacity || 1,
                          filter: cell.status === 'written_off' ? 'blur(1px)' : 'none',
                          transition: 'all 0.15s',
                          fontSize: 10, fontWeight: 500,
                          color: cell.status === 'free' ? 'var(--muted)' : 'var(--text)',
                          userSelect: 'none',
                        }}
                      >
                        {cell.id}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Detail panel (desktop) */}
        {selected && selectedCell && (
          <aside style={{
            width: 300, borderLeft: '1px solid var(--border)',
            background: 'var(--white)', padding: 24,
            overflowY: 'auto',
          }} className="cell-detail">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Ячейка {selected}</div>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', fontSize: 18,
                cursor: 'pointer', color: 'var(--muted)',
              }}>✕</button>
            </div>

            {selectedCell.status === 'free' ? (
              <div style={{ color: 'var(--muted)', fontSize: 14, textAlign: 'center', paddingTop: 40 }}>
                Ячейка свободна
              </div>
            ) : (
              <>
                <Badge color={STATUS_COLOR[selectedCell.unit?.status || 'muted']}>
                  {STATUS_LABEL[selectedCell.unit?.status] || '—'}
                </Badge>

                <div style={{ marginTop: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                    {selectedCell.unit?.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {selectedCell.unit?.serial}
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <DetailRow label="Проект" value={selectedCell.unit?.project} />
                  <DetailRow label="Дедлайн" value={selectedCell.unit?.deadline} last />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Button fullWidth variant="secondary"
                    onClick={() => navigate(`/units/${selected}`)}>
                    Карточка единицы
                  </Button>
                  {selectedCell.status === 'overdue' && (
                    <Button fullWidth variant="secondary" style={{ color: 'var(--amber)' }}>
                      Уведомить
                    </Button>
                  )}
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* Mobile: bottom sheet on cell click */}
      {selected && selectedCell && (
        <div style={{ display: 'none' }} className="cell-sheet">
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
          }} onClick={() => setSelected(null)} />
          <div style={{
            position: 'fixed', bottom: 72, left: 0, right: 0, zIndex: 201,
            background: 'var(--white)', borderRadius: '16px 16px 0 0', padding: 24,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>Ячейка {selected}</div>
            {selectedCell.unit && (
              <>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{selectedCell.unit.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>{selectedCell.unit.serial}</div>
                <Button fullWidth onClick={() => navigate(`/units/${selected}`)}>Карточка</Button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .cell-detail { display: none !important; }
          .cell-sheet { display: block !important; }
        }
      `}</style>
    </WarehouseLayout>
  )
}

function DetailRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      paddingBottom: last ? 0 : 8, marginBottom: last ? 0 : 8,
      borderBottom: last ? 'none' : '1px solid var(--border)',
      fontSize: 13,
    }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
