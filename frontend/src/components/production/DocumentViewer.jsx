import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ProductionLayout from './ProductionLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import UnitCardModal from '../shared/UnitCardModal'
import { documents as docsApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

const TYPE_LABELS = { kpp: 'КПП', scenario: 'Сценарий', callsheet: 'Вызывной' }

export default function DocumentViewer() {
  const { projectId, docId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [doc, setDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [charFilter, setCharFilter] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [expandedScene, setExpandedScene] = useState(null)

  useEffect(() => {
    docsApi.view(projectId, docId)
      .then(d => setDoc(d.document))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projectId, docId])

  const content = doc?.parsed_content
  const matched = useMemo(() => {
    if (!doc?.matched_units) return {}
    const map = {}
    const units = typeof doc.matched_units === 'string' ? JSON.parse(doc.matched_units) : doc.matched_units
    for (const m of (units || [])) {
      map[m.text.toLowerCase()] = m
    }
    return map
  }, [doc?.matched_units])

  const delta = useMemo(() => {
    if (!doc?.delta) return null
    const d = typeof doc.delta === 'string' ? JSON.parse(doc.delta) : doc.delta
    // scene_changes is nested if both Groq and scene deltas exist
    return d.scene_changes || d
  }, [doc?.delta])

  // Collect unique days and characters for filters
  const { days, characters } = useMemo(() => {
    if (!content?.scenes) return { days: [], characters: [] }
    const d = new Set(), c = new Set()
    for (const s of content.scenes) {
      if (s.day) d.add(s.day)
      for (const ch of (s.characters || [])) c.add(ch)
    }
    return { days: [...d].sort((a, b) => Number(a) - Number(b)), characters: [...c].sort() }
  }, [content])

  // Filter scenes
  const filteredScenes = useMemo(() => {
    if (!content?.scenes) return []
    return content.scenes.filter(s => {
      if (dayFilter && s.day !== dayFilter) return false
      if (charFilter && !(s.characters || []).includes(charFilter)) return false
      if (search) {
        const q = search.toLowerCase()
        const text = `${s.id} ${s.object} ${s.synopsis} ${(s.props||[]).join(' ')} ${(s.costumes||[]).join(' ')} ${(s.characters||[]).join(' ')}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
  }, [content, dayFilter, charFilter, search])

  if (loading) return <ProductionLayout><div style={{ padding: 32, color: 'var(--muted)' }}>Загрузка...</div></ProductionLayout>
  if (!doc) return <ProductionLayout><div style={{ padding: 32, color: 'var(--muted)' }}>Док��мент не найден</div></ProductionLayout>

  // Render callsheet
  if (content?.type === 'callsheet') return (
    <ProductionLayout>
      <div style={{ padding: '24px 32px', maxWidth: 900 }}>
        <BackHeader doc={doc} navigate={navigate} />
        <CallsheetTabs content={content} />
      </div>
    </ProductionLayout>
  )

  // KPP or Scenario
  return (
    <ProductionLayout>
      <style>{`
        @media (max-width: 768px) {
          .dv-page { padding: 16px !important; }
          .dv-filters { flex-direction: column !important; }
          .dv-scene-row { flex-direction: column !important; }
          .dv-scene-meta { flex-direction: column !important; gap: 4px !important; }
        }
      `}</style>
      <div className="dv-page" style={{ padding: '24px 32px', maxWidth: 960 }}>
        <BackHeader doc={doc} navigate={navigate} />

        {/* Delta banner */}
        {delta && (delta.added?.length > 0 || delta.changed?.length > 0 || delta.removed?.length > 0) && (
          <DeltaBanner delta={delta} />
        )}

        {/* Filters */}
        <div className="dv-filters" style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по сценам..."
            style={{ flex: 1, minWidth: 160, height: 36, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13 }} />
          <select value={dayFilter} onChange={e => setDayFilter(e.target.value)}
            style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13 }}>
            <option value="">Все дни</option>
            {days.map(d => <option key={d} value={d}>СД {d}</option>)}
          </select>
          <select value={charFilter} onChange={e => setCharFilter(e.target.value)}
            style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13 }}>
            <option value="">��се персонажи</option>
            {characters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Shoot days navigation (KPP only) */}
        {content?.shoot_days?.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {content.shoot_days.map(sd => (
              <button key={sd.day_number} onClick={() => setDayFilter(dayFilter === '' ? '' : '')}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-btn)', border: '1px solid var(--border)',
                  background: 'var(--white)', fontSize: 12, cursor: 'pointer',
                }}>
                С/Д {sd.day_number} · {sd.date} · {sd.scenes.length} сц.
              </button>
            ))}
          </div>
        )}

        {/* Scenes table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredScenes.map(scene => {
            const sceneChange = delta?.changed?.find(c => c.id === scene.id)
            const isNew = delta?.added?.some(a => a.id === scene.id)
            const bgColor = isNew ? 'rgba(34,197,94,0.06)' : sceneChange ? 'rgba(234,179,8,0.06)' : 'var(--white)'

            return (
              <div key={scene.id} style={{
                background: bgColor, border: '1px solid var(--border)',
                borderRadius: 'var(--radius-card)', padding: '14px 18px',
                borderLeft: isNew ? '3px solid var(--green)' : sceneChange ? '3px solid var(--amber)' : undefined,
              }}>
                {/* Scene header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap', cursor: 'pointer' }}
                  onClick={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}>
                  <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'monospace' }}>{scene.id}.</span>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{scene.object}</span>
                  <Badge color="muted">{scene.mode}</Badge>
                  {scene.int_nat && <Badge color="muted">{scene.int_nat}</Badge>}
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>СД {scene.day}</span>
                  {scene.duration && <span style={{ fontSize: 12, color: 'var(--muted)' }}>({scene.duration})</span>}
                  {isNew && <Badge color="green">Н��ВАЯ</Badge>}
                  {sceneChange && <Badge color="amber">ИЗМЕНЕНА</Badge>}
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
                    {expandedScene === scene.id ? '▲' : '▼'}
                  </span>
                </div>

                {/* Characters */}
                {scene.characters?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                    {scene.characters.map(c => (
                      <span key={c} style={{
                        padding: '2px 8px', borderRadius: 'var(--radius-badge)',
                        background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: 11, fontWeight: 500,
                      }}>{c}</span>
                    ))}
                  </div>
                )}

                {/* Props with warehouse matching */}
                {scene.props?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Реквизит: </span>
                    {scene.props.map((p, i) => (
                      <MatchedItem key={i} text={p} matched={matched} onUnitClick={setSelectedUnit} />
                    ))}
                  </div>
                )}

                {/* Costumes with warehouse matching */}
                {scene.costumes?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Костюм: </span>
                    {scene.costumes.map((c, i) => (
                      <MatchedItem key={i} text={c} matched={matched} onUnitClick={setSelectedUnit} />
                    ))}
                  </div>
                )}

                {/* Makeup */}
                {scene.makeup?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Грим: </span>
                    <span style={{ fontSize: 13 }}>{scene.makeup.join(', ')}</span>
                  </div>
                )}

                {/* Vehicles */}
                {scene.vehicles?.length > 0 && (
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>Транспорт: </span>
                    <span style={{ fontSize: 13 }}>{scene.vehicles.join(', ')}</span>
                  </div>
                )}

                {/* Location & time */}
                <div className="dv-scene-meta" style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--muted)' }}>
                  {scene.time_slot && <span>Время: {scene.time_slot}</span>}
                  {scene.location && <span>Локация: {scene.location}</span>}
                  {scene.extras && <span>Массовка: {scene.extras}</span>}
                </div>

                {/* Expanded: full text (scenario only) */}
                {expandedScene === scene.id && scene.text && (
                  <div style={{
                    marginTop: 12, padding: '12px 16px', background: 'var(--bg)',
                    borderRadius: 'var(--radius-btn)', fontSize: 13, lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto',
                  }}>
                    {scene.text}
                  </div>
                )}

                {/* Scene changes detail */}
                {sceneChange && expandedScene === scene.id && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(234,179,8,0.08)', borderRadius: 'var(--radius-btn)', fontSize: 12 }}>
                    <div style={{ fontWeight: 500, marginBottom: 4, color: 'var(--amber)' }}>Изменения:</div>
                    {sceneChange.changes.map((ch, i) => (
                      <div key={i} style={{ marginBottom: 2 }}>
                        <strong>{ch.field}:</strong>{' '}
                        <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>{JSON.stringify(ch.old)}</span>
                        {' → '}
                        <span>{JSON.stringify(ch.new)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredScenes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>Ничего не найдено</div>
        )}
      </div>

      {/* Unit card modal */}
      {selectedUnit && (
        <UnitCardModal unitId={selectedUnit} onClose={() => setSelectedUnit(null)} />
      )}
    </ProductionLayout>
  )
}

// Matched item: highlighted if found on warehouse
function MatchedItem({ text, matched, onUnitClick }) {
  const key = text.toLowerCase().trim()
  const match = matched[key]

  if (match) {
    const statusColor = match.unit_status === 'on_stock' ? 'var(--green)' : 'var(--amber)'
    const statusBg = match.unit_status === 'on_stock' ? 'rgba(34,197,94,0.12)' : 'rgba(234,179,8,0.12)'
    return (
      <span onClick={() => onUnitClick(match.unit_id)}
        style={{
          display: 'inline-block', padding: '2px 8px', margin: '2px 4px 2px 0',
          borderRadius: 'var(--radius-badge)', cursor: 'pointer',
          background: statusBg, color: statusColor, fontSize: 13, fontWeight: 500,
          borderBottom: `2px solid ${statusColor}`,
          transition: 'all 0.15s',
        }}
        title={`${match.unit_name} — ${match.unit_status === 'on_stock' ? 'на складе' : match.unit_status}`}>
        {text}
        <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>
          {match.unit_status === 'on_stock' ? '✓' : '���'}
        </span>
      </span>
    )
  }

  return <span style={{ fontSize: 13, margin: '0 4px 0 0' }}>{text}, </span>
}

// Delta banner
function DeltaBanner({ delta }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{
      marginBottom: 16, padding: '12px 16px', borderRadius: 'var(--radius-card)',
      border: '1px solid var(--amber)', background: 'rgba(234,179,8,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>Изменения с предыдущей версии</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {delta.added?.length > 0 && <Badge color="green">+{delta.added.length} новых</Badge>}
          {delta.changed?.length > 0 && <Badge color="amber">~{delta.changed.length} изменено</Badge>}
          {delta.removed?.length > 0 && <Badge color="red">-{delta.removed.length} удалено</Badge>}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {delta.added?.map(a => <div key={a.id} style={{ color: 'var(--green)' }}>+ Сцена {a.id}: {a.object}</div>)}
          {delta.changed?.map(c => <div key={c.id} style={{ color: 'var(--amber)' }}>~ Сцена {c.id}: {c.object}</div>)}
          {delta.removed?.map(r => <div key={r.id} style={{ color: 'var(--red)', textDecoration: 'line-through' }}>- Сцена {r.id}: {r.object}</div>)}
        </div>
      )}
    </div>
  )
}

// Back header
function BackHeader({ doc, navigate }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
      <button onClick={() => navigate('/production/documents')}
        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 18, padding: 0 }}>←</button>
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          {TYPE_LABELS[doc.type] || doc.type} v{doc.version}
        </h1>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
          {doc.original_name || doc.file_url || ''} · {doc.uploaded_by_name || ''} · {new Date(doc.created_at).toLocaleDateString('ru-RU')}
        </div>
      </div>
      <Badge color={doc.status === 'parsed' ? 'green' : 'muted'}>{doc.status}</Badge>
    </div>
  )
}

// Callsheet tabs: ВЫЗЫВНОЙ + ПЛАН С.ДНЯ
function CallsheetTabs({ content }) {
  const [tab, setTab] = useState('callsheet')
  const hasPlan = content.plan_day?.scenes?.length > 0

  return (
    <div>
      {hasPlan && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid var(--border)' }}>
          {[['callsheet', 'ВЫЗЫВНОЙ'], ['plan', 'ПЛАН С.ДНЯ']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px', border: 'none', background: 'none',
              fontWeight: 500, fontSize: 14, cursor: 'pointer',
              color: tab === key ? 'var(--blue)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--blue)' : 'transparent'}`,
              marginBottom: -2,
            }}>{label}</button>
          ))}
        </div>
      )}
      {tab === 'callsheet' && <CallsheetView content={content} />}
      {tab === 'plan' && hasPlan && <PlanDayView planDay={content.plan_day} />}
    </div>
  )
}

