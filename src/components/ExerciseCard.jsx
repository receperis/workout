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

function PreviousWeight({ weight, date, targetIncrement }) {
  const targetWeight = weight + targetIncrement

  return (
    <div
      className="shrink-0 rounded-md flex flex-col items-center justify-center"
      style={{
        width: targetIncrement > 0 ? '82px' : '56px',
        minHeight: '44px',
        padding: '3px 4px',
        border: '1px solid var(--border)',
      }}
      aria-label={`Önceki seans ${weight} kg${targetIncrement > 0 ? `, hedef ${targetWeight} kg` : ''}`}
    >
      <span
        className="text-sm font-semibold tabular-nums leading-tight"
        style={{ color: 'var(--text-heading)' }}
      >
        {weight} kg
      </span>
      <span className="leading-tight" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
        {formatShortDate(date)}
      </span>
      {targetIncrement > 0 && (
        <span
          className="leading-tight font-medium tabular-nums"
          style={{ fontSize: '10px', color: 'var(--accent)' }}
        >
          Hedef {targetWeight} kg
        </span>
      )}
    </div>
  )
}

function ExerciseCard({ exerciseId, exerciseName, exerciseImage, onChange, initialSets, previousWeights, previousCustomSets = [], previousDate, targetIncrement = 0, onTargetIncrementChange, savedLabel, readOnly }) {
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

  const handleTargetIncrementChange = (event) => {
    const value = event.target.value
    const increment = value === '' ? 0 : Number(value)
    if (Number.isFinite(increment)) {
      onTargetIncrementChange?.(Math.max(0, increment))
    }
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
          <div
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2"
            style={{ background: 'var(--surface-raised)' }}
          >
            <div>
              <label
                htmlFor={`target-increment-${exerciseId}`}
                className="text-sm font-medium"
                style={{ color: 'var(--text-heading)' }}
              >
                Hedef artış
              </label>
              <p className="text-xs" style={{ color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Önceki seans ağırlığına eklenir
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                id={`target-increment-${exerciseId}`}
                type="number"
                min="0"
                step="0.5"
                disabled={readOnly}
                className="w-20 rounded-lg px-2.5 py-2 text-sm tabular-nums outline-none"
                style={{
                  background: readOnly ? 'var(--surface-raised)' : 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: readOnly ? 'var(--text-muted)' : 'var(--text-heading)',
                  opacity: readOnly ? 0.7 : 1,
                }}
                aria-label={`${exerciseName} hedef artışı`}
                value={targetIncrement > 0 ? targetIncrement : ''}
                onChange={handleTargetIncrementChange}
              />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>kg</span>
            </div>
          </div>

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
                <PreviousWeight
                  weight={previousWeights[i]}
                  date={previousDate}
                  targetIncrement={targetIncrement}
                />
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
                  <PreviousWeight
                    weight={prevWeight}
                    date={previousDate}
                    targetIncrement={targetIncrement}
                  />
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

          {previousCustomSets.length > 0 && (
            <div className="space-y-2">
              {previousCustomSets.map((set, i) => (
                <div
                  key={`${set.reps}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                  style={{ background: 'var(--surface-raised)' }}
                  aria-label={`Önceki özel set ${set.reps} tekrar`}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    Önceki özel set · {set.reps} tekrar
                  </span>
                  <PreviousWeight
                    weight={set.weight}
                    date={previousDate}
                    targetIncrement={targetIncrement}
                  />
                </div>
              ))}
            </div>
          )}

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
