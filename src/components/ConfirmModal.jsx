import { useEffect, useRef } from 'react'

function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel }) {
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 50, padding: '16px' }}
      onClick={onCancel}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
      />
      <div
        ref={dialogRef}
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          maxWidth: '380px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <h3
            style={{
              color: 'var(--text-heading)',
              fontSize: '17px',
              fontWeight: 600,
              margin: '0 0 8px',
            }}
          >
            {title}
          </h3>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {message}
          </p>
        </div>
        <div
          className="flex gap-2 px-5 pb-5"
          style={{ justifyContent: 'flex-end' }}
        >
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium"
            style={{
              background: 'var(--surface-raised)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            İptal
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
