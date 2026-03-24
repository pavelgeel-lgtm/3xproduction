import { useRef, useState, useEffect } from 'react'

const SIGNATURE_WIDTH = 600
const SIGNATURE_HEIGHT = 200

export default function SignatureCanvas({ onSave, onClear }) {
  const canvasRef = useRef()
  const [drawing, setDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = '#111111'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = SIGNATURE_WIDTH / rect.width
    const scaleY = SIGNATURE_HEIGHT / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setDrawing(true)
    setIsEmpty(false)
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  function stopDraw(e) {
    e.preventDefault()
    setDrawing(false)
  }

  function clear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, SIGNATURE_WIDTH, SIGNATURE_HEIGHT)
    setIsEmpty(true)
    onClear && onClear()
  }

  function save() {
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    onSave && onSave(dataUrl)
  }

  return (
    <div>
      <div style={{
        border: '1px solid var(--border)', borderRadius: 'var(--radius-card)',
        background: 'var(--white)', overflow: 'hidden',
        touchAction: 'none',
      }}>
        <canvas
          ref={canvasRef}
          width={SIGNATURE_WIDTH}
          height={SIGNATURE_HEIGHT}
          style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={clear} style={{
          flex: 1, height: 36, borderRadius: 'var(--radius-btn)',
          border: '1px solid var(--border)', background: 'var(--white)',
          fontSize: 13, color: 'var(--muted)', cursor: 'pointer',
        }}>Очистить</button>
        <button onClick={save} disabled={isEmpty} style={{
          flex: 2, height: 36, borderRadius: 'var(--radius-btn)',
          border: 'none', background: isEmpty ? 'var(--border)' : 'var(--blue)',
          color: isEmpty ? 'var(--muted)' : 'var(--white)',
          fontSize: 13, fontWeight: 500, cursor: isEmpty ? 'not-allowed' : 'pointer',
        }}>Подписать</button>
      </div>
    </div>
  )
}
