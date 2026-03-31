import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductionLayout from './ProductionLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { documents as docsApi, lists as listsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { categoryLabel } from '../../constants/categories'

const DOC_TYPES = {
  kpp:       { label: 'КПП',      icon: '📋', color: 'blue' },
  scenario:  { label: 'Сценарий', icon: '📝', color: 'amber' },
  callsheet: { label: 'Вызывной', icon: '📅', color: 'green' },
}

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

const SEE_ALL_ROLES = [
  'production_designer', 'art_director_assistant', 'director', 'project_director', 'producer',
  'project_deputy_upload', 'project_deputy', 'set_admin', 'assistant_director',
  'gaffer', 'dop', 'camera_mechanic', 'casting_director', 'casting_assistant', 'playback', 'driver',
]
const HIDE_LIST_TYPES_ROLES = ['set_admin', 'project_director']

const UPLOAD_KPP_ROLES = [
  'project_director', 'project_deputy_upload', 'director', 'assistant_director',
  'production_designer', 'art_director_assistant',
  'props_master', 'props_assistant', 'decorator', 'costumer', 'costume_assistant',
  'makeup_artist', 'stunt_coordinator', 'pyrotechnician',
]
const UPLOAD_CALLSHEET_ROLES = [...UPLOAD_KPP_ROLES, 'set_admin']

