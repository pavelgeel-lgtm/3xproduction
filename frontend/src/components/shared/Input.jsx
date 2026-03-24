export default function Input({ label, error, ...props }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, fontSize: 13 }}>
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          width: '100%',
          height: 40,
          padding: '0 12px',
          border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-btn)',
          background: 'var(--white)',
          fontSize: 14,
          outline: 'none',
          transition: 'border-color 0.15s',
          ...props.style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--blue)'}
        onBlur={e => e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'}
      />
      {error && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{error}</div>
      )}
    </div>
  )
}
