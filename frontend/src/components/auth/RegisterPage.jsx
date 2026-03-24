import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import Input from '../shared/Input'
import Button from '../shared/Button'
import { auth as authApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { getHomeRoute } from '../../utils/getHomeRoute'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('token')
  const { login } = useAuth()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Введите ФИО'
    if (!form.email) e.email = 'Введите email'
    if (form.password.length < 6) e.password = 'Минимум 6 символов'
    if (form.password !== form.confirm) e.confirm = 'Пароли не совпадают'
    return e
  }

  async function handleSubmit(ev) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setApiError('')
    setLoading(true)
    try {
      const data = await authApi.register({
        name: form.name,
        email: form.email,
        password: form.password,
        token: inviteToken,
      })
      login(data.token, data.user)
      navigate(getHomeRoute(data.user.role))
    } catch (err) {
      setApiError(err.message || 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, textAlign: 'center' }}>
        Создание аккаунта
      </h2>

      <form onSubmit={handleSubmit}>
        <Input label="ФИО" placeholder="Иванов Иван Иванович" value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <Input label="Пароль" type="password" placeholder="••••••••" value={form.password} onChange={set('password')} error={errors.password} />
        <Input label="Подтверждение пароля" type="password" placeholder="••••••••" value={form.confirm} onChange={set('confirm')} error={errors.confirm} />

        {apiError && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
            {apiError}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} style={{ marginTop: 4 }}>
          Зарегистрироваться
        </Button>
      </form>
    </AuthLayout>
  )
}
