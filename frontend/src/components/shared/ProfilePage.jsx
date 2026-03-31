import { useState } from 'react'
import WarehouseLayout from '../warehouse/WarehouseLayout'
import ProductionLayout from '../production/ProductionLayout'
import Button from './Button'
import Input from './Input'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { auth } from '../../services/api'

export default function ProfilePage() {
  const { user, login } = useAuth()
  const [nameVal, setNameVal] = useState(user?.name || '')
  const [nameSaving, setNameSaving] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [phoneVal, setPhoneVal] = useState(user?.phone || '')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneSaved, setPhoneSaved] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwSaved, setPwSaved] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '??'
  const roleLabel = user?.role ? (ROLES[user.role]?.label || user.role) : '—'

  function set(f) { return e => setPwForm(p => ({ ...p, [f]: e.target.value })) }

  async function savePassword(e) {
    e.preventDefault()
    const errors = {}
    if (!pwForm.current) errors.current = 'Введите текущий пароль'
    if (pwForm.next.length < 6) errors.next = 'Минимум 6 символов'
    if (pwForm.next !== pwForm.confirm) errors.confirm = 'Пароли не совпадают'
    if (Object.keys(errors).length) { setPwErrors(errors); return }
    setPwLoading(true)
    try {
      await auth.changePassword(pwForm.current, pwForm.next)
      setPwErrors({})
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err) {
      setPwErrors({ current: err.message })
    } finally {
      setPwLoading(false)
    }
  }

  const Layout = ROLES[user?.role]?.world === 'production' ? ProductionLayout : WarehouseLayout

  return (
    <Layout>
      <style>{`
        @media (max-width: 768px) {
          .prof-field-row { flex-wrap: nowrap !important; align-items: flex-end !important; }
          .prof-field-row > div { min-width: 0; margin-bottom: 0 !important; }
          .prof-field-row button { flex-shrink: 0; white-space: nowrap; margin-bottom: 0 !important; }
        }
      `}</style>
      <div style={{ padding: '24px 32px', maxWidth: 560 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 28 }}>Профиль</h1>

        <div style={{
          background: 'var(--white)', borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)', padding: '24px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--blue)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--white)', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{user?.name || '—'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{user?.email || '—'}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 12, padding: '3px 10px', borderRadius: 'var(--radius-badge)',
                background: 'var(--blue-dim)', color: 'var(--blue)', fontWeight: 500,
              }}>{roleLabel}</span>
            </div>
          </div>
        </div>

        <div style={{
          background: 'var(--white)', borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)', padding: '24px', marginBottom: 20,
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Имя и фамилия</div>
          <div className="prof-field-row" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input label="ФИО" value={nameVal} onChange={e => setNameVal(e.target.value)} />
            </div>
            <Button disabled={nameSaving || !nameVal.trim() || nameVal === user?.name}
              style={{ height: 40, flexShrink: 0, marginBottom: 16 }}
              onClick={async () => {
                setNameSaving(true)
                try {
                  await auth.changeName(nameVal.trim())
                  const updated = { ...user, name: nameVal.trim() }
                  login(localStorage.getItem('token'), updated)
                  setNameSaved(true)
                  setTimeout(() => setNameSaved(false), 2500)
                } catch {}
                setNameSaving(false)
              }}>
              {nameSaving ? '...' : 'Сохранить'}
            </Button>
          </div>
          {nameSaved && <div style={{ color: 'var(--green)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>Сохранено</div>}

          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, marginTop: 20 }}>Телефон</div>
          <div className="prof-field-row" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input label="Номер телефона" placeholder="+7 900 000 00 00" value={phoneVal} onChange={e => setPhoneVal(e.target.value)} />
            </div>
            <Button disabled={phoneSaving || !phoneVal.trim() || phoneVal === (user?.phone || '')}
              style={{ height: 40, flexShrink: 0, marginBottom: 16 }}
              onClick={async () => {
                setPhoneSaving(true)
                try {
                  await auth.changePhone(phoneVal.trim())
                  const updated = { ...user, phone: phoneVal.trim() }
                  login(localStorage.getItem('token'), updated)
                  setPhoneSaved(true)
                  setTimeout(() => setPhoneSaved(false), 2500)
                } catch {}
                setPhoneSaving(false)
              }}>
              {phoneSaving ? '...' : 'Сохранить'}
            </Button>
          </div>
          {phoneSaved && <div style={{ color: 'var(--green)', fontSize: 13, marginTop: 8, fontWeight: 500 }}>Сохранено</div>}
        </div>

        <div style={{
          background: 'var(--white)', borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)', padding: '24px',
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 20 }}>Смена пароля</div>
          <form onSubmit={savePassword}>
            <Input label="Текущий пароль" type="password" placeholder="••••••••"
              value={pwForm.current} onChange={set('current')} error={pwErrors.current} />
            <Input label="Новый пароль" type="password" placeholder="••••••••"
              value={pwForm.next} onChange={set('next')} error={pwErrors.next} />
            <Input label="Подтверждение" type="password" placeholder="••••••••"
              value={pwForm.confirm} onChange={set('confirm')} error={pwErrors.confirm} />

            {pwSaved && (
              <div style={{
                background: 'var(--green-dim)', color: 'var(--green)',
                borderRadius: 8, padding: '10px 14px', fontSize: 13,
                marginBottom: 14, fontWeight: 500,
              }}>
                ✓ Пароль успешно изменён
              </div>
            )}

            <Button type="submit" disabled={pwLoading}>{pwLoading ? 'Сохранение...' : 'Сохранить пароль'}</Button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
