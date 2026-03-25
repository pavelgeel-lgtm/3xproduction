import { useState, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'
import Badge from './Badge'
import Button from './Button'
import { units as unitsApi, warehouses as warehousesApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { STATUS_LABEL, STATUS_COLOR } from '../../constants/statuses'

const WAREHOUSE_ROLES = ['warehouse_director', 'warehouse_deputy', 'warehouse_staff']
const DIRECTOR_ROLES  = ['warehouse_director', 'warehouse_deputy']

export default function UnitCardModal({ unitId, onClose }) {
  const { user } = useAuth()
  const [unit, setUnit]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

  // Cell assignment
  const [showCell, setShowCell]       = useState(false)
  const [warehouses, setWarehouses]   = useState([])
  const [cells, setCells]             = useState([])
  const [selWh, setSelWh]             = useState('')
  const [selCell, setSelCell]         = useState('')
  const [cellSaving, setCellSaving]   = useState(false)

  // Writeoff
  const [showWriteoff, setShowWriteoff]     = useState(false)
  const [writeoffReason, setWriteoffReason] = useState('')

  const isWarehouse = WAREHOUSE_ROLES.includes(user?.role)
  const isDirector  = DIRECTOR_ROLES.includes(user?.role)

  useEffect(() => {
    unitsApi.get(unitId)
      .then(d => { setUnit(d.unit); setLoading(false) })
      .catch(() => setLoading(false))
  }, [unitId])

  // Load warehouses when cell panel opens
  useEffect(() => {
    if (!showCell) return
    warehousesApi.list().then(d => setWarehouses(d.warehouses || d || []))
  }, [showCell])

  // Load cells when warehouse selected
  useEffect(() => {
    if (!selWh) { setCells([]); setSelCell(''); return }
    warehousesApi.cells(selWh).then(d => setCells(d.cells || d || []))
  }, [selWh])

  async function handleAssignCell() {
    if (!selCell) return
    setCellSaving(true)
    try {
      const u = unit
      await unitsApi.update(unitId, {
        name: u.name, category: u.category, serial: u.serial,
        warehouse_id: selWh, cell_id: selCell,
        description: u.description, qty: u.qty,
        condition: u.condition, valuation: u.valuation,
      })
      const d = await unitsApi.get(unitId)
      setUnit(d.unit)
      setShowCell(false)
      setSelWh(''); setSelCell('')
    } catch(e) { /* ignore */ }
    setCellSaving(false)
  }

  async function handleWriteoff() {
    if (!writeoffReason.trim()) return
    await unitsApi.writeoff(unitId, writeoffReason)
    onClose()
  }

  if (loading) return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 32, color: 'var(--muted)', fontSize: 14 }}>Загрузка...</div>
      </div>
    </div>
  )

  if (!unit) return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 32, color: 'var(--red)', fontSize: 14 }}>Единица не найдена</div>
      </div>
    </div>
  )

  const photos = unit.photos || []
  const cellLabel = unit.cell_custom || unit.cell_code || unit.cell_name || '—'

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{unit.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{unit.category}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge color={STATUS_COLOR[unit.status]}>{STATUS_LABEL[unit.status]}</Badge>
            <button style={styles.closeBtn} onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div style={styles.body}>
          {/* Photos */}
          {photos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={styles.mainPhoto}>
                {photos[activePhoto]?.url
                  ? <img src={photos[activePhoto].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'var(--muted)', fontSize: 13 }}>📷</span>
                }
              </div>
              {photos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {photos.map((p, i) => (
                    <div key={i} onClick={() => setActivePhoto(i)} style={{
                      width: 48, height: 48, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                      border: `2px solid ${i === activePhoto ? 'var(--blue)' : 'var(--border)'}`,
                    }}>
                      {p.url
                        ? <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--muted)' }}>📷</div>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info rows */}
          <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-card)', padding: '4px 14px', marginBottom: 14 }}>
            {unit.serial     && <InfoRow label="Серийный номер" value={unit.serial} />}
            {unit.warehouse_name && <InfoRow label="Склад"      value={unit.warehouse_name} />}
            <InfoRow label="Ячейка" value={cellLabel} />
            {unit.qty        && <InfoRow label="Количество"     value={`${unit.qty} шт.`} />}
            {unit.dimensions && <InfoRow label="Размеры"        value={unit.dimensions} />}
            {unit.condition  && <InfoRow label="Состояние"      value={unit.condition} />}
            {unit.source     && <InfoRow label="Источник"       value={unit.source} />}
            {unit.valuation  && <InfoRow label="Стоимость"      value={`${Number(unit.valuation).toLocaleString('ru-RU')} ₽`} last />}
          </div>

          {unit.description && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Описание</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>{unit.description}</div>
            </div>
          )}

          {/* Warehouse buttons */}
          {isWarehouse && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <Button onClick={() => { setShowCell(v => !v); setShowWriteoff(false) }}>
                Ячейка <ChevronDown size={13} style={{ marginLeft: 4, transform: showCell ? 'rotate(180deg)' : 'none', transition: '0.15s' }} />
              </Button>
              {isDirector && (
                <Button variant="secondary" style={{ color: 'var(--red)' }}
                  onClick={() => { setShowWriteoff(v => !v); setShowCell(false) }}>
                  Списать
                </Button>
              )}
            </div>
          )}

          {/* Cell assignment panel */}
          {showCell && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, marginBottom: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Назначить ячейку</div>
              <select value={selWh} onChange={e => setSelWh(e.target.value)} style={styles.select}>
                <option value="">— Выберите склад —</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              {cells.length > 0 && (
                <select value={selCell} onChange={e => setSelCell(e.target.value)} style={{ ...styles.select, marginTop: 8 }}>
                  <option value="">— Выберите ячейку —</option>
                  {cells.map(c => <option key={c.id} value={c.id}>{c.custom_name || c.code}</option>)}
                </select>
              )}
              <Button
                style={{ marginTop: 10, width: '100%' }}
                onClick={handleAssignCell}
                disabled={!selCell || cellSaving}
              >
                {cellSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          )}

          {/* Writeoff panel */}
          {showWriteoff && (
            <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Причина списания</div>
              <textarea
                value={writeoffReason}
                onChange={e => setWriteoffReason(e.target.value)}
                placeholder="Сломано, утеряно, износ..."
                style={{ width: '100%', height: 70, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <Button variant="secondary" fullWidth onClick={() => setShowWriteoff(false)}>Отмена</Button>
                <Button fullWidth style={{ background: 'var(--red)', borderColor: 'var(--red)' }} onClick={handleWriteoff}>
                  Списать
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 13, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  modal: {
    background: 'var(--white)', borderRadius: 'var(--radius-card)',
    width: '100%', maxWidth: 480,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0,
  },
  body: {
    padding: '16px 20px 20px', overflowY: 'auto', flex: 1,
  },
  mainPhoto: {
    width: '100%', aspectRatio: '16/9',
    background: 'var(--bg)', borderRadius: 10, overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border)',
  },
  closeBtn: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--muted)', padding: 4, display: 'flex', alignItems: 'center',
  },
  select: {
    width: '100%', padding: '8px 10px', border: '1px solid var(--border)',
    borderRadius: 8, fontSize: 13, background: 'var(--white)', fontFamily: 'inherit',
    color: 'var(--text)',
  },
}
