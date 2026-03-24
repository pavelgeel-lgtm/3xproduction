import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductionLayout from './ProductionLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import { documents as docsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'

const DOC_TYPES = {
  kpp:       { label: 'КПП',      icon: '📋', color: 'blue' },
  scenario:  { label: 'Сценарий', icon: '📝', color: 'amber' },
  callsheet: { label: 'Вызывной', icon: '📅', color: 'green' },
}

const UPLOAD_KPP_ROLES = [
  'project_deputy_upload', 'production_designer', 'art_director_assistant',
  'props_master', 'props_assistant', 'decorator', 'costumer', 'costume_assistant',
  'makeup_artist', 'stunt_coordinator', 'pyrotechnician',
]
const UPLOAD_CALLSHEET_ROLES = [...UPLOAD_KPP_ROLES, 'set_admin', 'assistant_director']

// Use a fixed project_id from user or first available
const PROJECT_ID = 1

export default function DocumentsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const allowedFirst = ROLES[user?.role]?.readDocs?.[0] || 'kpp'
  const [tab, setTab] = useState(allowedFirst)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCallDate, setActiveCallDate] = useState(null)
  const [docSearch, setDocSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploadType, setUploadType] = useState('kpp')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const canUpload = tab === 'callsheet'
    ? UPLOAD_CALLSHEET_ROLES.includes(user?.role)
    : UPLOAD_KPP_ROLES.includes(user?.role)

  // Filter tabs by role's readDocs — if defined, show only allowed tabs
  const allowedDocs = ROLES[user?.role]?.readDocs
  const visibleDocTypes = allowedDocs
    ? Object.fromEntries(Object.entries(DOC_TYPES).filter(([k]) => allowedDocs.includes(k)))
    : DOC_TYPES

  const projectId = user?.project_id || PROJECT_ID

  function loadDocs() {
    setLoading(true)
    docsApi.list(projectId).then(data => {
      setDocs(data.documents || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadDocs() }, [projectId])

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

  return (
    <ProductionLayout>
      <div style={{ padding: '24px 32px', maxWidth: 860 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Документы</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Проект #{projectId}</p>
          </div>
          {canUpload && (
            <Button onClick={() => { setUploadType(tab); setShowUpload(true) }}>+ Загрузить</Button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
          {Object.entries(visibleDocTypes).map(([key, t]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px', border: 'none', background: 'none',
              fontWeight: 500, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              color: tab === key ? 'var(--blue)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--blue)' : 'transparent'}`,
              marginBottom: -2,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Загрузка...</div>}

        {(tab === 'kpp' || tab === 'scenario') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
              <input value={docSearch} onChange={e => setDocSearch(e.target.value)}
                placeholder="Поиск по блоку, сезону..."
                style={{ flex: 1, minWidth: 180, height: 36, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, outline: 'none' }} />
              {['Блок 1','Блок 2','Блок 3','Сезон 1','Сезон 2'].map(b => (
                <button key={b} onClick={() => setDocSearch(docSearch === b ? '' : b)} style={{
                  height: 36, padding: '0 12px', borderRadius: 'var(--radius-btn)', fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${docSearch === b ? 'var(--blue)' : 'var(--border)'}`,
                  background: docSearch === b ? 'var(--blue-dim)' : 'var(--white)',
                  color: docSearch === b ? 'var(--blue)' : 'var(--muted)',
                }}>{b}</button>
              ))}
            </div>
            {tabDocs.filter(d => !docSearch || (d.original_name || d.file_url || '').toLowerCase().includes(docSearch.toLowerCase())).map((doc, i) => (
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

                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer">
                        <Button variant="secondary" style={{ height: 34, fontSize: 13, padding: '0 12px' }}>Открыть</Button>
                      </a>
                    )}
                    {i === 0 && (
                      <Button variant="secondary" style={{ height: 34, fontSize: 13, padding: '0 12px' }}
                        onClick={() => navigate('/production/lists')}>
                        Списки →
                      </Button>
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

        {tab === 'callsheet' && (
          <div style={{ display: 'flex', gap: 20 }}>
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

            <div style={{ flex: 1 }}>
              {callsheetDoc ? (
                <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Вызывной</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {new Date(callsheetDoc.created_at).toLocaleDateString('ru-RU')} · {callsheetDoc.uploaded_by_name || '—'}
                      </div>
                    </div>
                    {callsheetDoc.file_url && (
                      <a href={callsheetDoc.file_url} target="_blank" rel="noreferrer">
                        <Button variant="secondary" style={{ height: 34, fontSize: 13 }}>Скачать</Button>
                      </a>
                    )}
                  </div>
                  <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--muted)', fontSize: 14, flexDirection: 'column', gap: 12 }}>
                    <span style={{ fontSize: 40 }}>📅</span>
                    <span>Просмотр PDF</span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
                  Нет вызывного на эту дату
                </div>
              )}
            </div>
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
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>PDF, до 50 МБ</div>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }}
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
