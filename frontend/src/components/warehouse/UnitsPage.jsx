import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import UnitCardModal from '../shared/UnitCardModal'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { STATUS_LABEL, STATUS_COLOR } from '../../constants/statuses'
import { ALL_CATEGORIES, CATEGORY_MAP, categoryLabel } from '../../constants/categories'
import { units as unitsApi, warehouses as warehousesApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../shared/Toast'

const CATEGORIES = ['all', ...ALL_CATEGORIES]
const STATUSES = ['Фильтр', 'На складе', 'Выдано', 'Просрочено', 'На утверждении', 'Списано']
const STATUS_KEY = {
  'На складе': 'on_stock', 'Выдано': 'issued', 'Просрочено': 'overdue',
  'На утверждении': 'pending', 'Списано': 'written_off',
}

const EMPTY_FORM = { name: '', category: ALL_CATEGORIES[0], dimensions: '', description: '', source: 'покупка', qty: 1, warehouse_id: '', cell_id: '', period: '', valuation: '' }
const catOption = (key) => key === 'all' ? 'Выбрать категорию' : categoryLabel(key)

export default function UnitsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [statusFilter, setStatusFilter] = useState('Все статусы')
  const [allUnits, setAllUnits] = useState([])
  const [loading, setLoading] = useState(true)

  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [photos, setPhotos] = useState([])
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [cardId, setCardId] = useState(null)
  const fileRef = useRef()
  const camRef = useRef()

  const canSeeSource = ['warehouse_director', 'warehouse_deputy', 'producer'].includes(user?.role)

  const [warehouses, setWarehouses] = useState([])
  const [cells, setCells] = useState([])

  useEffect(() => {
    unitsApi.list().then(data => setAllUnits(data.units || [])).catch(() => {}).finally(() => setLoading(false))
    warehousesApi.list().then(d => setWarehouses(d.warehouses || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.warehouse_id) { setCells([]); setForm(f => ({ ...f, cell_id: '' })); return }
    warehousesApi.cells(form.warehouse_id).then(d => {
      const allCells = (d.sections || []).flatMap(s => s.cells || [])
      setCells(allCells)
    }).catch(() => setCells([]))
  }, [form.warehouse_id])

  const filtered = allUnits.filter(u => {
    const matchSearch = !search ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.serial || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'all' || u.category === category
    const matchStatus = statusFilter === 'Все статусы' || u.status === STATUS_KEY[statusFilter]
    return matchSearch && matchCat && matchStatus
  })

  function onFilesSelected(e) {
    const files = Array.from(e.target.files)
    setPhotos(prev => [...prev, ...files].slice(0, 5))
  }

  const isDirector = user?.role === 'warehouse_director'

  async function handleAdd() {
    if (!form.name.trim()) return
    if (isDirector && !form.valuation) { setAddError('Укажите стоимость единицы'); return }
    setAdding(true)
    setAddError('')
    try {
      const data = await unitsApi.create({
        name: form.name,
        category: form.category,
        dimensions: form.dimensions || null,
        description: form.description || null,
        source: canSeeSource ? form.source : null,
        qty: Number(form.qty) || 1,
        valuation: form.valuation ? Number(form.valuation) : null,
        warehouse_id: form.warehouse_id || null,
        cell_id: form.cell_id || null,
      })
      const unitId = data.unit?.id
      let photoErrors = 0
      if (unitId && photos.length > 0) {
        for (const file of photos) {
          const fd = new FormData()
          fd.append('photos', file)
          try { await unitsApi.uploadPhoto(unitId, fd) }
          catch { photoErrors++ }
        }
      }
      setShowAdd(false)
      setForm(EMPTY_FORM)
      setPhotos([])
      const d = await unitsApi.list()
      setAllUnits(d.units || [])
      if (photoErrors > 0) {
        toast?.(`Единица создана, но ${photoErrors} фото не загрузилось`, 'error')
      } else {
        toast?.(isDirector ? 'Позиция добавлена на склад' : 'Позиция отправлена на утверждение', 'success')
      }
    } catch (err) {
      setAddError(err.message || 'Ошибка')
    } finally {
      setAdding(false)
    }
  }

  return (
    <WarehouseLayout>
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Склад</h1>
          <Button onClick={() => {
            setForm(EMPTY_FORM); setPhotos([]); setAddError(''); setShowAdd(true)
            warehousesApi.list().then(d => setWarehouses(d.warehouses || [])).catch(() => {})
          }}>+ Новое</Button>
        </div>

        <div style={{ position: 'relative', marginBottom: 14 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 16 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Найдите по названию или серийному номеру..."
            style={{ width: '100%', height: 40, padding: '0 12px 0 36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 14, background: 'var(--white)', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <Select value={statusFilter} onChange={setStatusFilter} options={STATUSES} />
          <select value={category} onChange={e => setCategory(e.target.value)} style={{
            height: 36, padding: '0 10px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)', cursor: 'pointer', color: 'var(--text)',
          }}>
            {CATEGORIES.map(k => <option key={k} value={k}>{catOption(k)}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--muted)', alignSelf: 'center' }}>{filtered.length} ед.</span>
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>Загрузка...</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>Ничего не найдено</div>
          )}
          {filtered.map(u => {
            const isWrittenOff = u.status === 'written_off'
            const photo = u.photo_url
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: isWrittenOff ? 'var(--bg-secondary)' : 'var(--card)',
                borderRadius: 'var(--radius-card)', border: '1px solid var(--border)',
                filter: isWrittenOff ? 'grayscale(1)' : 'none', opacity: isWrittenOff ? 0.6 : 1,
                cursor: 'pointer', position: 'relative',
              }} onClick={() => setCardId(u.id)}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, overflow: 'hidden',
                }}>
                  {photo
                    ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isWrittenOff ? 'blur(2px)' : 'none' }} />
                    : <span>📦</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, textDecoration: isWrittenOff ? 'line-through' : 'none', color: isWrittenOff ? 'var(--muted)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{u.serial ? `${u.serial} · ` : ''}{categoryLabel(u.category)}</div>
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

      {/* Add unit modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-card)', padding: 24, maxWidth: 480, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>Добавить единицу</div>

            <FL>Категория *</FL>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, marginBottom: 12, background: 'var(--white)' }}>
              {ALL_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
            </select>

            <FL>Название *</FL>
            <FI value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Кресло Честерфилд" />

            <FL>Размеры</FL>
            <FI value={form.dimensions} onChange={v => setForm(f => ({ ...f, dimensions: v }))} placeholder="80×60×90 см" />

            {isDirector && (
              <div style={{ marginBottom: 12 }}>
                <FL>Стоимость единицы, ₽ *</FL>
                <FI type="number" value={form.valuation} onChange={v => setForm(f => ({ ...f, valuation: v }))} placeholder="0.00" />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <FL>Количество</FL>
                <FI type="number" value={form.qty} onChange={v => setForm(f => ({ ...f, qty: v }))} placeholder="1" />
              </div>
              {canSeeSource && (
                <div>
                  <FL>Источник</FL>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)' }}>
                    <option value="покупка">Покупка</option>
                    <option value="дарение">Дарение</option>
                    <option value="аренда">Аренда</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <FL>Склад</FL>
                <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value, cell_id: '' }))}
                  style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)' }}>
                  <option value="">— не выбран —</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <FL>Ячейка</FL>
                <select value={form.cell_id} onChange={e => setForm(f => ({ ...f, cell_id: e.target.value }))}
                  disabled={!form.warehouse_id || cells.length === 0}
                  style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)' }}>
                  <option value="">— не выбрана —</option>
                  {cells.map(c => <option key={c.id} value={c.id}>{c.custom_name || c.code}</option>)}
                </select>
              </div>
            </div>

            <FL>Временное понятие</FL>
            <FI value={form.period} onChange={v => setForm(f => ({ ...f, period: v }))} placeholder="Советское, XVIII век, современное..." />

            <FL>Комментарий</FL>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Цвет, состояние, особенности..."
              style={{ width: '100%', height: 72, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, resize: 'vertical', marginBottom: 14, fontFamily: 'inherit' }} />

            <FL>Фотографии (до 5)</FL>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {photos.map((f, i) => (
                <div key={i} style={{ position: 'relative', width: 64, height: 64 }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                  <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -6, right: -6, background: 'var(--red)', border: 'none', borderRadius: '50%', width: 18, height: 18, color: '#fff', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
              {photos.length < 5 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => fileRef.current?.click()}
                    style={{ width: 64, height: 64, borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📁</button>
                  <button onClick={() => camRef.current?.click()}
                    style={{ width: 64, height: 64, borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📷</button>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onFilesSelected} />
            <input ref={camRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={onFilesSelected} />

            {addError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{addError}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" fullWidth onClick={() => setShowAdd(false)}>Отмена</Button>
              <Button fullWidth disabled={!form.name.trim() || adding} onClick={handleAdd}>
                {adding ? 'Сохранение...' : 'Добавить'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {cardId && <UnitCardModal unitId={cardId} onClose={() => setCardId(null)} onChanged={() => {
        unitsApi.list().then(d => setAllUnits(d.units || [])).catch(() => {})
      }} />}
    </WarehouseLayout>
  )
}

function FL({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>{children}</div>
}
function FI({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', height: 38, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, marginBottom: 12, background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }} />
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      height: 36, padding: '0 10px', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)', cursor: 'pointer', color: 'var(--text)',
    }}>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}
