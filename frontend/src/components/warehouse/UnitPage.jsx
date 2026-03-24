import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { STATUS_LABEL, STATUS_COLOR } from '../../constants/statuses'
import { units as unitsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

export default function UnitPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuth()
  const [unit, setUnit] = useState(null)
  const [history, setHistory] = useState([])
  const [activePhoto, setActivePhoto] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showWriteoff, setShowWriteoff] = useState(false)
  const [writeoffReason, setWriteoffReason] = useState('')

  const isDirectorOrDeputy = ['warehouse_director', 'warehouse_deputy'].includes(user?.role)
  const canSeeValuation = ['warehouse_director', 'warehouse_deputy', 'producer'].includes(user?.role)

  useEffect(() => {
    Promise.all([
      unitsApi.get(id),
      isDirectorOrDeputy ? unitsApi.history(id) : Promise.resolve({ history: [] }),
    ]).then(([uData, hData]) => {
      setUnit(uData.unit)
      setHistory(hData.history || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <WarehouseLayout>
        <div style={{ padding: '24px 32px', color: 'var(--muted)', fontSize: 14 }}>Загрузка...</div>
      </WarehouseLayout>
    )
  }

  if (!unit) {
    return (
      <WarehouseLayout>
        <div style={{ padding: '24px 32px', color: 'var(--red)', fontSize: 14 }}>Единица не найдена</div>
      </WarehouseLayout>
    )
  }

  const photos = unit.photos || []

  return (
    <WarehouseLayout>
      <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          <span style={{ cursor: 'pointer', color: 'var(--blue)' }} onClick={() => navigate('/units')}>Склад</span>
          <span>›</span>
          <span>{unit.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left column */}
          <div>
            <div style={{
              aspectRatio: '4/3', background: 'var(--bg)',
              borderRadius: 'var(--radius-card)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10, overflow: 'hidden',
            }}>
              {photos[activePhoto]?.url ? (
                <img src={photos[activePhoto].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>📷 Нет фото</span>
              )}
            </div>
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8 }}>
                {photos.map((p, i) => (
                  <div key={i} onClick={() => setActivePhoto(i)} style={{
                    flex: 1, aspectRatio: '1', background: 'var(--bg)',
                    borderRadius: 8, border: `2px solid ${i === activePhoto ? 'var(--blue)' : 'var(--border)'}`,
                    cursor: 'pointer', overflow: 'hidden',
                  }}>
                    {p.url ? (
                      <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 11, color: 'var(--muted)' }}>📷</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isDirectorOrDeputy && history.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>История движения</div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
                  {history.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 18, position: 'relative' }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                        background: h.action === 'Выдано' ? 'var(--blue)' : h.action === 'Возврат' ? 'var(--green)' : 'var(--border)',
                        border: '2px solid var(--white)', zIndex: 1,
                      }} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{h.action}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {h.user_name || '—'} · {new Date(h.created_at).toLocaleDateString('ru-RU')}
                          {h.notes && ` · ${h.notes}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{unit.name}</h1>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{unit.category}</div>
              </div>
              <Badge color={STATUS_COLOR[unit.status]}>{STATUS_LABEL[unit.status]}</Badge>
            </div>

            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 16 }}>
              <InfoRow label="Серийный номер" value={unit.serial} />
              {unit.warehouse_name && <InfoRow label="Склад" value={unit.warehouse_name} />}
              {unit.cell_name && <InfoRow label="Ячейка" value={unit.cell_name} />}
              {unit.qty && <InfoRow label="Количество" value={`${unit.qty} шт.`} />}
              {unit.dimensions && <InfoRow label="Размеры" value={unit.dimensions} />}
              {canSeeValuation && unit.source && <InfoRow label="Источник" value={unit.source} />}
              {unit.condition && <InfoRow label="Состояние" value={unit.condition} last />}
            </div>

            {unit.description && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Описание</div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{unit.description}</div>
              </div>
            )}

            {canSeeValuation && unit.valuation && (
              <div style={{
                background: 'var(--green-dim)', borderRadius: 8,
                padding: '10px 14px', marginBottom: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Оценочная стоимость</span>
                <span style={{ fontWeight: 600, color: 'var(--green)' }}>
                  {Number(unit.valuation).toLocaleString('ru-RU')} ₽
                </span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button onClick={() => navigate(`/issue/${unit.id}`)}>Выдать</Button>
              {isDirectorOrDeputy && (
                <Button variant="secondary" style={{ color: 'var(--muted)' }}
                  onClick={() => { setWriteoffReason(''); setShowWriteoff(true) }}>
                  Списать
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      {showWriteoff && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowWriteoff(false)}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-card)', padding: 24, maxWidth: 400, width: '100%' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Списание: {unit.name}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>Укажите причину списания</div>
            <textarea value={writeoffReason} onChange={e => setWriteoffReason(e.target.value)}
              placeholder="Сломано, утеряно, износ..."
              style={{ width: '100%', height: 80, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, resize: 'vertical', marginBottom: 16, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" fullWidth onClick={() => setShowWriteoff(false)}>Отмена</Button>
              <Button fullWidth style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                onClick={() => unitsApi.writeoff(unit.id, writeoffReason).then(() => navigate('/units'))}>
                Списать
              </Button>
            </div>
          </div>
        </div>
      )}
    </WarehouseLayout>
  )
}

function InfoRow({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: last ? 0 : 10, marginBottom: last ? 0 : 10,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 13, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}
