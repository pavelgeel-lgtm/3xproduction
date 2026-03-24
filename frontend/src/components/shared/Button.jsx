export default function Button({ children, variant = 'primary', loading, fullWidth, ...props }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    padding: '0 18px',
    borderRadius: 'var(--radius-btn-lg)',
    fontWeight: 500,
    fontSize: 14,
    border: 'none',
    transition: 'opacity 0.15s',
    cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
    opacity: props.disabled || loading ? 0.6 : 1,
    width: fullWidth ? '100%' : undefined,
  }

  const variants = {
    primary: { background: 'var(--blue)', color: 'var(--white)' },
    secondary: { background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' },
    danger: { background: 'var(--red)', color: 'var(--white)' },
    ghost: { background: 'transparent', color: 'var(--blue)' },
  }

  return (
    <button {...props} style={{ ...base, ...variants[variant], ...props.style }}>
      {loading ? '...' : children}
    </button>
  )
}
