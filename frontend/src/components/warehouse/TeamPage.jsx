import { useState, useEffect } from 'react'
import WarehouseLayout from './WarehouseLayout'
import { team as teamApi } from '../../services/api'
import { ROLES } from '../../constants/roles'

function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const COLORS = ['var(--blue)', 'var(--green)', 'var(--amber)', '#8b5cf6', '#ec4899', '#14b8a6']

function colorFor(id) {
  let n = 0
  for (let i = 0; i < (id || '').length; i++) n += id.charCodeAt(i)
  return COLORS[n % COLORS.length]
}

function formatDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function TeamPage() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    teamApi.list()
      .then(data => setMembers(data.team || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase()) ||
    (ROLES[m.role]?.label || m.role).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <WarehouseLayout>
      <div style={{ padding: '28px 32px', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 2 }}>Команда</h1>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              {loading ? '...' : `${members.length} участников`}
            </p>
          </div>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени, email или роли..."
          style={{
            width: '100%', height: 40, padding: '0 14px',
            border: '1px solid var(--border)', borderRadius: 10,
            fontSize: 14, background: 'var(--white)', marginBottom: 20,
            boxSizing: 'border-box', color: 'var(--text)',
          }}
        />

        {loading ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>Никого не найдено</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(m => {
              const roleLabel = ROLES[m.role]?.label || m.role
              const color = colorFor(m.id)
              return (
                <div key={m.id} style={{
                  background: 'var(--white)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-card)', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: color, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 14, fontWeight: 600,
                    color: '#fff', flexShrink: 0,
                  }}>
                    {getInitials(m.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{m.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-block', padding: '3px 10px',
                      background: 'var(--blue-dim)', color: 'var(--blue)',
                      borderRadius: 8, fontSize: 12, fontWeight: 500,
                    }}>
                      {roleLabel}
                    </div>
                    {m.warehouse_zone && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                        Зона: {m.warehouse_zone}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      с {formatDate(m.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </WarehouseLayout>
  )
}
