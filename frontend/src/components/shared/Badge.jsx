export default function Badge({ children, color = 'blue' }) {
  const colors = {
    blue:   { background: 'var(--blue-dim)',   color: 'var(--blue)' },
    green:  { background: 'var(--green-dim)',  color: 'var(--green)' },
    red:    { background: 'var(--red-dim)',    color: 'var(--red)' },
    amber:  { background: 'var(--amber-dim)', color: 'var(--amber)' },
    muted:  { background: 'var(--bg-secondary)', color: 'var(--muted)' },
    accent: { background: 'var(--accent-dim)', color: 'var(--accent)' },
  }
  const c = colors[color] || colors.blue
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 9px',
      borderRadius: 'var(--radius-badge)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.01em',
      ...c,
    }}>
      {children}
    </span>
  )
}
