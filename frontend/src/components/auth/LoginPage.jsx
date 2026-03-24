import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import Input from '../shared/Input'
import Button from '../shared/Button'
import { auth as authApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) { setError('Заполните все поля'); return }
    setLoading(true)
    try {
      const data = await authApi.login(form.email, form.password)
      login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, textAlign: 'center' }}>
        Вход в систему
      </h2>

      <form onSubmit={handleSubmit}>
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
        />
        <Input
          label="Пароль"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={set('password')}
        />

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading} style={{ marginTop: 4 }}>
          Войти
        </Button>
      </form>

      <div style={{ marginTop: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
        <Link to="/recover" style={{ color: 'var(--blue)' }}>Забыли пароль?</Link>
      </div>
    </AuthLayout>
  )
}
