import { useEffect, useRef } from 'react'

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dayName = d.toLocaleString('tr-TR', { weekday: 'short' })
  const dayNum = d.getDate()
  const month = d.toLocaleString('tr-TR', { month: 'short' })
  return `${dayName} ${dayNum} ${month}`
}

function SyncConflictModal({ open, conflicts, onConfirm, onCancel }) {
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

  if (!open || conflicts.length === 0) return null

  const grouped = {}
  for (const c of conflicts) {
    if (!grouped[c.date]) grouped[c.date] = []
    grouped[c.date].push(c)
  }

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
        className="relative w-full rounded-xl overflow-hidden"
        style={{
          maxWidth: '420px',
          maxHeight: '80vh',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h3
            style={{
              color: 'var(--text-heading)',
              fontSize: '17px',
              fontWeight: 600,
              margin: '0 0 8px',
            }}
          >
            Senkronizasyon Celişkisi
          </h3>
          <p
            style={{
              color: 'var(--text-muted)',
              fontSize: '14px',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Google Drive ile yerel verileriniz arasında farklar bulundu.
          </p>
        </div>

        <div
          className="px-5 pb-3 overflow-y-auto"
          style={{ flex: '1 1 0', minHeight: 0 }}
        >
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-3 last:mb-0">
              <div
                className="text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {formatDateLabel(date)}
              </div>
              <div className="space-y-1">
                {items.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'var(--surface-raised)' }}
                  >
                    <div style={{ color: 'var(--text-heading)', fontWeight: 500 }}>
                      {c.exerciseName}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {c.reps} tekrar — Yerel {c.localWeight}kg / Drive {c.driveWeight}kg
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
            }}
          >
            Yerel Veriyi Kullan
          </button>
        </div>
      </div>
    </div>
  )
}

export default SyncConflictModal
