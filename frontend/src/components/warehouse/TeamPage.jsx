import { useState, useEffect } from 'react'
import { Search } from 'lucide-react'
import WarehouseLayout from './WarehouseLayout'
import { team as teamApi } from '../../services/api'
import { ROLES } from '../../constants/roles'

const css = `
.team-page { padding: 28px 32px; max-width: 900px; }
.team-title { font-size: 22px; font-weight: 600; letter-spacing: -0.03em; margin-bottom: 2px; }
.team-sub { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
.team-search-wrap { position: relative; margin-bottom: 20px; }
.team-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
.team-search {
  width: 100%; height: 40px; padding: 0 14px 0 38px;
  border: 1px solid var(--border); border-radius: var(--radius-input);
  background: var(--card); color: var(--text); font-size: 14px;
  transition: border-color 0.15s;
}
.team-search:focus { border-color: var(--accent); }
.team-list { display: flex; flex-direction: column; gap: 8px; }
.team-item {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-card); padding: 14px 18px;
  display: flex; align-items: center; gap: 14px;
  box-shadow: var(--shadow-sm);
}
.team-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600; color: #fff; flex-shrink: 0;
}
.team-name { font-weight: 600; font-size: 14px; }
.team-email { font-size: 12px; color: var(--muted); margin-top: 2px; }
.team-role-badge {
  display: inline-block; padding: 3px 10px;
  background: var(--accent-dim); color: var(--accent);
  border-radius: 20px; font-size: 12px; font-weight: 500;
}
.team-zone { font-size: 11px; color: var(--muted); margin-top: 3px; }
.team-date { font-size: 11px; color: var(--muted); margin-top: 3px; }
.team-empty { color: var(--muted); font-size: 14px; padding: 60px 0; text-align: center; }

@media (max-width: 768px) {
  .team-page { padding: 16px; }
  .team-title { font-size: 18px; }
  .team-item { padding: 12px 14px; }
}
`

const COLORS = ['#d97757', '#2563eb', '#16a34a', '#8b5cf6', '#ec4899', '#14b8a6']
function colorFor(id) {
  let n = 0
  for (let i = 0; i < (id || '').length; i++) n += id.charCodeAt(i)
  return COLORS[n % COLORS.length]
}
function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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
      <style>{css}</style>
      <div className="team-page">
        <h1 className="team-title">Команда</h1>
        <p className="team-sub">{loading ? '...' : `${members.length} участников`}</p>

        <div className="team-search-wrap">
          <Search size={15} className="team-search-icon" />
          <input
            className="team-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени, email или роли..."
          />
        </div>

        {loading ? (
          <div className="team-empty">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="team-empty">Никого не найдено</div>
        ) : (
          <div className="team-list">
            {filtered.map(m => (
              <div key={m.id} className="team-item">
                <div className="team-avatar" style={{ background: colorFor(m.id) }}>
                  {getInitials(m.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="team-name">{m.name}</div>
                  <div className="team-email">{m.email}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="team-role-badge">{ROLES[m.role]?.label || m.role}</div>
                  {m.warehouse_zone && <div className="team-zone">Зона: {m.warehouse_zone}</div>}
                  <div className="team-date">с {formatDate(m.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WarehouseLayout>
  )
}
