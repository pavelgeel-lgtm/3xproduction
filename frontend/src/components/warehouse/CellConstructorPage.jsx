import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import WarehouseLayout from './WarehouseLayout'
import Button from '../shared/Button'
import Input from '../shared/Input'

const CATEGORIES = ['Мебель', 'Посуда', 'Игрушки', 'Костюмы', 'Реквизит', 'Компьютеры', 'Инструменты', 'Декорации', 'Осветительное', 'Текстиль', 'Своя категория']

const STEPS = ['Секция', 'Размер', 'Коды', 'Переименование', 'Готово']

function genCells(rows, shelves) {
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let s = 0; s < shelves; s++) {
      const row = String.fromCharCode(65 + r)
      cells.push({ id: `${row}-${s + 1}`, custom: '' })
    }
  }
  return cells
}

export default function CellConstructorPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [customCat, setCustomCat] = useState('')
  const [rows, setRows] = useState(3)
  const [shelves, setShelves] = useState(6)
  const [cells, setCells] = useState([])
  const [editingId, setEditingId] = useState(null)

  function handleNext() {
    if (step === 1) {
      setCells(genCells(rows, shelves))
    }
    setStep(s => s + 1)
  }

  function updateCellCode(id, value) {
    setCells(cs => cs.map(c => c.id === id ? { ...c, id: value || id } : c))
  }

  function updateCellCustom(id, value) {
    setCells(cs => cs.map(c => c.id === id ? { ...c, custom: value } : c))
  }

  const finalCategory = category === 'Своя категория' ? customCat : category

  return (
    <WarehouseLayout>
      <div style={{ padding: '24px 32px', maxWidth: 680 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/cells')}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--muted)' }}>
            ←
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>Конструктор секции</h1>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 600,
                  background: i < step ? 'var(--green)' : i === step ? 'var(--blue)' : 'var(--border)',
                  color: i <= step ? '#fff' : 'var(--muted)',
                  transition: 'all 0.2s',
                }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <div style={{ fontSize: 10, marginTop: 4, color: i === step ? 'var(--blue)' : 'var(--muted)', fontWeight: i === step ? 600 : 400 }}>
                  {s}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ height: 2, flex: 1, background: i < step ? 'var(--green)' : 'var(--border)', marginBottom: 18, transition: 'background 0.2s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0 — name + category */}
        {step === 0 && (
          <div>
            <Input label="Название секции" placeholder="А · Реквизит" value={name} onChange={e => setName(e.target.value)} />
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Категория</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-badge)',
                    border: `1px solid ${category === c ? 'var(--blue)' : 'var(--border)'}`,
                    background: category === c ? 'var(--blue-dim)' : 'var(--white)',
                    color: category === c ? 'var(--blue)' : 'var(--text)',
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{c}</button>
                ))}
              </div>
              {category === 'Своя категория' && (
                <input
                  value={customCat} onChange={e => setCustomCat(e.target.value)}
                  placeholder="Введите название категории"
                  style={{
                    marginTop: 10, width: '100%', height: 40, padding: '0 12px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
                    fontSize: 14, outline: 'none',
                  }}
                />
              )}
            </div>
            <Button fullWidth disabled={!name || !category || (category === 'Своя категория' && !customCat)}
              onClick={handleNext}>
              Далее — Размер
            </Button>
          </div>
        )}

        {/* Step 1 — rows + shelves */}
        {step === 1 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 20 }}>Количество рядов и полок</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Рядов (строк)</div>
                <NumberStepper value={rows} min={1} max={26} onChange={setRows} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Полок (столбцов)</div>
                <NumberStepper value={shelves} min={1} max={20} onChange={setShelves} />
              </div>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
                Предпросмотр — {rows * shelves} ячеек
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${Math.min(shelves, 10)}, 1fr)`,
                gap: 4,
              }}>
                {genCells(rows, shelves).slice(0, rows * Math.min(shelves, 10)).map((c, i) => (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: 6,
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'var(--muted)',
                  }}>{c.id}</div>
                ))}
              </div>
            </div>

            <Button fullWidth onClick={handleNext}>Далее — Коды ячеек</Button>
          </div>
        )}

        {/* Step 2 — cell codes */}
        {step === 2 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Коды ячеек</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Измените коды если нужно — буква, цифра или комбинация
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(shelves, 6)}, 1fr)`,
              gap: 8, marginBottom: 24,
            }}>
              {cells.map(c => (
                <input key={c.id}
                  value={c.id}
                  onChange={e => updateCellCode(c.id, e.target.value)}
                  style={{
                    height: 36, textAlign: 'center', fontSize: 12, fontWeight: 500,
                    border: '1px solid var(--border)', borderRadius: 6,
                    background: 'var(--white)', outline: 'none',
                  }}
                />
              ))}
            </div>
            <Button fullWidth onClick={handleNext}>Далее — Переименование</Button>
          </div>
        )}

        {/* Step 3 — custom names */}
        {step === 3 && (
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Переименование ячеек</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Нажмите на ячейку чтобы задать произвольное имя
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(shelves, 6)}, 1fr)`,
              gap: 8, marginBottom: 24,
            }}>
              {cells.map(c => (
                <div key={c.id}>
                  <div
                    onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                    style={{
                      aspectRatio: '1', borderRadius: 8, cursor: 'pointer',
                      border: `2px solid ${editingId === c.id ? 'var(--blue)' : 'var(--border)'}`,
                      background: editingId === c.id ? 'var(--blue-dim)' : c.custom ? 'var(--green-dim)' : 'var(--bg)',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 500, color: 'var(--text)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span>{c.id}</span>
                    {c.custom && <span style={{ fontSize: 8, color: 'var(--muted)', marginTop: 2 }}>{c.custom}</span>}
                  </div>
                  {editingId === c.id && (
                    <input
                      autoFocus
                      value={c.custom}
                      onChange={e => updateCellCustom(c.id, e.target.value)}
                      placeholder="Имя ячейки"
                      style={{
                        marginTop: 4, width: '100%', height: 28, padding: '0 6px',
                        border: '1px solid var(--blue)', borderRadius: 4,
                        fontSize: 11, outline: 'none',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
            <Button fullWidth onClick={handleNext}>Создать секцию</Button>
          </div>
        )}

        {/* Step 4 — done */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>Секция создана</div>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 8 }}>
              {name} · {finalCategory}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 32 }}>
              {cells.length} ячеек · {rows} рядов × {shelves} полок
            </div>

            {/* Final map preview */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(shelves, 8)}, 1fr)`,
              gap: 6, marginBottom: 32,
            }}>
              {cells.map(c => (
                <div key={c.id} style={{
                  aspectRatio: '1', borderRadius: 6,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: 'var(--muted)',
                }}>
                  {c.custom || c.id}
                </div>
              ))}
            </div>

            <Button fullWidth onClick={() => navigate('/cells')}>Перейти к карте ячеек</Button>
          </div>
        )}
      </div>
    </WarehouseLayout>
  )
}

function NumberStepper({ value, min, max, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)', overflow: 'hidden', width: 'fit-content' }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} style={{
        width: 40, height: 40, border: 'none', background: 'var(--bg)',
        fontSize: 18, cursor: 'pointer', color: 'var(--muted)',
      }}>−</button>
      <span style={{ width: 48, textAlign: 'center', fontWeight: 600, fontSize: 16 }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} style={{
        width: 40, height: 40, border: 'none', background: 'var(--bg)',
        fontSize: 18, cursor: 'pointer', color: 'var(--muted)',
      }}>+</button>
    </div>
  )
}
