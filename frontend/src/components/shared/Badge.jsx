export default function Badge({ children, color = 'blue' }) {
  const colors = {
    blue:  { background: 'var(--blue-dim)',  color: 'var(--blue)' },
    green: { background: 'var(--green-dim)', color: 'var(--green)' },
    red:   { background: 'var(--red-dim)',   color: 'var(--red)' },
    amber: { background: 'var(--amber-dim)', color: 'var(--amber)' },
    muted: { background: 'var(--bg)',        color: 'var(--muted)' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 'var(--radius-badge)',
      fontSize: 12, fontWeight: 500,
      ...colors[color],
    }}>
      {children}
    </span>
  )
}
