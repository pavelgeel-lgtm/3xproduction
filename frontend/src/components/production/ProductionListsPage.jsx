import { useState, useEffect } from 'react'
import ProductionLayout from './ProductionLayout'
import Button from '../shared/Button'
import Badge from '../shared/Badge'
import { lists as listsApi, documents as docsApi, requests as requestsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'

const LIST_TYPES = {
  props:        { label: 'Реквизит',        icon: '🎭' },
  art_fill:     { label: 'Худ. наполнение', icon: '🖼️' },
  dummy:        { label: 'Бутафория',       icon: '🪆' },
  auto:         { label: 'Автомобили',      icon: '🚗' },
  costumes:     { label: 'Костюмы',         icon: '👗' },
  makeup:       { label: 'Грим',            icon: '💄' },
  stunts:       { label: 'Трюки',           icon: '🤸' },
  pyrotechnics: { label: 'Пиротехника',     icon: '🔥' },
}

const SOURCE_BADGE = {
  kpp:      { label: 'КПП',      bg: 'var(--blue-dim)',  color: 'var(--blue)' },
  scenario: { label: 'Сценарий', bg: 'var(--amber-dim)', color: 'var(--amber)' },
  ai:       { label: 'ИИ',       bg: 'var(--green-dim)', color: 'var(--green)' },
  manual:   { label: 'Вручную',  bg: 'var(--bg)',        color: 'var(--muted)' },
}

const SEE_ALL_ROLES = ['production_designer', 'art_director_assistant', 'director', 'project_director', 'producer']
const TABS = ['Мой список', 'Сверка ИИ']

export default function ProductionListsPage() {
  const { user } = useAuth()
  const role = user?.role || ''
  const roleDef = ROLES[role] || {}
  const ownListTypes = roleDef.ownLists === undefined ? [] :
    (roleDef.ownLists[0] === 'all' ? Object.keys(LIST_TYPES) : roleDef.ownLists)
  const canSeeAll = SEE_ALL_ROLES.includes(role)
  const visibleTypes = canSeeAll ? Object.keys(LIST_TYPES) : ownListTypes

  const [activeType, setActiveType] = useState(visibleTypes[0] || 'props')
  const [tab, setTab] = useState('Мой список')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', scene: '', day: '', time: '', location: '', qty: 1, source: 'manual', note: '' })
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [parsedData, setParsedData] = useState(null)
  const [latestDocId, setLatestDocId] = useState(null)
  const [search, setSearch] = useState('')
  const [multiSelected, setMultiSelected] = useState(new Set())
  const [requesting, setRequesting] = useState(false)

  const canEdit = ownListTypes.includes(activeType)
  const projectId = user?.project_id

  function loadItems(type) {
    setLoading(true)
    setMultiSelected(new Set())
    setSearch('')
    listsApi.items(type, { project_id: projectId })
      .then(data => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (activeType) loadItems(activeType)
  }, [activeType])

  // Load parsed data for cross-check tab
  useEffect(() => {
    if (!projectId) return
    docsApi.parsed(projectId)
      .then(data => setParsedData(data.parsed_data))
      .catch(() => {})
    // Get latest kpp/scenario doc id for import
    docsApi.list(projectId, 'kpp')
      .then(data => {
        const docs = data.documents || []
        if (docs.length) setLatestDocId(docs[0].id)
      })
      .catch(() => {})
  }, [projectId])

  async function handleAdd() {
    if (!addForm.name.trim()) return
    setSaving(true)
    try {
      await listsApi.addItem(activeType, { ...addForm, qty: Number(addForm.qty) || 1 })
      setShowAdd(false)
      setAddForm({ name: '', scene: '', day: '', time: '', location: '', qty: 1, source: 'manual', note: '' })
      loadItems(activeType)
    } catch (err) {
      alert(err.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  async function saveNote(id) {
    try {
      await listsApi.updateItem(id, { note: noteValue })
      setItems(prev => prev.map(i => i.id === id ? { ...i, note: noteValue } : i))
    } catch {}
    setEditingNote(null)
  }

  async function handleAiStatus(id, ai_status) {
    try {
      await listsApi.updateItem(id, { ai_status })
      setItems(prev => prev.map(i => i.id === id ? { ...i, ai_status } : i))
    } catch {}
  }

  function toggleSelect(id) {
    setMultiSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleRequestSelected() {
    const selectedItems = items.filter(i => multiSelected.has(i.id))
    if (!selectedItems.length) return
    setRequesting(true)
    try {
      await requestsApi.create({
        project_id: projectId,
        notes: selectedItems.map(i => i.name).join(', '),
        unit_ids: [],
      })
      setMultiSelected(new Set())
      alert(`Запрошено ${selectedItems.length} позиций`)
    } catch (err) {
      alert(err.message || 'Ошибка запроса')
    } finally {
      setRequesting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Удалить позицию?')) return
    try {
      await listsApi.deleteItem(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      alert(err.message || 'Ошибка')
    }
  }

  async function handleImport() {
    if (!latestDocId) return
    setImporting(true)
    setImportResult(null)
    try {
      const data = await docsApi.importToList(latestDocId)
      setImportResult(data.imported)
      loadItems(activeType)
    } catch (err) {
      alert(err.message || 'Ошибка импорта')
    } finally {
      setImporting(false)
    }
  }

  if (visibleTypes.length === 0) {
    return (
      <ProductionLayout>
        <div style={{ padding: '24px 32px', color: 'var(--muted)', fontSize: 14 }}>
          Нет доступных списков для вашей роли
        </div>
      </ProductionLayout>
    )
  }

  const crossCheck = parsedData?.cross_check || null
  const aiSuggestions = parsedData?.ai_suggestions || []

  return (
    <ProductionLayout>
      <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>{canSeeAll ? 'Все списки' : 'Мои списки'}</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              {ROLES[role]?.label} · Проект #{projectId || '—'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {multiSelected.size > 0 && (
              <Button disabled={requesting} onClick={handleRequestSelected}>
                {requesting ? 'Запрос...' : `Запросить (${multiSelected.size})`}
              </Button>
            )}
            {canEdit && latestDocId && (
              <Button variant="secondary" disabled={importing} onClick={handleImport}>
                {importing ? 'Импорт...' : '🤖 Импорт из КПП'}
              </Button>
            )}
          </div>
        </div>

        {importResult !== null && (
          <div style={{
            background: 'var(--green-dim)', border: '1px solid rgba(22,163,74,0.2)',
            borderRadius: 'var(--radius-card)', padding: '10px 16px',
            fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>✓ Импортировано <strong>{importResult}</strong> позиций из КПП</span>
            <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
          </div>
        )}

        {/* List type tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 0, borderBottom: '2px solid var(--border)', overflowX: 'auto' }}>
          {visibleTypes.map(type => {
            const t = LIST_TYPES[type]
            return (
              <button key={type} onClick={() => setActiveType(type)} style={{
                padding: '9px 16px', border: 'none', background: 'none',
                fontWeight: 500, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 4,
                color: activeType === type ? 'var(--blue)' : 'var(--muted)',
                borderBottom: `2px solid ${activeType === type ? 'var(--blue)' : 'transparent'}`,
                marginBottom: -2,
              }}>
                {t.icon} {t.label}
              </button>
            )
          })}
        </div>

        {/* Sub-tabs: Мой список / Сверка ИИ */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)', marginTop: 0 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 18px', border: 'none', background: 'none',
              fontSize: 13, cursor: 'pointer', fontWeight: 500,
              color: tab === t ? 'var(--accent)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
            }}>{t}</button>
          ))}
        </div>

        {/* MY LIST TAB */}
        {tab === 'Мой список' && (
          loading ? (
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>Загрузка...</div>
          ) : (
            <div>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по названию..."
                  style={{ width: '100%', height: 36, padding: '0 10px 0 32px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {items.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 60px 50px 70px 100px 60px 100px 90px 36px',
                  gap: 6, padding: '6px 12px',
                  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}>
                  <span>Наименование</span><span>Сцена</span><span>День</span>
                  <span>Время</span><span>Локация</span><span>Кол-во</span>
                  <span>Источник</span><span>Пометка</span><span></span>
                </div>
              )}

              {items.filter(i => i.ai_status !== 'rejected' && (!search || i.name.toLowerCase().includes(search.toLowerCase()))).map(item => {
                const src = SOURCE_BADGE[item.source] || SOURCE_BADGE.manual
                const isAI = item.source === 'ai'
                const accepted = item.ai_status === 'accepted'
                return (
                  <div key={item.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 60px 50px 70px 100px 60px 100px 90px 36px',
                    gap: 6, padding: '11px 12px',
                    background: 'var(--white)', borderRadius: 8,
                    border: `1px solid ${isAI && !accepted ? 'rgba(22,163,74,0.2)' : 'var(--border)'}`,
                    marginBottom: 5, alignItems: 'center',
                  }}>
                    <div style={{ fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={multiSelected.has(item.id)} onChange={() => toggleSelect(item.id)}
                        style={{ width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                      {item.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.scene || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.day || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.time || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.location || '—'}</div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{item.qty} шт.</div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 7px', borderRadius: 'var(--radius-badge)',
                        background: src.bg, color: src.color, fontSize: 10, fontWeight: 500, width: 'fit-content',
                      }}>{src.label}</span>
                      {isAI && !accepted && canEdit && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button onClick={() => handleAiStatus(item.id, 'accepted')} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, border: '1px solid var(--green)', background: 'var(--green-dim)', color: 'var(--green)', cursor: 'pointer' }}>✓</button>
                          <button onClick={() => handleAiStatus(item.id, 'rejected')} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
                        </div>
                      )}
                      {accepted && <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ Принято</span>}
                    </div>

                    <div>
                      {editingNote === item.id ? (
                        <div style={{ display: 'flex', gap: 3 }}>
                          <input autoFocus value={noteValue}
                            onChange={e => setNoteValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveNote(item.id); if (e.key === 'Escape') setEditingNote(null) }}
                            style={{ width: '100%', height: 26, padding: '0 5px', fontSize: 11, border: '1px solid var(--blue)', borderRadius: 4, outline: 'none' }}
                          />
                          <button onClick={() => saveNote(item.id)} style={{ background: 'var(--blue)', border: 'none', color: '#fff', borderRadius: 4, padding: '0 5px', cursor: 'pointer', fontSize: 11 }}>✓</button>
                        </div>
                      ) : (
                        <button onClick={() => canEdit ? (setEditingNote(item.id), setNoteValue(item.note || '')) : null}
                          style={{ background: 'none', border: 'none', cursor: canEdit ? 'pointer' : 'default', fontSize: 11, color: item.note ? 'var(--text)' : 'var(--muted)', textAlign: 'left', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.note || (canEdit ? '+ заметка' : '—')}
                        </button>
                      )}
                    </div>

                    {canEdit ? (
                      <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, padding: '0 4px', borderRadius: 4 }}>×</button>
                    ) : <div />}
                  </div>
                )
              })}

              {items.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
                  Список пуст
                  {canEdit && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {latestDocId && <Button variant="secondary" onClick={handleImport}>🤖 Импорт из КПП</Button>}
                      <Button onClick={() => setShowAdd(true)}>+ Добавить вручную</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* CROSS-CHECK TAB */}
        {tab === 'Сверка ИИ' && (
          <div>
            {!parsedData ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
                КПП ещё не загружен или не распознан ИИ
              </div>
            ) : (
              <>
                {/* AI suggestions */}
                {aiSuggestions.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      🤖 Предложения ИИ <Badge color="green">{aiSuggestions.length}</Badge>
                    </div>
                    {aiSuggestions.map((s, i) => (
                      <div key={i} style={{ background: 'var(--white)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 'var(--radius-card)', padding: '14px 16px', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-badge)', background: 'var(--green-dim)', color: 'var(--green)', fontWeight: 500 }}>🤖 ИИ</span>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.category}</span>
                            </div>
                            <div style={{ fontWeight: 500, marginBottom: 4 }}>{s.item}</div>
                            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.reason}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {crossCheck && (
                  <>
                    <CrossSection icon="⚠️" title="Расхождения" color="amber" items={crossCheck.discrepancies || []} label="Расхождение" />
                    <CrossSection icon="🔍" title="Пропуски" color="red" items={crossCheck.missing || []} label="Пропуск" />
                    <CrossSection icon="🔗" title="Сквозные единицы" color="blue" items={crossCheck.cross_items || []} label="Сквозная" />
                  </>
                )}

                {!crossCheck && aiSuggestions.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>Нет данных сверки</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Add item modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowAdd(false)}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-card)', padding: 24, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 18 }}>Добавить позицию · {LIST_TYPES[activeType]?.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <FL>Наименование *</FL>
                <FI value={addForm.name} onChange={v => setAddForm(f => ({ ...f, name: v }))} placeholder="Кресло Честерфилд" />
              </div>
              <div><FL>Сцена</FL><FI value={addForm.scene} onChange={v => setAddForm(f => ({ ...f, scene: v }))} placeholder="12" /></div>
              <div><FL>День съёмок</FL><FI value={addForm.day} onChange={v => setAddForm(f => ({ ...f, day: v }))} placeholder="1" /></div>
              <div><FL>Время</FL><FI value={addForm.time} onChange={v => setAddForm(f => ({ ...f, time: v }))} placeholder="09:00" /></div>
              <div><FL>Кол-во</FL><FI type="number" value={addForm.qty} onChange={v => setAddForm(f => ({ ...f, qty: v }))} placeholder="1" /></div>
              <div style={{ gridColumn: '1 / -1' }}><FL>Локация</FL><FI value={addForm.location} onChange={v => setAddForm(f => ({ ...f, location: v }))} placeholder="Квартира / Офис" /></div>
              <div style={{ gridColumn: '1 / -1' }}><FL>Пометка</FL><FI value={addForm.note} onChange={v => setAddForm(f => ({ ...f, note: v }))} placeholder="Кожаное, коричневое" /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Button variant="secondary" fullWidth onClick={() => setShowAdd(false)}>Отмена</Button>
              <Button fullWidth disabled={!addForm.name.trim() || saving} onClick={handleAdd}>{saving ? 'Сохранение...' : 'Добавить'}</Button>
            </div>
          </div>
        </div>
      )}
    </ProductionLayout>
  )
}

function FL({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: 'var(--muted)' }}>{children}</div>
}
function FI({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }} />
  )
}

function CrossSection({ icon, title, color, items, label }) {
  const bg = { amber: 'var(--amber-dim)', red: 'var(--red-dim)', blue: 'var(--blue-dim)' }
  const cl = { amber: 'var(--amber)', red: 'var(--red)', blue: 'var(--blue)' }
  if (!items.length) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon} {title} <Badge color={color}>{items.length}</Badge>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--white)', border: `1px solid ${cl[color]}30`, borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-badge)', background: bg[color], color: cl[color], fontWeight: 500, flexShrink: 0, marginTop: 1 }}>
            {label}
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}
