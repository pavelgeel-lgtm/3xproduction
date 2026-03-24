import { Loader2 } from 'lucide-react'

const styles = `
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px;
  border-radius: var(--radius-btn);
  font-weight: 500;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
  white-space: nowrap;
  letter-spacing: -0.01em;
}
.btn:active:not(:disabled) { transform: scale(0.98); }
.btn:disabled { cursor: not-allowed; opacity: 0.5; }

.btn-primary   { background: var(--accent); color: #fff; }
.btn-primary:hover:not(:disabled)   { background: var(--accent-hover); }

.btn-secondary { background: var(--white); color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover:not(:disabled) { background: var(--bg); }

.btn-danger    { background: var(--red); color: #fff; }
.btn-danger:hover:not(:disabled)    { background: #b91c1c; }

.btn-ghost     { background: transparent; color: var(--accent); }
.btn-ghost:hover:not(:disabled)     { background: var(--accent-dim); }

.btn-full { width: 100%; }

@keyframes spin { to { transform: rotate(360deg); } }
.btn-spinner { animation: spin 0.7s linear infinite; }
`

export default function Button({ children, variant = 'primary', loading, fullWidth, className = '', ...props }) {
  return (
    <>
      <style>{styles}</style>
      <button
        {...props}
        disabled={props.disabled || loading}
        className={`btn btn-${variant}${fullWidth ? ' btn-full' : ''} ${className}`}
        style={props.style}
      >
        {loading
          ? <Loader2 size={15} className="btn-spinner" />
          : children}
      </button>
    </>
  )
}
