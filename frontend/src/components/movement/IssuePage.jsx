import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import WarehouseLayout from '../warehouse/WarehouseLayout'
import Button from '../shared/Button'
import PhotoUpload from '../shared/PhotoUpload'
import SignatureCanvas from '../shared/SignatureCanvas'
import { requests as requestsApi, issuances as issuancesApi, units as unitsApi } from '../../services/api'

const STEPS = ['Список', 'Фото', 'Соглашение', 'Подпись']

function getAgreementText(receiverName, unitList, deadline) {
  const today = new Date().toLocaleDateString('ru-RU')
  return `СОГЛАШЕНИЕ ОБ ОТВЕТСТВЕННОСТИ

г. Москва                                          ${today}

Я, ${receiverName}, принимая имущество склада компании 3XMedia Production, обязуюсь:

1. Обеспечить сохранность переданного имущества.
2. Использовать имущество только в целях производства.
3. Вернуть имущество в надлежащем состоянии в установленный срок.
4. Возместить ущерб в случае повреждения или утраты имущества.

Срок возврата: ${new Date(deadline).toLocaleDateString('ru-RU')}`
}

export default function IssuePage() {
  const navigate = useNavigate()
  const { id: requestId } = useParams()
  const [step, setStep] = useState(0)
  const [units, setUnits] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [photos, setPhotos] = useState({})
  const [deadline, setDeadline] = useState('')
  const [receiverName, setReceiverName] = useState('')
  const [receiverId, setReceiverId] = useState('')
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)

  useEffect(() => {
    if (requestId) {
      requestsApi.list().then(data => {
        const req = (data.requests || []).find(r => String(r.id) === String(requestId))
        if (req) {
          setReceiverId(req.user_id)
          setReceiverName(req.user_name || 'Пользователь')
          const ids = req.unit_ids || []
          // fetch unit details
          unitsApi.list().then(ud => {
            const us = (ud.units || []).filter(u => ids.includes(u.id))
            setUnits(us)
            setSelected(new Set(us.map(u => u.id)))
          })
        }
      }).finally(() => setInitLoading(false))
    } else {
      unitsApi.list({ status: 'on_stock' }).then(data => {
        setUnits(data.units || [])
      }).finally(() => setInitLoading(false))
    }
  }, [requestId])

  const selectedUnits = units.filter(u => selected.has(u.id))

  function toggleUnit(id) {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setPhoto(unitId, idx, file) {
    setPhotos(p => {
      const arr = [...(p[unitId] || [null, null, null])]
      arr[idx] = file
      return { ...p, [unitId]: arr }
    })
  }

  async function handleIssue(signatureData) {
    setLoading(true)
    try {
      const fd = new FormData()
      if (requestId) fd.append('request_id', requestId)
      fd.append('received_by', receiverId)
      fd.append('deadline', deadline || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])
      fd.append('signature_data', signatureData)

      // Append photos
      for (const uid of selected) {
        const uPhotos = photos[uid] || []
        for (const file of uPhotos) {
          if (file) fd.append('photos', file)
        }
      }

      await issuancesApi.issue(fd)
      navigate('/dashboard')
    } catch (err) {
      alert(err.message || 'Ошибка выдачи')
    } finally {
      setLoading(false)
    }
  }

  return (
    <WarehouseLayout>
      <div style={{ padding: '24px 32px', maxWidth: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>
            ←
          </button>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600 }}>Выдача имущества</h1>
            {receiverName && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{receiverName}</p>}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600,
                  background: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--border)',
                  color: i <= step ? 'var(--white)' : 'var(--muted)', transition: 'all 0.2s',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 11, color: i === step ? 'var(--blue)' : 'var(--muted)', marginTop: 4, fontWeight: i === step ? 600 : 400 }}>
                  {s}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ height: 2, flex: 1, background: i < step ? 'var(--green)' : 'var(--border)', marginBottom: 18, transition: 'background 0.2s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0 — list */}
        {step === 0 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>Выберите единицы для выдачи</div>
            {initLoading && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Загрузка...</div>}
            {units.map(u => (
              <div key={u.id} onClick={() => toggleUnit(u.id)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', borderRadius: 'var(--radius-card)',
                border: `2px solid ${selected.has(u.id) ? 'var(--blue)' : 'var(--border)'}`,
                background: selected.has(u.id) ? 'var(--blue-dim)' : 'var(--white)',
                marginBottom: 10, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                  border: `2px solid ${selected.has(u.id) ? 'var(--blue)' : 'var(--border)'}`,
                  background: selected.has(u.id) ? 'var(--blue)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 13,
                }}>
                  {selected.has(u.id) ? '✓' : ''}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{u.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {u.serial} · {u.category}
                  </div>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Срок возврата</div>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', fontSize: 13, outline: 'none' }} />
            </div>

            <Button fullWidth disabled={selected.size === 0 || !deadline} style={{ marginTop: 8 }}
              onClick={() => setStep(1)}>
              Далее — Фото ({selected.size} ед.)
            </Button>
          </div>
        )}

        {/* Step 1 — photos */}
        {step === 1 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Фото при выдаче</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Минимум 3 фото на каждую единицу</div>
            {selectedUnits.map(u => (
              <div key={u.id} style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 500, marginBottom: 10 }}>{u.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[0, 1, 2].map(i => (
                    <PhotoUpload key={i} label={`Фото ${i + 1}`}
                      onChange={file => setPhoto(u.id, i, file)} />
                  ))}
                </div>
              </div>
            ))}
            <Button fullWidth onClick={() => setStep(2)} style={{ marginTop: 8 }}>
              Далее — Соглашение
            </Button>
          </div>
        )}

        {/* Step 2 — agreement */}
        {step === 2 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 14 }}>Соглашение об ответственности</div>
            <div style={{
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-card)', padding: 20, marginBottom: 20,
              fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-line',
              maxHeight: 320, overflowY: 'auto',
            }}>
              {getAgreementText(receiverName, selectedUnits, deadline)}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>Перечень имущества:</div>
                {selectedUnits.map((u, i) => (
                  <div key={u.id} style={{ marginBottom: 4 }}>
                    {i + 1}. {u.name} — {u.serial}
                  </div>
                ))}
              </div>
            </div>
            <Button fullWidth onClick={() => setStep(3)}>Принять и подписать</Button>
          </div>
        )}

        {/* Step 3 — signature */}
        {step === 3 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Подпись получателя</div>
            {receiverName && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{receiverName}</div>}
            <SignatureCanvas
              onSave={data => handleIssue(data)}
              onClear={() => {}}
            />
            {loading && <div style={{ textAlign: 'center', marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>Сохранение...</div>}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, textAlign: 'center' }}>
              После подписи будет сформирован PDF акт выдачи
            </div>
          </div>
        )}
      </div>
    </WarehouseLayout>
  )
}
