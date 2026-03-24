import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import Input from '../shared/Input'
import Button from '../shared/Button'
import { auth as authApi } from '../../services/api'

export default function RecoverPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStep1(e) {
    e.preventDefault()
    if (!email) { setError('Введите email'); return }
    setError('')
    setLoading(true)
    try {
      await authApi.recoverRequest(email)
      setStep(2)
    } catch (err) {
      setError(err.message || 'Email не найден')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2(e) {
    e.preventDefault()
    if (code.length !== 6) { setError('Введите 6-значный код'); return }
    setError('')
    setLoading(true)
    try {
      await authApi.recoverVerify(email, code)
      setStep(3)
    } catch (err) {
      setError(err.message || 'Неверный код')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep3(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Минимум 6 символов'); return }
    if (password !== confirm) { setError('Пароли не совпадают'); return }
    setError('')
    setLoading(true)
    try {
      await authApi.recoverReset(email, code, password)
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Ошибка сброса пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <StepIndicator step={step} />

      {step === 1 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
            Восстановление пароля
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            Введите email — отправим код подтверждения
          </p>
          <form onSubmit={handleStep1}>
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <Button type="submit" fullWidth loading={loading}>Отправить код</Button>
          </form>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
            Введите код
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            Отправили 6-значный код на {email}
          </p>
          <form onSubmit={handleStep2}>
            <Input
              label="Код из письма"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', letterSpacing: 8, fontSize: 20 }}
            />
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <Button type="submit" fullWidth loading={loading}>Подтвердить</Button>
          </form>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
            Новый пароль
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            Придумайте новый пароль для входа
          </p>
          <form onSubmit={handleStep3}>
            <Input label="Новый пароль" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            <Input label="Подтверждение" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
            <Button type="submit" fullWidth loading={loading}>Сохранить пароль</Button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}

function StepIndicator({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, gap: 4 }}>
      {[1, 2, 3].map(s => (
        <div key={s} style={{
          width: s === step ? 20 : 8, height: 8,
          borderRadius: 4,
          background: s <= step ? 'var(--blue)' : 'var(--border)',
          transition: 'all 0.2s',
        }} />
      ))}
    </div>
  )
}
