import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductionLayout from './ProductionLayout'
import Button from '../shared/Button'
import Badge from '../shared/Badge'
import { auth as authApi } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { ROLES } from '../../constants/roles'
import { getHomeRoute } from '../../utils/getHomeRoute'

const ROLE_GROUPS = [
  {
    label: 'Склад',
    roles: ['warehouse_director', 'warehouse_deputy', 'warehouse_staff'],
    color: 'blue',
  },
  {
    label: 'Проект',
    roles: [
      'project_director', 'production_designer', 'art_director_assistant',
      'decorator', 'props_master', 'costumer',
    ],
    color: 'green',
  },
]

const ALL_FILTER_ROLES = ROLE_GROUPS.flatMap(g => g.roles)

export default function StaffPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [switching, setSwitching] = useState(null)

  useEffect(() => {
    authApi.users()
      .then(data => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleImpersonate(userId, role) {
    setSwitching(userId)
    try {
      // Save current producer session
      sessionStorage.setItem('producer_token', localStorage.getItem('token'))
      sessionStorage.setItem('producer_user', localStorage.getItem('user'))

      const data = await authApi.impersonate(userId)
      login(data.token, data.user)

      // Navigate to the target role's home
      const home = getHomeRoute(role)
      navigate(home)
      window.location.reload()
    } catch (e) {
      alert(e.message || 'Ошибка переключения')
      sessionStorage.removeItem('producer_token')
      sessionStorage.removeItem('producer_user')
    }
    setSwitching(null)
  }

  const filtered = users.filter(u => {
    if (filter !== 'all') {
      const group = ROLE_GROUPS.find(g => g.label === filter)
      if (group && !group.roles.includes(u.role)) return false
    }
    if (search) {
      const q = search.toLowerCase()
      if (!u.name?.toLowerCase().includes(q) && !u.email?.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <ProductionLayout>
      <div style={{ padding: '24px 32px', maxWidth: 800 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>Сотрудники</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            Переключитесь в интерфейс любого сотрудника
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {['all', ...ROLE_GROUPS.map(g => g.label)].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
              border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
              background: filter === f ? 'var(--accent)' : 'var(--card)',
              color: filter === f ? '#fff' : 'var(--text)',
              cursor: 'pointer',
            }}>
              {f === 'all' ? 'Все' : f}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени или email..."
            style={{
              width: '100%', height: 40, padding: '0 14px',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
              fontSize: 13, outline: 'none', boxSizing: 'border-box',
            }} />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>Нет сотрудников</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(u => {
              const roleDef = ROLES[u.role] || {}
              const group = ROLE_GROUPS.find(g => g.roles.includes(u.role))
              return (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', background: 'var(--card)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-card)',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: group?.color === 'blue' ? 'var(--blue-dim)' : group?.color === 'green' ? 'var(--green-dim)' : 'var(--bg)',
                    color: group?.color === 'blue' ? 'var(--blue)' : group?.color === 'green' ? 'var(--green)' : 'var(--muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600, flexShrink: 0,
                  }}>
                    {(u.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>{roleDef.label || u.role}</span>
                      {u.project_name && <span>· {u.project_name}</span>}
                    </div>
                  </div>

                  {/* Action */}
                  <Button variant="secondary"
                    style={{ height: 34, fontSize: 13, padding: '0 16px', flexShrink: 0 }}
                    disabled={switching === u.id}
                    onClick={() => handleImpersonate(u.id, u.role)}>
                    {switching === u.id ? '...' : 'Войти'}
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ProductionLayout>
  )
}
