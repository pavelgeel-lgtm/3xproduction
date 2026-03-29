import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import Input from '../shared/Input'

const BASE = import.meta.env.VITE_API_URL || ''

export default function PublicWarehousePage() {
  const { token } = useParams()
  const [step, setStep] = useState('auth') // auth | browse | request | done
  const [form, setForm] = useState({ name: '', phone: '' })
  const [units, setUnits] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [requestUnit, setRequestUnit] = useState(null)
  const [requestForm, setRequestForm] = useState({ message: '', dates: '' })
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Все')

  useEffect(() => {
    fetch(`${BASE}/public/warehouse/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoadError(d.error); return }
        setUnits(d.units || [])
      })
      .catch(() => setLoadError('Не удалось загрузить каталог'))
  }, [token])

  const categories = ['Все', ...new Set(units.map(u => u.category).filter(Boolean))]
  const filtered = units.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = category === 'Все' || u.category === category
    return matchSearch && matchCat
  })

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'var(--black)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--white)' }}>
          <span style={{ color: 'var(--blue)' }}>3X</span>Media
        </div>
        <div style={{ fontSize: 9, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
          Production
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
          Публичный каталог склада
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {loadError && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Ссылка недействительна</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>{loadError}</p>
          </div>
        )}

        {/* Step: auth */}
        {!loadError && step === 'auth' && (
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <div style={{
              background: 'var(--white)', borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)', padding: '36px 32px',
            }}>
              <div style={{ textAlign: 'center', marginBottom: 28 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div>
                <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Каталог склада</h1>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Введите ваши данные для просмотра доступного имущества
                </p>
              </div>
              <Input label="Имя" placeholder="Иван Иванов" value={form.name} onChange={set('name')} />
              <Input label="Телефон" placeholder="+7 900 000 00 00" value={form.phone} onChange={set('phone')} />
              <Button fullWidth disabled={!form.name || !form.phone}
                onClick={() => setStep('browse')}>
                Просмотреть каталог
              </Button>
            </div>
          </div>
        )}

        {/* Step: browse */}
        {step === 'browse' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600 }}>Каталог имущества</h1>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                Здравствуйте, {form.name}! Выберите интересующие позиции.
              </p>
            </div>

            {/* Search + filter */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  style={{
                    width: '100%', height: 40, padding: '0 12px 0 36px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
                    fontSize: 14, background: 'var(--white)', outline: 'none',
                  }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    height: 40, padding: '0 14px', borderRadius: 'var(--radius-btn)',
                    border: `1px solid ${category === c ? 'var(--blue)' : 'var(--border)'}`,
                    background: category === c ? 'var(--blue-dim)' : 'var(--white)',
                    color: category === c ? 'var(--blue)' : 'var(--muted)',
                    fontSize: 13, cursor: 'pointer',
                  }}>{c}</button>
                ))}
              </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {filtered.map(u => (
                <div key={u.id} style={{
                  background: 'var(--white)', borderRadius: 'var(--radius-card)',
                  border: '1px solid var(--border)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: 140, background: 'var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
                  }}>📦</div>
                  <div style={{ padding: '14px' }}>
                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>{u.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Badge color={u.status === 'on_stock' ? 'green' : 'muted'}>
                        {u.status === 'on_stock' ? 'Доступно' : 'Занято'}
                      </Badge>
                      {u.status === 'on_stock' && (
                        <button onClick={() => { setRequestUnit(u); setStep('request') }} style={{
                          fontSize: 13, color: 'var(--blue)', background: 'none',
                          border: 'none', cursor: 'pointer', fontWeight: 500,
                        }}>Запросить →</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: request */}
        {step === 'request' && requestUnit && (
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{
              background: 'var(--white)', borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border)', padding: '28px',
            }}>
              <button onClick={() => setStep('browse')} style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                fontSize: 13, cursor: 'pointer', marginBottom: 20,
              }}>← Назад</button>

              <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Запрос аренды</h2>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{requestUnit.name}</p>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Желаемые даты</div>
                <input
                  placeholder="Например: 1–10 апреля 2026"
                  value={requestForm.dates}
                  onChange={e => setRequestForm(p => ({ ...p, dates: e.target.value }))}
                  style={{
                    width: '100%', height: 40, padding: '0 12px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
                    fontSize: 14, outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Комментарий</div>
                <textarea
                  placeholder="Уточните детали запроса..."
                  value={requestForm.message}
                  onChange={e => setRequestForm(p => ({ ...p, message: e.target.value }))}
                  style={{
                    width: '100%', minHeight: 100, padding: '10px 12px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
                    fontSize: 13, resize: 'vertical', outline: 'none',
                  }}
                />
              </div>

              <Button fullWidth onClick={() => {
                fetch(`${BASE}/public/warehouse/${token}/request`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: form.name, phone: form.phone, unit_id: requestUnit.id, message: requestForm.message, dates: requestForm.dates }),
                }).then(() => setStep('done')).catch(() => alert('Ошибка при отправке'))
              }}>Отправить запрос</Button>
            </div>
          </div>
        )}

        {/* Step: done */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Запрос отправлен</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 28 }}>
              Мы свяжемся с вами по номеру {form.phone} в ближайшее время
            </p>
            <Button variant="secondary" onClick={() => setStep('browse')}>
              Вернуться к каталогу
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
