import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductionLayout from './ProductionLayout'
import Button from '../shared/Button'
import Badge from '../shared/Badge'

const SOURCE_BADGE = {
  kpp:      { icon: '📄', label: 'КПП',       bg: 'var(--blue-dim)',  color: 'var(--blue)' },
  scenario: { icon: '📄', label: 'Сценарий',  bg: 'var(--amber-dim)', color: 'var(--amber)' },
  ai:       { icon: '🤖', label: 'ИИ',        bg: 'var(--green-dim)', color: 'var(--green)' },
  cross:    { icon: '⚠️', label: 'Сверка ИИ', bg: 'var(--red-dim)',   color: 'var(--red)' },
}

const MOCK_ITEMS = [
  { id: '1',  name: 'Кресло Честерфилд',    scene: '12',  day: '1',  time: '09:00', location: 'Квартира',    qty: 2, source: 'kpp',      note: '', aiStatus: null },
  { id: '2',  name: 'Ваза напольная',        scene: '12',  day: '1',  time: '09:00', location: 'Квартира',    qty: 1, source: 'kpp',      note: '', aiStatus: null },
  { id: '3',  name: 'Стол обеденный',        scene: '15',  day: '2',  time: '14:00', location: 'Ресторан',    qty: 1, source: 'scenario', note: '', aiStatus: null },
  { id: '4',  name: 'Зеркало настенное',     scene: '15',  day: '2',  time: '14:00', location: 'Ресторан',    qty: 3, source: 'ai',       note: '', aiStatus: 'pending' },
  { id: '5',  name: 'Канделябр серебряный',  scene: '18',  day: '3',  time: '19:00', location: 'Особняк',     qty: 4, source: 'ai',       note: '', aiStatus: 'pending' },
  { id: '6',  name: 'Книжный шкаф',          scene: '18',  day: '3',  time: '19:00', location: 'Особняк',     qty: 1, source: 'kpp',      note: '', aiStatus: null },
  { id: '7',  name: 'Торшер бронзовый',      scene: '20',  day: '4',  time: '11:00', location: 'Офис',        qty: 2, source: 'scenario', note: '', aiStatus: null },
  { id: '8',  name: 'Сервиз чайный',         scene: '20',  day: '4',  time: '11:00', location: 'Офис',        qty: 1, source: 'kpp',      note: '', aiStatus: null },
]

const AI_SUGGESTIONS = [
  { id: 's1', category: 'Реквизит', item: 'Зеркало настенное', reason: 'Упоминается в сцене 15 дважды, но в КПП только 1 шт. Рекомендуем 3 шт.' },
  { id: 's2', category: 'Реквизит', item: 'Канделябр серебряный', reason: 'Сцена 18 — особняк 19 века, канделябры типичный атрибут эпохи.' },
]

const CROSS_CHECK = {
  discrepancies: [
    'Сцена 12: в КПП 2 кресла, в сценарии упоминается 3',
    'Сцена 20: в КПП сервиз чайный — 1 шт, в сценарии «накрытый стол» подразумевает полный сервиз',
  ],
  missing: [
    'Сцена 15: ресторанный реквизит (скатерти, приборы) не указан ни в КПП, ни в сценарии',
  ],
  cross_items: [
    'Стол обеденный — используется в сценах 15, 22, 31 (сквозная единица)',
    'Кресло Честерфилд — используется в сценах 12, 28 (сквозная единица)',
  ],
}

const TABS = ['Мой список', 'Сверка ИИ']