// Plan day view — renders scenes like KPP
function PlanDayView({ planDay }) {
  const [expandedScene, setExpandedScene] = useState(null)
  const scenes = planDay?.scenes || []
  const MODE_COLORS = { 'день': '#f59e0b', 'утро': '#eab308', 'вечер': '#8b5cf6', 'ночь': '#1e40af' }

  return (
    <div>
      {planDay.shoot_days?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {planDay.shoot_days.map(sd => (
            <span key={sd.day_number} style={{ padding: '6px 12px', borderRadius: 'var(--radius-btn)', background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 12 }}>
              С/Д {sd.day_number} · {sd.date} · {sd.scenes.length} сц.
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {scenes.map(scene => (
          <div key={scene.id} style={{
            background: 'var(--white)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-card)', padding: '14px 18px',
            borderLeft: `3px solid ${MODE_COLORS[scene.mode] || 'var(--border)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer' }}
              onClick={() => setExpandedScene(expandedScene === scene.id ? null : scene.id)}>
              <span style={{ fontWeight: 600, fontSize: 14, fontFamily: 'monospace' }}>{scene.id}.</span>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{scene.object}</span>
              <Badge color="muted">{scene.mode}</Badge>
              {scene.int_nat && <Badge color="muted">{scene.int_nat}</Badge>}
              {scene.day && <span style={{ fontSize: 12, color: 'var(--muted)' }}>СД {scene.day}</span>}
              {scene.duration && <span style={{ fontSize: 12, color: 'var(--muted)' }}>({scene.duration})</span>}
              {scene.time_slot && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{scene.time_slot}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>{expandedScene === scene.id ? '▲' : '▼'}</span>
            </div>
            {scene.characters?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {scene.characters.map(c => (
                  <span key={c} style={{ padding: '2px 8px', borderRadius: 'var(--radius-badge)', background: 'var(--blue-dim)', color: 'var(--blue)', fontSize: 11, fontWeight: 500 }}>{c}</span>
                ))}
              </div>
            )}
            {expandedScene === scene.id && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                {scene.props?.length > 0 && <div><span style={{ color: 'var(--muted)', fontWeight: 500 }}>Реквизит: </span>{scene.props.join(', ')}</div>}
                {scene.costumes?.length > 0 && <div><span style={{ color: 'var(--muted)', fontWeight: 500 }}>Костюм: </span>{scene.costumes.join(', ')}</div>}
                {scene.makeup?.length > 0 && <div><span style={{ color: 'var(--muted)', fontWeight: 500 }}>Грим: </span>{scene.makeup.join(', ')}</div>}
                {scene.vehicles?.length > 0 && <div><span style={{ color: 'var(--muted)', fontWeight: 500 }}>Транспорт: </span>{scene.vehicles.join(', ')}</div>}
                {scene.extras && <div><span style={{ color: 'var(--muted)', fontWeight: 500 }}>Массовка: </span>{scene.extras}</div>}
                {scene.location && <div><span style={{ color: 'var(--muted)', fontWeight: 500 }}>Локация: </span>{scene.location}</div>}
                {scene.platform && <div><span style={{ color: 'var(--muted)', fontWeight: 500 }}>Площадка: </span>{scene.platform}</div>}
              </div>
            )}
          </div>
        ))}
        {scenes.length === 0 && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>Нет сцен</div>}
      </div>
    </div>
  )
}

// Callsheet view
function CallsheetView({ content }) {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{content.title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
        {content.date && `Дата: ${content.date}`} · Смена: {content.shift}
      </div>

      {content.locations?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Площа��ки</div>
          {content.locations.map((l, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-btn)', marginBottom: 4, fontSize: 13 }}>{l}</div>
          ))}
        </div>
      )}

      {content.cast?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Актёры</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 500, color: 'var(--muted)', fontSize: 11 }}>Роль</th>
                <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 500, color: 'var(--muted)', fontSize: 11 }}>Актёр</th>
                <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 500, color: 'var(--muted)', fontSize: 11 }}>Явка</th>
                <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 500, color: 'var(--muted)', fontSize: 11 }}>Грим-костюм</th>
                <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 500, color: 'var(--muted)', fontSize: 11 }}>Готовность</th>
              </tr>
            </thead>
            <tbody>
              {content.cast.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 500 }}>{c.role}</td>
                  <td style={{ padding: '8px 6px' }}>{c.actor}</td>
                  <td style={{ padding: '8px 6px' }}>{c.call}</td>
                  <td style={{ padding: '8px 6px' }}>{c.makeup_costume}</td>
                  <td style={{ padding: '8px 6px' }}>{c.ready}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {content.departments?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Вызов группы</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 }}>
            {content.departments.map((d, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
                background: 'var(--bg)', borderRadius: 'var(--radius-btn)', fontSize: 13,
              }}>
                <span>{d.name}</span>
                <span style={{ fontWeight: 500 }}>{d.call}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.vehicles?.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase' }}>Транспорт</div>
          {content.vehicles.map((v, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-btn)', marginBottom: 4, fontSize: 13 }}>{v}</div>
          ))}
        </div>
      )}
    </div>
  )
}
