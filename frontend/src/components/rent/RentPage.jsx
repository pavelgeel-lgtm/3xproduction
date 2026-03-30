import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from '../warehouse/WarehouseLayout'
import Badge from '../shared/Badge'
import Button from '../shared/Button'
import Input from '../shared/Input'
import SignatureCanvas from '../shared/SignatureCanvas'
import PhotoUpload from '../shared/PhotoUpload'
import { categoryLabel, CATEGORIES_FILTER } from '../../constants/categories'
import { rent as rentApi, units as unitsApi, warehouses as warehousesApi } from '../../services/api'

const DEAL_FILTERS = ['Все', 'Сдаём', 'Берём', 'Активные', 'Завершённые']

export default function RentPage() {
  const [tab, setTab] = useState('list')
  const [dealFilter, setDealFilter] = useState('Все')
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  function loadDeals() {
    rentApi.list().then(data => setDeals(data.deals || [])).finally(() => setLoading(false))
  }

  useEffect(() => { loadDeals() }, [])

  const filtered = deals.filter(d => {
    if (dealFilter === 'Все') return true
    if (dealFilter === 'Сдаём') return d.type === 'out'
    if (dealFilter === 'Берём') return d.type === 'in'
    if (dealFilter === 'Активные') return d.status === 'active'
    if (dealFilter === 'Завершённые') return d.status === 'done'
    return true
  })

  return (
    <WarehouseLayout>
      <div style={{ padding: '24px 32px', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Аренда</h1>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid var(--border)' }}>
          {[['list', 'Все сделки'], ['new', 'Новая сделка']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 20px', border: 'none', background: 'none',
              fontWeight: 500, fontSize: 14, cursor: 'pointer',
              color: tab === key ? 'var(--blue)' : 'var(--muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--blue)' : 'transparent'}`,
              marginBottom: -2,
            }}>{label}</button>
          ))}
        </div>

        {tab === 'list' && <DealsList deals={filtered} allDeals={deals} filter={dealFilter} setFilter={setDealFilter} loading={loading} onRefresh={loadDeals} />}
        {tab === 'new' && <NewDeal onDone={() => { setTab('list'); loadDeals() }} />}
      </div>
    </WarehouseLayout>
  )
}

function DealsList({ deals, allDeals, filter, setFilter, loading, onRefresh }) {
  const activeCount = allDeals.filter(d => d.status === 'active').length
  const monthSum = allDeals.filter(d => d.status !== 'cancelled').reduce((a, d) => a + (Number(d.price_total) || 0), 0)
  const overdueCount = allDeals.filter(d => d.status === 'overdue').length

  return (
    <div>
      <div className="resp-3-col" style={{ marginBottom: 24 }}>
        <StatCard icon="🤝" label="Активных сделок" value={activeCount} color="blue" />
        <StatCard icon="💰" label="Выручка" value={monthSum.toLocaleString('ru-RU') + ' ₽'} color="green" />
        <StatCard icon="⚠️" label="Просрочено" value={overdueCount} color="red" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {DEAL_FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            height: 32, padding: '0 14px', borderRadius: 'var(--radius-badge)',
            border: `1px solid ${filter === f ? 'var(--blue)' : 'var(--border)'}`,
            background: filter === f ? 'var(--blue-dim)' : 'var(--white)',
            color: filter === f ? 'var(--blue)' : 'var(--muted)',
            fontSize: 13, fontWeight: filter === f ? 500 : 400, cursor: 'pointer',
          }}>{f}</button>
        ))}
      </div>

      {loading && <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>Загрузка...</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {deals.map(d => (
          <div key={d.id} style={{
            background: 'var(--white)', borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border)', padding: '16px',
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
            cursor: 'pointer',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: d.type === 'out' ? 'var(--blue-dim)' : 'var(--green-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {d.type === 'out' ? '↗' : '↙'}
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{d.counterparty_name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {d.counterparty_type === 'company' ? 'Компания' : 'Физлицо'} · {d.type === 'out' ? 'Сдаём' : 'Берём'}
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>
              {new Date(d.period_start).toLocaleDateString('ru-RU')} — {new Date(d.period_end).toLocaleDateString('ru-RU')}
            </div>

            {d.price_total && (
              <div style={{ fontWeight: 600, fontSize: 14, flexShrink: 0 }}>
                {Number(d.price_total).toLocaleString('ru-RU')} ₽
              </div>
            )}

            <Badge color={d.status === 'active' ? 'blue' : d.status === 'done' ? 'green' : 'red'}>
              {d.status === 'active' ? 'Активна' : d.status === 'done' ? 'Завершена' : d.status === 'overdue' ? 'Просрочено' : 'Отменена'}
            </Badge>
            {d.sign_token && (
              <Badge color={d.sign_status === 'signed' ? 'green' : 'amber'}>
                {d.sign_status === 'signed' ? '✓ Подписано' : 'Ожидает подписи'}
              </Badge>
            )}
            {(d.status === 'active' || d.status === 'overdue') && (
              <button
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!confirm(`Оформить возврат по сделке с ${d.counterparty_name}?`)) return
                  try {
                    await rentApi.return(d.id, {})
                    onRefresh()
                  } catch (err) { alert(err.message || 'Ошибка возврата') }
                }}
                style={{
                  padding: '5px 12px', fontSize: 12, fontWeight: 500,
                  color: 'var(--green)', background: 'var(--green-dim)',
                  border: '1px solid var(--green)', borderRadius: 6, cursor: 'pointer',
                }}>
                Возврат
              </button>
            )}
          </div>
        ))}
        {!loading && deals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)', fontSize: 14 }}>Нет сделок</div>
        )}
      </div>
    </div>
  )
}

function NewDeal({ onDone }) {
  const [dealType, setDealType] = useState('out')
  const [cpType, setCpType] = useState('person')
  const [form, setForm] = useState({ name: '', contact: '', email: '' })
  const [availableUnits, setAvailableUnits] = useState([])
  const [selectedUnits, setSelectedUnits] = useState([])
  const [prices, setPrices] = useState({})
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [signLink, setSignLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [warehouseList, setWarehouseList] = useState([])
  const [whFilter, setWhFilter] = useState('')
  const [unitSearch, setUnitSearch] = useState('')
  const [unitCat, setUnitCat] = useState('all')
  const [dealPhotos, setDealPhotos] = useState([null, null])

  useEffect(() => {
    unitsApi.list({ status: 'on_stock' }).then(data => setAvailableUnits(data.units || []))
    warehousesApi.list().then(d => setWarehouseList(d.warehouses || []))
  }, [])

  function setDealPhoto(i, file) {
    setDealPhotos(p => { const a = [...p]; a[i] = file; return a })
  }

  const filteredUnits = availableUnits.filter(u => {
    const matchWh = !whFilter || String(u.warehouse_id) === whFilter
    const matchSearch = !unitSearch || u.name.toLowerCase().includes(unitSearch.toLowerCase()) || (u.serial || '').toLowerCase().includes(unitSearch.toLowerCase())
    const matchCat = unitCat === 'all' || u.category === unitCat
    return matchWh && matchSearch && matchCat
  })

  function set(f) { return e => setForm(p => ({ ...p, [f]: e.target.value })) }

  function toggleUnit(id) {
    setSelectedUnits(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  const days = dateStart && dateEnd ? Math.max(1, Math.ceil((new Date(dateEnd) - new Date(dateStart)) / 86400000)) : 0

  function calcTotal() {
    return selectedUnits.reduce((sum, id) => sum + (Number(prices[id]) || 0) * days, 0)
  }

  async function handleSign(signatureData) {
    setLoading(true)
    try {
      const data = await rentApi.create({
        type: dealType,
        counterparty_name: form.name,
        counterparty_type: cpType,
        counterparty_contact: form.contact,
        counterparty_email: form.email,
        inn: form.inn,
        legal_address: form.legal_address,
        extra_contact: form.extra_contact,
        unit_ids: selectedUnits,
        period_start: dateStart,
        period_end: dateEnd,
        price_total: calcTotal() || null,
        signature_data: signatureData,
      })
      const dealId = data.deal?.id
      if (dealId) {
        const firstUnitId = selectedUnits[0]
        if (firstUnitId) {
          for (const file of dealPhotos) {
            if (file) {
              const fd = new FormData()
              fd.append('photos', file)
              unitsApi.uploadPhoto(firstUnitId, fd).catch(() => {})
            }
          }
        }
      }
      setStep(5)
    } catch (err) {
      alert(err.message || 'Ошибка создания сделки')
    } finally {
      setLoading(false)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(signLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ maxWidth: 560 }}>

      {step === 1 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Данные контрагента</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['person', 'Физлицо'], ['company', 'Компания']].map(([key, label]) => (
              <button key={key} onClick={() => setCpType(key)} style={{
                padding: '6px 14px', borderRadius: 'var(--radius-badge)',
                border: `1px solid ${cpType === key ? 'var(--blue)' : 'var(--border)'}`,
                background: cpType === key ? 'var(--blue-dim)' : 'var(--white)',
                color: cpType === key ? 'var(--blue)' : 'var(--muted)',
                fontSize: 13, cursor: 'pointer',
              }}>{label}</button>
            ))}
          </div>
          <Input label={cpType === 'person' ? 'ФИО' : 'Название компании'} placeholder={cpType === 'person' ? 'Иванов Иван Иванович' : 'ООО «Реквизит+»'} value={form.name} onChange={set('name')} />
          {cpType === 'company' && (
            <>
              <Input label="ИНН" placeholder="1234567890" value={form.inn || ''} onChange={set('inn')} />
              <Input label="Юридический адрес" placeholder="г. Москва, ул. Примерная, д. 1" value={form.legal_address || ''} onChange={set('legal_address')} />
            </>
          )}
          <Input label="Контакт (телефон)" placeholder="+7 900 000 00 00" value={form.contact} onChange={set('contact')} />
          <Input label="Email" type="email" placeholder="client@example.com" value={form.email} onChange={set('email')} />
          <Input label="Дополнительный контакт" placeholder="Имя, телефон или email" value={form.extra_contact || ''} onChange={set('extra_contact')} />
          <Button fullWidth disabled={!form.name} onClick={() => setStep(2)} style={{ marginTop: 8 }}>
            Далее — Единицы
          </Button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>Единицы и период</div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14 }}>🔍</span>
            <input value={unitSearch} onChange={e => setUnitSearch(e.target.value)}
              placeholder="Поиск по названию или серийному №..."
              style={{ width: '100%', height: 38, padding: '0 10px 0 32px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Selected units bar */}
          {selectedUnits.length > 0 && (
            <div style={{ padding: '8px 12px', marginBottom: 12, borderRadius: 8, background: 'var(--blue-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>Выбрано: {selectedUnits.length} ед.</span>
              <button onClick={() => setSelectedUnits([])} style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Очистить</button>
            </div>
          )}

          {/* Units list — only show search results or selected */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto', marginBottom: 14 }}>
            {(unitSearch ? filteredUnits : availableUnits.filter(u => selectedUnits.includes(u.id))).map(u => {
              const isSel = selectedUnits.includes(u.id)
              return (
                <div key={u.id} style={{
                  background: 'var(--white)', borderRadius: 'var(--radius-card)',
                  border: `1px solid ${isSel ? 'var(--blue)' : 'var(--border)'}`, overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer' }}
                    onClick={() => toggleUnit(u.id)}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 6, flexShrink: 0,
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden',
                    }}>
                      {u.photo_url
                        ? <img src={u.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : '📦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                        {u.serial && `${u.serial} · `}{categoryLabel(u.category)}
                      </div>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: 4, flexShrink: 0,
                      border: `2px solid ${isSel ? 'var(--blue)' : 'var(--border)'}`,
                      background: isSel ? 'var(--blue)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12,
                    }}>{isSel ? '✓' : ''}</div>
                  </div>
                  {isSel && (
                    <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                      <input type="number" placeholder="Цена/сутки ₽" min="0"
                        value={prices[u.id] || ''}
                        onChange={e => setPrices(p => ({ ...p, [u.id]: e.target.value }))}
                        onClick={e => e.stopPropagation()}
                        style={{ width: 140, height: 32, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 12, outline: 'none' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>₽ / сутки</span>
                    </div>
                  )}
                </div>
              )
            })}
            {unitSearch && filteredUnits.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--muted)', fontSize: 13 }}>Ничего не найдено</div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Дата выдачи</div>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Плановый возврат</div>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>

          {days > 0 && selectedUnits.length > 0 && (
            <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 8, background: 'var(--green-dim)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{days} дн. · {selectedUnits.length} ед.</span>
              <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 16 }}>{calcTotal().toLocaleString('ru-RU')} ₽</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button variant="secondary" onClick={() => setStep(1)}>Назад</Button>
            <Button fullWidth disabled={selectedUnits.length === 0 || !dateStart || !dateEnd} onClick={() => setStep(3)}>
              Далее — Фото
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Фото к сделке</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Минимум 2 фото — состояние имущества при передаче</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
            {[0, 1].map(i => (
              <PhotoUpload key={i} label={`Фото ${i + 1}`} onChange={f => setDealPhoto(i, f)} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setStep(2)}>Назад</Button>
            <Button fullWidth onClick={() => setStep(4)}>Далее — Подпись</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Подпись арендатора</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{form.name}</div>
          <SignatureCanvas onSave={data => handleSign(data)} />
          {loading && <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>Создание сделки...</div>}
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
            После подписи будет сформирован договор аренды{form.email ? ` и отправлен на ${form.email}` : ''}
          </div>
          <Button variant="secondary" fullWidth style={{ marginTop: 12 }} onClick={() => setStep(3)}>Назад</Button>
        </div>
      )}

      {step === 5 && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Сделка оформлена</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Договор аренды подписан и сформирован</div>
          <Button fullWidth onClick={onDone}>К списку сделок</Button>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  const bg = { blue: 'var(--blue-dim)', green: 'var(--green-dim)', red: 'var(--red-dim)' }
  const clr = { blue: 'var(--blue)', green: 'var(--green)', red: 'var(--red)' }
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 16 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: bg[color], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: clr[color] }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
