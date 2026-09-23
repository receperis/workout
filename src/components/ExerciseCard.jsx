import { useState, useEffect, useRef } from 'react'
import { PYRAMID_REPS } from '../types'
import ImageViewer from './ImageViewer'

const REP_ACCENT = {
  15: 'var(--rep-15)',
  13: 'var(--rep-13)',
  11: 'var(--rep-11)',
  9: 'var(--rep-9)',
  7: 'var(--rep-7)',
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const month = d.toLocaleString('tr-TR', { month: 'short' })
  const day = d.getDate()
  return `${month} ${day}`
}

function ExerciseCard({ exerciseId, exerciseName, exerciseImage, onChange, initialSets, previousWeights, previousDate, savedLabel, readOnly }) {
  const hasData = initialSets?.some((s) => s.weight > 0)
  const [collapsed, setCollapsed] = useState(readOnly ? !hasData : true)
  const [weights, setWeights] = useState(() =>
    PYRAMID_REPS.map((reps) => {
      const existing = initialSets?.find((s) => s.reps === reps)
      return existing?.weight || ''
    }),
  )
  const [customSets, setCustomSets] = useState(() =>
    initialSets
      ?.filter((s) => !PYRAMID_REPS.includes(s.reps))
      .map((s) => ({ reps: s.reps, weight: s.weight === 0 ? '' : String(s.weight) })) || [],
  )
  const [viewerImage, setViewerImage] = useState(null)

  const prevReadOnly = useRef(readOnly)
  useEffect(() => {
    if (prevReadOnly.current && !readOnly) setCollapsed(false)
    prevReadOnly.current = readOnly
  }, [readOnly])

  useEffect(() => {
    const pyramidSets = PYRAMID_REPS.map((reps, i) => ({
      exerciseId,
      reps,
      weight: weights[i] === '' ? 0 : Number(weights[i]),
    }))
    const extraSets = customSets.map((cs) => ({
      exerciseId,
      reps: cs.reps,
      weight: cs.weight === '' ? 0 : Number(cs.weight),
    }))
    onChange([...pyramidSets, ...extraSets])
  }, [weights, customSets, exerciseId])

  const pyramidTotal = weights.reduce((sum, w, i) => {
    const weight = w === '' ? 0 : Number(w)
    return sum + PYRAMID_REPS[i] * weight
  }, 0)
  const customTotal = customSets.reduce((sum, cs) => {
    const weight = cs.weight === '' ? 0 : Number(cs.weight)
    return sum + cs.reps * weight
  }, 0)
  const total = pyramidTotal + customTotal

  const handleChange = (index, value) => {
    setWeights((prev) => {
      const next = [...prev]
      next[index] = value === '' ? '' : Math.max(0, Number(value))
      return next
    })
  }

  const handleCustomChange = (index, field, value) => {
    setCustomSets((prev) => {
      const next = [...prev]
      if (field === 'reps') {
        next[index] = { ...next[index], reps: value === '' ? 0 : Math.max(0, Math.floor(Number(value))) }
      } else {
        next[index] = { ...next[index], weight: value === '' ? '' : Math.max(0, Number(value)) }
      }
      return next
    })
  }

  const addCustomSet = () => {
    setCustomSets((prev) => [...prev, { reps: 0, weight: '' }])
  }

  const removeCustomSet = (index) => {
    setCustomSets((prev) => prev.filter((_, i) => i !== index))
  }

  const weightSummary = weights
    .map((w) => (w === '' ? '—' : String(w)))
    .join(' / ')
  const customSummary = customSets
    .filter((cs) => cs.reps > 0)
    .map((cs) => `${cs.reps}×${cs.weight === '' ? '—' : cs.weight}`)
    .join(' / ')
  const fullSummary = [weightSummary, customSummary].filter(Boolean).join(' + ')

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--accent)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full text-left px-5 pt-4 pb-2 flex items-center justify-between gap-2 cursor-pointer"
        style={{ background: 'transparent', border: 'none' }}
        aria-expanded={!collapsed}
        aria-label={`${exerciseName}, ${collapsed ? 'genişlet' : 'daralt'}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {exerciseImage && (
            <img
              src={exerciseImage}
              alt={exerciseName}
              className="w-12 h-12 rounded-lg object-cover shrink-0 cursor-pointer"
              style={{ border: '1px solid var(--border)' }}
              onClick={(e) => {
                e.stopPropagation()
                setViewerImage(exerciseImage)
              }}
            />
          )}
          <h3 style={{ color: 'var(--text-heading)', fontSize: '17px', fontWeight: 600, margin: 0 }}>
            {exerciseName}
          </h3>
        </div>
        <svg
          className="w-4 h-4 shrink-0 transition-transform"
          style={{
            color: 'var(--text-muted)',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-5 pb-3 space-y-2">
          {PYRAMID_REPS.map((reps, i) => (
            <div
              key={reps}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ background: 'var(--surface-raised)' }}
            >
              <span
                className="text-lg font-bold w-8 text-right shrink-0 tabular-nums"
                style={{ color: REP_ACCENT[reps] }}
              >
                {reps}
              </span>
              <input
                type="number"
                min="0"
                disabled={readOnly}
                className="flex-1 rounded-lg px-3 py-2.5 text-base tabular-nums outline-none"
                style={{
                  background: readOnly ? 'var(--surface-raised)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: readOnly ? 'var(--text-muted)' : 'var(--text-heading)',
                  opacity: readOnly ? 0.7 : 1,
                  width: '50%',
                }}
                aria-label={`${exerciseName} ${reps} tekrar ağırlığı`}
                value={weights[i]}
                onChange={(e) => handleChange(i, e.target.value)}
              />
              <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>kg</span>
              {previousWeights && previousWeights[i] > 0 && (
                <div
                  className="shrink-0 rounded-md flex flex-col items-center justify-center"
                  style={{
                    width: '52px',
                    height: '44px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span
                    className="text-sm font-semibold tabular-nums leading-tight"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {previousWeights[i]}
                  </span>
                  <span
                    className="leading-tight"
                    style={{ fontSize: '10px', color: 'var(--text-muted)' }}
                  >
                    {formatShortDate(previousDate)}
                  </span>
                </div>
              )}
            </div>
          ))}

          {customSets.map((cs, i) => {
            const prevIdx = PYRAMID_REPS.length + i
            const prevWeight = previousWeights?.[prevIdx] || 0
            return (
              <div
                key={`custom-${i}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                style={{ background: 'var(--surface-raised)' }}
              >
                <input
                  type="number"
                  min="1"
                  disabled={readOnly}
                  className="w-12 rounded-lg px-2 py-2.5 text-lg font-bold text-right tabular-nums outline-none"
                  style={{
                    background: readOnly ? 'var(--surface-raised)' : 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                    opacity: readOnly ? 0.7 : 1,
                  }}
                  aria-label={`${exerciseName} özel tekrar sayısı`}
                  value={cs.reps || ''}
                  onChange={(e) => handleCustomChange(i, 'reps', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  disabled={readOnly}
                  className="flex-1 rounded-lg px-3 py-2.5 text-base tabular-nums outline-none"
                  style={{
                    background: readOnly ? 'var(--surface-raised)' : 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: readOnly ? 'var(--text-muted)' : 'var(--text-heading)',
                    opacity: readOnly ? 0.7 : 1,
                    width: '50%',
                  }}
                  aria-label={`${exerciseName} özel tekrar ağırlığı`}
                  value={cs.weight}
                  onChange={(e) => handleCustomChange(i, 'weight', e.target.value)}
                />
                <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>kg</span>
                {prevWeight > 0 && (
                  <div
                    className="shrink-0 rounded-md flex flex-col items-center justify-center"
                    style={{
                      width: '52px',
                      height: '44px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <span
                      className="text-sm font-semibold tabular-nums leading-tight"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {prevWeight}
                    </span>
                    <span
                      className="leading-tight"
                      style={{ fontSize: '10px', color: 'var(--text-muted)' }}
                    >
                      {formatShortDate(previousDate)}
                    </span>
                  </div>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeCustomSet(i)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                    }}
                    aria-label={`Özel seti sil`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })}

          {!readOnly && (
            <button
              type="button"
              onClick={addCustomSet}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: 'transparent',
                border: '1px dashed var(--border)',
                color: 'var(--text-muted)',
              }}
              aria-label="Özel tekrar ekle"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Özel set ekle
            </button>
          )}
        </div>
      )}

      {collapsed && total > 0 && (
        <div
          className="px-5 pb-3 text-sm"
          style={{ color: readOnly ? 'var(--text-muted)' : 'var(--text-muted)' }}
        >
          {fullSummary} kg
          {readOnly && <span className="ml-2 text-xs opacity-60">(salt okunur)</span>}
        </div>
      )}

      <div
        className="px-5 py-3 flex items-center justify-between font-semibold text-base"
        style={{
          background: 'var(--surface-raised)',
          borderTop: '1px solid var(--border)',
          color: total > 0 ? 'var(--accent)' : 'var(--text-muted)',
          opacity: readOnly ? 0.7 : 1,
        }}
      >
        <span className="text-sm font-medium" style={{ color: savedLabel === 'Seans kaydedildi!' ? '#065f46' : '#075985' }}>
          {savedLabel || ''}
        </span>
        <span>Toplam: {total.toLocaleString()} kg</span>
      </div>
      <ImageViewer src={viewerImage} alt={exerciseName} onClose={() => setViewerImage(null)} />
    </div>
  )
}

export default ExerciseCard
