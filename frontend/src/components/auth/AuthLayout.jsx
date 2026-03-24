import Logo from './Logo'

export default function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: 'var(--white)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        padding: '40px 32px',
      }}>
        <Logo />
        {children}
      </div>
    </div>
  )
}