export default function DocumentsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const role = user?.role || ''
  const allowedFirst = ROLES[role]?.readDocs?.[0] || 'kpp'
  const [tab, setTab] = useState(allowedFirst)

  // Doc state
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCallDate, setActiveCallDate] = useState(null)
  const [docSearch, setDocSearch] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [seasonFilter, setSeasonFilter] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploadType, setUploadType] = useState('kpp')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  // List state
  const roleDef = ROLES[role] || {}
  const ownListTypes = roleDef.ownLists === undefined ? [] :
    (roleDef.ownLists[0] === 'all' ? Object.keys(LIST_TYPES) : roleDef.ownLists)
  const canSeeAllLists = SEE_ALL_ROLES.includes(role)
  const hideListTypes = HIDE_LIST_TYPES_ROLES.includes(role)
  const visibleListTypes = hideListTypes ? [] : (canSeeAllLists ? Object.keys(LIST_TYPES) : ownListTypes)
  const [activeListType] = useState(visibleListTypes[0] || 'props')
  const [listItems, setListItems] = useState([])
  const [listLoading, setListLoading] = useState(false)
  const [listSearch, setListSearch] = useState('')
  const [parsedData, setParsedData] = useState(null)

  const canUpload = tab === 'callsheet'
    ? UPLOAD_CALLSHEET_ROLES.includes(role)
    : UPLOAD_KPP_ROLES.includes(role)

  const allowedDocs = ROLES[role]?.readDocs
  const visibleDocTypes = allowedDocs
    ? Object.fromEntries(Object.entries(DOC_TYPES).filter(([k]) => allowedDocs.includes(k)))
    : DOC_TYPES

  const projectId = user?.project_id || null

  function loadDocs() {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    docsApi.list(projectId).then(data => {
      setDocs(data.documents || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadDocs() }, [projectId])

  useEffect(() => {
    if (tab === 'my_list' && activeListType && projectId) {
      setListLoading(true)
      listsApi.items(activeListType, { project_id: projectId })
        .then(data => setListItems(data.items || []))
        .catch(() => setListItems([]))
        .finally(() => setListLoading(false))
    }
    if (tab === 'ai_check' && projectId) {
      docsApi.parsed(projectId)
        .then(data => setParsedData(data.parsed_data))
        .catch(() => {})
    }
  }, [tab, activeListType, projectId])

  const tabDocs = docs.filter(d => d.type === tab)
  const callDates = [...new Set(docs.filter(d => d.type === 'callsheet').map(d =>
    new Date(d.created_at).toISOString().split('T')[0]
  ))].sort().reverse()
  const curDate = activeCallDate || callDates[0]
  const callsheetDoc = docs.find(d => d.type === 'callsheet' &&
    new Date(d.created_at).toISOString().split('T')[0] === curDate)

  async function handleUpload() {
    if (!uploadFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', uploadFile)
      fd.append('project_id', projectId)
      fd.append('type', uploadType)
      await docsApi.upload(fd)
      setShowUpload(false)
      setUploadFile(null)
      loadDocs()
    } catch (err) {
      alert(err.message || 'Ошибка загрузки')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setUploadFile(file)
  }

  const allTabs = [
    ...Object.entries(visibleDocTypes).map(([key, t]) => ({ key, label: t.label, icon: t.icon })),
    { key: 'my_list', label: 'Мой список', icon: '📄' },
    { key: 'ai_check', label: 'Сверка ИИ', icon: '🤖' },
  ]

  const crossCheck = parsedData?.cross_check || null
  const aiSuggestions = parsedData?.ai_suggestions || []

  return (
    <ProductionLayout>
      <style>{`
        .doc-mobile-filter { display: none; }
        @media (max-width: 768px) {
          .doc-page { padding: 16px !important; }
          .doc-header { flex-direction: column !important; align-items: flex-start !important; gap: 10px !important; }
          .doc-tabs { display: none !important; }
          .doc-mobile-filter { display: block !important; margin-bottom: 20px; }
          .doc-mobile-filter select { width: 100% !important; height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-btn); font-size: 14px; font-weight: 500; background: var(--white); cursor: pointer; color: var(--text); }
          .doc-filters { flex-direction: column !important; align-items: stretch !important; }
          .doc-filters input { min-width: 0 !important; width: 100% !important; height: 40px !important; box-sizing: border-box !important; }
          .doc-filters select { width: 100% !important; }
          .doc-item-row { flex-wrap: wrap !important; gap: 10px !important; }
          .doc-item-actions { width: 100% !important; display: flex !important; }
          .doc-item-actions a, .doc-item-actions button { flex: 1 !important; text-align: center !important; }
          .doc-list-grid { display: flex !important; flex-direction: column !important; gap: 8px !important; }
          .doc-list-grid-header { display: none !important; }
          .doc-list-row { display: flex !important; flex-direction: column !important; gap: 4px !important; padding: 12px !important; }
          .doc-list-row > div { font-size: 13px !important; }
          .doc-list-search input { width: 100% !important; height: 40px !important; box-sizing: border-box !important; }
        }
      `}</style>
      <div className="doc-page" style={{ padding: '24px 32px', maxWidth: 860 }}>
        <div className="doc-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Записи</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Проект #{projectId}</p>
          </div>
          {canUpload && DOC_TYPES[tab] && (
            <Button onClick={() => { setUploadType(tab); setShowUpload(true) }}>+ Загрузить</Button>
          )}
        </div>

        {/* Mobile filter select */}
        <div className="doc-mobile-filter">
          <select value={tab} onChange={e => setTab(e.target.value)}>
            <option value="" disabled>Выбрать</option>
            {allTabs.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>

        {/* Tab bar — desktop only */}
        <div className="doc-tabs" style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
          {allTabs.map(t => (
            <button key={t.key} className="doc-tab-btn" onClick={() => setTab(t.key)} style={{
              padding: '10px 20px', border: 'none', background: 'none',
              fontWeight: 500, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              color: tab === t.key ? 'var(--blue)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
              marginBottom: -1, flexShrink: 0,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && DOC_TYPES[tab] && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Загрузка...</div>}

        {/* КПП / Сценарий */}
        {(tab === 'kpp' || tab === 'scenario') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="doc-filters" style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <input value={docSearch} onChange={e => setDocSearch(e.target.value)}
                placeholder="Найдите..."
                style={{ flex: 1, minWidth: 140, height: 40, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              <select value={blockFilter} onChange={e => setBlockFilter(e.target.value)}
                style={{ height: 40, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, background: blockFilter ? 'var(--blue-dim)' : 'var(--white)', color: blockFilter ? 'var(--blue)' : 'var(--text)', cursor: 'pointer' }}>
                <option value="">Блок</option>
                {Array.from({ length: 50 }, (_, i) => i + 1).map(n => <option key={n} value={n}>Блок {n}</option>)}
              </select>
              <select value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)}
                style={{ height: 40, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, background: seasonFilter ? 'var(--blue-dim)' : 'var(--white)', color: seasonFilter ? 'var(--blue)' : 'var(--text)', cursor: 'pointer' }}>
                <option value="">Сезон</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>Сезон {n}</option>)}
              </select>
            </div>
            {tabDocs.filter(d => {
              const name = (d.original_name || d.file_url || '').toLowerCase()
              if (docSearch && !name.includes(docSearch.toLowerCase())) return false
              if (blockFilter && !name.includes(`блок ${blockFilter}`)) return false
              if (seasonFilter && !name.includes(`сезон ${seasonFilter}`)) return false
              return true
            }).map((doc, i) => (
              <div key={doc.id} style={{
                background: 'var(--white)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)', padding: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: DOC_TYPES[doc.type].color === 'blue' ? 'var(--blue-dim)' : 'var(--amber-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {DOC_TYPES[doc.type].icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>v{doc.version}</span>
                      <Badge color={i === 0 ? 'blue' : 'muted'}>v{doc.version}</Badge>
                      {i === 0 && <Badge color="green">Актуальная</Badge>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                      {new Date(doc.created_at).toLocaleDateString('ru-RU')} · {doc.uploaded_by_name || '—'}
                    </div>

                    {doc.delta && (() => {
                      let d = doc.delta
                      if (typeof d === 'string') try { d = JSON.parse(d) } catch {}
                      return (
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {d.added?.length > 0 && <DeltaBadge color="green" icon="+" label={`Добавлено ${d.added.length}`} />}
                          {d.changed?.length > 0 && <DeltaBadge color="amber" icon="~" label={`Изменено ${d.changed.length}`} />}
                          {d.removed?.length > 0 && <DeltaBadge color="red" icon="−" label={`Удалено ${d.removed.length}`} />}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="doc-item-actions" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {doc.parsed_content && (
                      <Button variant="secondary" style={{ height: 34, fontSize: 13, padding: '0 12px' }}
                        onClick={() => navigate(`/production/documents/${projectId}/${doc.id}`)}>
                        Открыть
                      </Button>
                    )}
                    {!doc.parsed_content && doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer">
                        <Button variant="secondary" style={{ height: 34, fontSize: 13, padding: '0 12px' }}>Скачать</Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {!loading && tabDocs.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
                Нет документов
              </div>
            )}
          </div>
        )}

        {/* Вызывной */}
        {tab === 'callsheet' && (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 160, flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Даты
              </div>
              {callDates.map(d => {
                const isToday = d === new Date().toISOString().split('T')[0]
                return (
                  <button key={d} onClick={() => setActiveCallDate(d)} style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 4,
                    border: `1px solid ${curDate === d ? 'var(--blue)' : 'var(--border)'}`,
                    background: curDate === d ? 'var(--blue-dim)' : 'var(--white)',
                    color: curDate === d ? 'var(--blue)' : 'var(--text)',
                    fontSize: 13, fontWeight: curDate === d ? 600 : 400,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    {new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    {isToday && <span style={{ fontSize: 10, background: 'var(--blue)', color: '#fff', padding: '1px 6px', borderRadius: 8 }}>Сегодня</span>}
                  </button>
                )
              })}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {callsheetDoc ? (
                <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Вызывной</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {new Date(callsheetDoc.created_at).toLocaleDateString('ru-RU')} · {callsheetDoc.uploaded_by_name || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {callsheetDoc.parsed_content && (
                        <Button variant="secondary" style={{ height: 34, fontSize: 13 }}
                          onClick={() => navigate(`/production/documents/${projectId}/${callsheetDoc.id}`)}>
                          Открыть
                        </Button>
                      )}
                      {callsheetDoc.file_url && (
                        <a href={callsheetDoc.file_url} target="_blank" rel="noreferrer">
                          <Button variant="secondary" style={{ height: 34, fontSize: 13 }}>Скачать</Button>
                        </a>
                      )}
                    </div>
                  </div>
                  {callsheetDoc.parsed_content ? (
                    <div style={{ padding: '16px 20px', fontSize: 13 }}>
                      {(() => {
                        const c = typeof callsheetDoc.parsed_content === 'string' ? JSON.parse(callsheetDoc.parsed_content) : callsheetDoc.parsed_content
                        return (
                          <div>
                            {c.cast?.length > 0 && c.cast.map((a, i) => (
                              <div key={i} style={{ display: 'flex', gap: 16, padding: '6px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 500, minWidth: 120 }}>{a.role}</span>
                                <span>{a.actor}</span>
                                <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>{a.call}</span>
                              </div>
                            ))}
                            {(!c.cast || c.cast.length === 0) && <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Нет данных</div>}
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontSize: 14 }}>
                      Загрузите вызывной (.xlsx)
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
                  Нет вызывного на эту дату
                </div>
              )}
            </div>
          </div>
        )}

        {/* Мой список */}
        {tab === 'my_list' && (
          <div>
            {listLoading ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Загрузка...</div>
            ) : (
              <>
                <div className="doc-list-search" style={{ position: 'relative', marginBottom: 14 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>🔍</span>
                  <input value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Найдите по названию..."
                    style={{ width: '100%', height: 40, padding: '0 10px 0 32px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, background: 'var(--white)', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Desktop: grid header */}
                {listItems.length > 0 && (
                  <div className="doc-list-grid-header" style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 60px 50px 70px 100px 60px 100px',
                    gap: 6, padding: '6px 12px',
                    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    <span>Наименование</span><span>Сцена</span><span>День</span>
                    <span>Время</span><span>Локация</span><span>Кол-во</span>
                    <span>Источник</span>
                  </div>
                )}

                <div className="doc-list-grid">
                  {listItems
                    .filter(i => i.ai_status !== 'rejected' && (!listSearch || i.name.toLowerCase().includes(listSearch.toLowerCase())))
                    .map(item => {
                      const src = SOURCE_BADGE[item.source] || SOURCE_BADGE.manual
                      return (
                        <div key={item.id} className="doc-list-row" style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 60px 50px 70px 100px 60px 100px',
                          gap: 6, padding: '11px 12px',
                          background: 'var(--white)', borderRadius: 8,
                          border: '1px solid var(--border)',
                          marginBottom: 4, alignItems: 'center',
                        }}>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.scene || '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.day || '—'}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.time || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.location || '—'}</div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{item.qty} шт.</div>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 7px', borderRadius: 'var(--radius-badge)',
                            background: src.bg, color: src.color, fontSize: 10, fontWeight: 500, width: 'fit-content',
                          }}>{src.label}</span>
                        </div>
                      )
                    })}
                </div>

                {listItems.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
                    Список пуст
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Сверка ИИ */}
        {tab === 'ai_check' && (
          <div>
            {!parsedData ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>
                КПП ещё не загружен или не распознан ИИ
              </div>
            ) : (
              <>
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
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{categoryLabel(s.category)}</span>
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

        {/* Upload modal */}
        {showUpload && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }} onClick={() => setShowUpload(false)}>
            <div style={{
              background: 'var(--white)', borderRadius: 'var(--radius-card)',
              padding: 28, maxWidth: 480, width: '100%',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20 }}>Загрузить документ</div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Тип документа</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(DOC_TYPES).map(([key, t]) => (
                    <button key={key} style={{
                      flex: 1, height: 38, borderRadius: 'var(--radius-btn)',
                      border: `1px solid ${uploadType === key ? 'var(--blue)' : 'var(--border)'}`,
                      background: uploadType === key ? 'var(--blue-dim)' : 'var(--white)',
                      color: uploadType === key ? 'var(--blue)' : 'var(--muted)',
                      fontSize: 13, cursor: 'pointer',
                    }} onClick={() => setUploadType(key)}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                  border: `2px dashed ${dragging ? 'var(--blue)' : uploadFile ? 'var(--green)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-card)',
                  padding: '40px 20px', textAlign: 'center',
                  background: dragging ? 'var(--blue-dim)' : uploadFile ? 'var(--green-dim)' : 'var(--bg)',
                  marginBottom: 20, cursor: 'pointer', transition: 'all 0.2s',
                }}
                onClick={() => fileRef.current?.click()}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
                {uploadFile ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{uploadFile.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Нажмите чтобы заменить</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Перетащите файл или нажмите</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>xlsx / docx, до 50 МБ</div>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.docx" style={{ display: 'none' }}
                  onChange={e => setUploadFile(e.target.files[0] || null)} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" fullWidth onClick={() => { setShowUpload(false); setUploadFile(null) }}>Отмена</Button>
                <Button fullWidth disabled={!uploadFile || uploading} onClick={handleUpload}>
                  {uploading ? 'Загрузка...' : 'Загрузить'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProductionLayout>
  )
}

function DeltaBadge({ color, icon, label }) {
  const bg = { green: 'var(--green-dim)', amber: 'var(--amber-dim)', red: 'var(--red-dim)' }
  const cl = { green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 'var(--radius-badge)',
      background: bg[color], color: cl[color], fontSize: 12, fontWeight: 500,
    }}>
      <span>{icon}</span>{label}
    </span>
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