export default function ProductionListsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('Мой список')
  const [items, setItems] = useState(MOCK_ITEMS)
  const [editingNote, setEditingNote] = useState(null)
  const [noteValue, setNoteValue] = useState('')
  const [showUpdate, setShowUpdate] = useState(true)

  function acceptAI(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, aiStatus: 'accepted' } : i))
  }

  function rejectAI(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, aiStatus: 'rejected' } : i))
  }

  function saveNote(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, note: noteValue } : i))
    setEditingNote(null)
  }

  return (
    <ProductionLayout>
      <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Список реквизита</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Проект «Рассвет» · Реквизитор</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/production/documents')}>← Документы</Button>
        </div>

        {/* Update banner */}
        {showUpdate && (
          <div style={{
            background: 'var(--blue-dim)', border: '1px solid rgba(30,157,218,0.2)',
            borderRadius: 'var(--radius-card)', padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 20, flexWrap: 'wrap', gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <div>
                <div style={{ fontWeight: 500, fontSize: 14 }}>Загружена новая версия КПП (v3)</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>+5 позиций · ~2 изменения · −1 удалено</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" style={{ height: 32, fontSize: 13 }}
                onClick={() => navigate('/production/documents')}>Посмотреть</Button>
              <button onClick={() => setShowUpdate(false)} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18,
              }}>✕</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 20px', border: 'none', background: 'none',
              fontWeight: 500, fontSize: 14, cursor: 'pointer',
              color: tab === t ? 'var(--blue)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === t ? 'var(--blue)' : 'transparent'}`,
              marginBottom: -2,
            }}>{t}</button>
          ))}
        </div>

        {/* My list */}
        {tab === 'Мой список' && (
          <div>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 60px 60px 80px 100px 100px 140px 100px',
              gap: 8, padding: '8px 12px',
              fontSize: 11, fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              <span>Наименование</span>
              <span>Сцена</span>
              <span>День</span>
              <span>Время</span>
              <span>Локация</span>
              <span>Кол-во</span>
              <span>Источник</span>
              <span>Пометка</span>
            </div>

            {items.filter(i => i.aiStatus !== 'rejected').map(item => {
              const src = SOURCE_BADGE[item.source]
              const isAI = item.source === 'ai'
              const accepted = item.aiStatus === 'accepted'
              return (
                <div key={item.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 60px 60px 80px 100px 100px 140px 100px',
                  gap: 8, padding: '12px 12px',
                  background: 'var(--white)', borderRadius: 8,
                  border: `1px solid ${isAI && !accepted ? 'rgba(22,163,74,0.2)' : 'var(--border)'}`,
                  marginBottom: 6, alignItems: 'center',
                  opacity: accepted ? 1 : isAI ? 0.9 : 1,
                }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{item.scene}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{item.day}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{item.time}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.location}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{item.qty} шт.</div>

                  {/* Source badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 'var(--radius-badge)',
                      background: src.bg, color: src.color, fontSize: 11, fontWeight: 500,
                      width: 'fit-content',
                    }}>
                      {src.icon} {src.label}
                    </span>
                    {isAI && !accepted && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => acceptAI(item.id)} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          border: '1px solid var(--green)', background: 'var(--green-dim)',
                          color: 'var(--green)', cursor: 'pointer',
                        }}>✓ Принять</button>
                        <button onClick={() => rejectAI(item.id)} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          border: '1px solid var(--border)', background: 'var(--white)',
                          color: 'var(--muted)', cursor: 'pointer',
                        }}>✕</button>
                      </div>
                    )}
                    {accepted && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ Принято</span>}
                  </div>

                  {/* Note */}
                  <div>
                    {editingNote === item.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <input
                          autoFocus value={noteValue}
                          onChange={e => setNoteValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveNote(item.id)}
                          style={{
                            width: '100%', height: 28, padding: '0 6px', fontSize: 11,
                            border: '1px solid var(--blue)', borderRadius: 4, outline: 'none',
                          }}
                        />
                        <button onClick={() => saveNote(item.id)} style={{ background: 'var(--blue)', border: 'none', color: '#fff', borderRadius: 4, padding: '0 6px', cursor: 'pointer', fontSize: 12 }}>✓</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingNote(item.id); setNoteValue(item.note) }} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 11, color: item.note ? 'var(--text)' : 'var(--muted)',
                        textAlign: 'left', maxWidth: '100%',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.note || '+ заметка'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* AI cross-check */}
        {tab === 'Сверка ИИ' && (
          <div>
            {/* AI suggestions */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                🤖 Предложения ИИ
                <Badge color="green">{AI_SUGGESTIONS.length}</Badge>
              </div>
              {AI_SUGGESTIONS.map(s => (
                <div key={s.id} style={{
                  background: 'var(--white)', border: '1px solid rgba(22,163,74,0.2)',
                  borderRadius: 'var(--radius-card)', padding: '14px 16px', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-badge)',
                          background: 'var(--green-dim)', color: 'var(--green)', fontWeight: 500,
                        }}>🤖 Предложение ИИ</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{s.category}</span>
                      </div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{s.item}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{s.reason}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <Button style={{ height: 32, fontSize: 12, padding: '0 12px' }}>Принять</Button>
                      <Button variant="secondary" style={{ height: 32, fontSize: 12, padding: '0 12px' }}>Откл.</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Discrepancies */}
            <CrossSection
              icon="⚠️" title="Расхождения" color="amber"
              items={CROSS_CHECK.discrepancies}
              label="Сверка ИИ: расхождение"
            />

            {/* Missing */}
            <CrossSection
              icon="🔍" title="Пропуски" color="red"
              items={CROSS_CHECK.missing}
              label="Сверка ИИ: пропуск"
            />

            {/* Cross items */}
            <CrossSection
              icon="🔗" title="Сквозные единицы" color="blue"
              items={CROSS_CHECK.cross_items}
              label="Сверка ИИ: сквозная"
            />
          </div>
        )}
      </div>
    </ProductionLayout>
  )
}

function CrossSection({ icon, title, color, items, label }) {
  const bg = { amber: 'var(--amber-dim)', red: 'var(--red-dim)', blue: 'var(--blue-dim)' }
  const cl = { amber: 'var(--amber)', red: 'var(--red)', blue: 'var(--blue)' }
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon} {title}
        <Badge color={color}>{items.length}</Badge>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'var(--white)', border: `1px solid ${cl[color]}30`,
          borderRadius: 8, padding: '12px 14px', marginBottom: 8,
        }}>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-badge)',
            background: bg[color], color: cl[color], fontWeight: 500, flexShrink: 0, marginTop: 1,
          }}>
            ⚠️ {label}
          </span>
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  )
}
