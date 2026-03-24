import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import Button from '../shared/Button'
import { ROLES } from '../../constants/roles'
import { invites } from '../../services/api'

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [invite, setInvite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    invites.get(token)
      .then(data => setInvite(data.invite))
      .catch(() => setError('Приглашение не найдено или истекло'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>Загрузка...</div>
      </AuthLayout>
    )
  }

  if (error || !invite) {
    return (
      <AuthLayout>
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--red)' }}>
          {error || 'Приглашение недействительно'}
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--blue-dim)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 22,
        }}>
          ✉️
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Вас пригласили
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>
          {invite.invited_by_name || 'Администратор'} приглашает вас в систему
        </p>
      </div>

      <div style={{
        background: 'var(--bg)',
        borderRadius: 'var(--radius-card)',
        padding: '16px',
        marginBottom: 24,
      }}>
        <Row label="Роль" value={ROLES[invite.role]?.label || invite.role} />
        {invite.project_name && <Row label="Проект" value={invite.project_name} last />}
      </div>

      <Button fullWidth onClick={() => navigate(`/register?token=${token}`)}>
        Принять приглашение
      </Button>

      <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 16 }}>
        Регистрация возможна только по инвайту
      </p>
    </AuthLayout>
  )
}

function Row({ label, value, last }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: last ? 0 : 10, marginBottom: last ? 0 : 10,
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 500, fontSize: 13 }}>{value}</span>
    </div>
  )
}
