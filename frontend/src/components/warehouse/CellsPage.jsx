import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import Button from '../shared/Button'
import UnitCardModal from '../shared/UnitCardModal'
import { warehouses as warehousesApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

export default function CellsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canDeleteWarehouse = ['warehouse_director', 'warehouse_deputy'].includes(user?.role)
  const [warehouseList, setWarehouseList] = useState([])
  const [selWh, setSelWh] = useState('')
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [cardId, setCardId] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)

  useEffect(() => {
    warehousesApi.list().then(d => {
      const whs = d.warehouses || []
      setWarehouseList(whs)
      if (whs.length) setSelWh(String(whs[0].id))
    })
  }, [])

  useEffect(() => {
    if (!selWh) return
    setLoading(true)
    warehousesApi.cells(selWh)
      .then(d => setSections(d.sections || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selWh])

  const selectedCell = sections.flatMap(s => s.cells || []).find(c => String(c.id) === String(selected))

  return (
    <WarehouseLayout>
      <style>{`
        .cells-page { display: flex; height: 100%; min-height: calc(100vh - 60px); }
        .cells-main { flex: 1; padding: 24px 28px; overflow-y: auto; min-width: 0; }
        .cells-detail { width: 280px; border-left: 1px solid var(--border); background: var(--white); padding: 20px; overflow-y: auto; flex-shrink: 0; }
        @media (max-width: 768px) {
          .cells-page { flex-direction: column; }
          .cells-main { padding: 16px; }
          .cells-detail { display: none; }
          .cells-sheet { display: block !important; }
          .cells-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 6px !important; }
        }
      `}</style>
      <div className="cells-page">
        <div className="cells-main">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Карта ячеек</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {warehouseList.length > 0 && (
                <select value={selWh} onChange={e => setSelWh(e.target.value)} style={{
                  height: 36, padding: '0 10px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)', cursor: 'pointer',
                }}>
                  {warehouseList.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              )}
              <Button variant="secondary" style={{ height: 36, fontSize: 13 }}
                onClick={async () => {
                  const name = prompt('Название нового склада:')
                  if (!name?.trim()) return
                  try {
                    const data = await warehousesApi.create({ name: name.trim() })
                    const wh = data.warehouse
                    setWarehouseList(prev => [...prev, wh])
                    setSelWh(String(wh.id))
                  } catch (e) { alert(e.message || 'Ошибка') }
                }}>
                + Склад
              </Button>
              <Button variant="secondary" style={{ height: 36, fontSize: 13 }}
                onClick={() => navigate('/cells/constructor')}>
                + Секция
              </Button>
              {canDeleteWarehouse && selWh && (
                <Button variant="secondary" style={{ height: 36, fontSize: 13, color: 'var(--red)' }}
                  onClick={async () => {
                    if (!confirm('Удалить этот склад? Это действие необратимо.')) return
                    try {
                      await warehousesApi.deleteWarehouse(selWh)
                      setWarehouseList(prev => prev.filter(w => String(w.id) !== selWh))
                      setSelWh('')
                      setSections([])
                    } catch (e) { alert(e.message || 'Ошибка') }
                  }}>
                  Удалить склад
                </Button>
              )}
            </div>
          </div>

          {loading && <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Загрузка...</div>}

          {sections.map((section, sIdx) => {
            const cells = section.cells || []
            return (
              <div key={section.id} style={{ marginBottom: 28 }}
                draggable
                onDragStart={() => setDragIdx(sIdx)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx === null || dragIdx === sIdx) return
                  const reordered = [...sections]
                  const [moved] = reordered.splice(dragIdx, 1)
                  reordered.splice(sIdx, 0, moved)
                  setSections(reordered)
                  setDragIdx(null)
                  warehousesApi.reorderSections(reordered.map(s => s.id)).catch(() => {})
                }}
                onDragEnd={() => setDragIdx(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, cursor: 'grab' }}>
                  <span style={{ color: 'var(--muted)', fontSize: 14 }}>⠿</span>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{section.name}</div>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {cells.filter(c => !c.unit_id || c.unit_status !== 'on_stock').length} свободных из {cells.length}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/cells/constructor?warehouse=${selWh}&section=${section.id}`) }}
                    style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>
                    + Добавить
                  </button>
                </div>
                <div className="cells-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(section.cells?.length || 6, 8)}, 1fr)`,
                  gap: 8,
                }}>
                  {cells.map(cell => {
                    const isOccupied = cell.unit_id && cell.unit_status === 'on_stock'
                    const isSelected = String(selected) === String(cell.id)
                    return (
                      <div key={cell.id}
                        onClick={() => setSelected(isSelected ? null : cell.id)}
                        style={{
                          aspectRatio: '1',
                          background: isOccupied ? 'var(--blue-dim)' : 'var(--bg)',
                          border: isSelected
                            ? '2px solid var(--blue)'
                            : isOccupied
                              ? '1px solid rgba(30,157,218,0.3)'
                              : '1px solid var(--border)',
                          borderRadius: 8,
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.15s',
                          fontSize: 10, fontWeight: 500,
                          color: isOccupied ? 'var(--blue)' : 'var(--muted)',
                          userSelect: 'none',
                          overflow: 'hidden', padding: 4,
                        }}
                      >
                        <div style={{ fontSize: 9, fontWeight: 600 }}>{cell.custom_name || cell.code}</div>
                        {isOccupied && (
                          <div style={{ fontSize: 8, marginTop: 2, textAlign: 'center', lineHeight: 1.2, overflow: 'hidden', maxWidth: '100%', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {cell.unit_name}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {!loading && sections.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
              Нет секций. <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => navigate('/cells/constructor')}>Создать секцию</span>
            </div>
          )}
        </div>

        {/* Desktop detail panel */}
        {selected && selectedCell && (
          <aside className="cells-detail">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {selectedCell.custom_name || selectedCell.code}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>

            {!selectedCell.unit_id || selectedCell.unit_status !== 'on_stock' ? (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Ячейка свободна</div>
                <button onClick={async () => {
                  if (!window.confirm('Удалить ячейку?')) return
                  try {
                    await warehousesApi.deleteCell(selectedCell.id)
                    setSections(prev => prev.map(s => ({
                      ...s, cells: (s.cells || []).filter(c => c.id !== selectedCell.id)
                    })))
                    setSelected(null)
                  } catch (e) { alert(e.message || 'Ошибка') }
                }} style={{
                  fontSize: 12, color: 'var(--red)', background: 'none',
                  border: '1px solid var(--red)', borderRadius: 6,
                  padding: '6px 14px', cursor: 'pointer',
                }}>Удалить ячейку</button>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{selectedCell.unit_name}</div>
                <Button fullWidth style={{ marginTop: 12 }} onClick={() => { setCardId(selectedCell.unit_id); setSelected(null) }}>
                  Открыть карточку
                </Button>
              </>
            )}
          </aside>
        )}
      </div>

      {/* Mobile bottom sheet */}
      {selected && selectedCell && (
        <div className="cells-sheet" style={{ display: 'none' }}>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} onClick={() => setSelected(null)} />
          <div style={{ position: 'fixed', bottom: 72, left: 0, right: 0, zIndex: 201, background: 'var(--white)', borderRadius: '16px 16px 0 0', padding: 24 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{selectedCell.custom_name || selectedCell.code}</div>
            {selectedCell.unit_id && selectedCell.unit_status === 'on_stock' ? (
              <>
                <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 16 }}>{selectedCell.unit_name}</div>
                <Button fullWidth onClick={() => { setCardId(selectedCell.unit_id); setSelected(null) }}>Открыть карточку</Button>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Ячейка свободна</div>
            )}
          </div>
        </div>
      )}

      {cardId && <UnitCardModal unitId={cardId} onClose={() => setCardId(null)} />}
    </WarehouseLayout>
  )
}
