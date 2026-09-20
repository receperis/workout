import { useParams } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { DAYS_OF_WEEK, PYRAMID_REPS, exerciseNameById } from '../types'
import { useWorkout } from '../context/WorkoutContext'
import { saveDraft, loadDraft, clearDraft } from '../storage'
import { useDebounce } from '../hooks/useDebounce'
import ExerciseCard from '../components/ExerciseCard'

function today() {
  return new Date().toISOString().split('T')[0]
}

function getMonday(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const dayName = d.toLocaleString('tr-TR', { weekday: 'short' })
  const dayNum = d.getDate()
  return `${dayName} ${dayNum}`
}

function formatMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleString('tr-TR', { month: 'short', year: 'numeric' })
}

function dateToDayName(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleString('tr-TR', { weekday: 'long' })
}

function LogWorkout() {
  const { day } = useParams()
  const { state, dispatch, syncNow } = useWorkout()

  const [selectedDate, setSelectedDate] = useState(() => {
    if (!day) return today()
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day
    const dayIndex = DAYS_OF_WEEK.indexOf(day)
    if (dayIndex >= 0) {
      const monday = getMonday(today())
      return addDays(monday, dayIndex)
    }
    return today()
  })

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(selectedDate))
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  const weekScrollRef = useRef(null)
  const todayButtonRef = useRef(null)

  const selectedDay = dateToDayName(selectedDate)
  const isPast = selectedDate < today()
  const exercisesForDay = state.schedule[selectedDay] || []

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart],
  )

  const existingSession = useMemo(
    () => state.sessions.find((s) => s.date === selectedDate && s.day === selectedDay),
    [state.sessions, selectedDate, selectedDay],
  )

  const previousWeightsByExercise = useMemo(() => {
    const result = {}
    for (const exerciseId of exercisesForDay) {
      const pastSessions = state.sessions
        .filter((s) => s.date < selectedDate && s.sets.some((set) => set.exerciseId === exerciseId))
      if (pastSessions.length > 0) {
        const lastSession = pastSessions[pastSessions.length - 1]
        const lastSets = lastSession.sets.filter((s) => s.exerciseId === exerciseId)
        result[exerciseId] = {
          weights: PYRAMID_REPS.map((reps) => {
            const found = lastSets.find((s) => s.reps === reps)
            return found?.weight || 0
          }),
          date: lastSession.date,
        }
      }
    }
    return result
  }, [state.sessions, selectedDate, exercisesForDay])

  const [exerciseSets, setExerciseSets] = useState(() => {
    if (existingSession) {
      const sets = {}
      for (const set of existingSession.sets) {
        if (!sets[set.exerciseId]) sets[set.exerciseId] = []
        sets[set.exerciseId].push(set)
      }
      return sets
    }
    const draft = loadDraft()
    if (draft && draft.date === selectedDate) return draft.exerciseSets
    return {}
  })

  const prevSelectedDateRef = useRef(selectedDate)
  if (prevSelectedDateRef.current !== selectedDate) {
    prevSelectedDateRef.current = selectedDate
    if (existingSession) {
      const sets = {}
      for (const set of existingSession.sets) {
        if (!sets[set.exerciseId]) sets[set.exerciseId] = []
        sets[set.exerciseId].push(set)
      }
      setExerciseSets(sets)
    } else {
      const draft = loadDraft()
      if (draft && draft.date === selectedDate) {
        setExerciseSets(draft.exerciseSets)
      } else {
        setExerciseSets({})
      }
    }
    setSaved(false)
    setEditing(false)
  }

  const handleExerciseChange = (exerciseId, sets) => {
    setExerciseSets((prev) => ({ ...prev, [exerciseId]: sets }))
    setSaved(false)
  }

  const debouncedExerciseSets = useDebounce(exerciseSets, 100)

  useEffect(() => {
    if (!isPast && !existingSession) {
      const hasData = Object.values(debouncedExerciseSets).some((sets) =>
        sets.some((s) => s.weight > 0),
      )
      if (hasData) saveDraft(selectedDate, debouncedExerciseSets)
    }
  }, [debouncedExerciseSets, selectedDate, isPast, existingSession])

  const draftRef = useRef({ exerciseSets, selectedDate, isPast, existingSession })
  draftRef.current = { exerciseSets, selectedDate, isPast, existingSession }

  useEffect(() => {
    return () => {
      const { exerciseSets: sets, selectedDate: date, isPast: past, existingSession: session } = draftRef.current
      if (!past && !session) {
        const hasData = Object.values(sets).some((s) =>
          s.some((item) => item.weight > 0),
        )
        if (hasData) saveDraft(date, sets)
      }
    }
  }, [])

  const grandTotal = exercisesForDay.reduce((sum, exerciseId) => {
    const sets = exerciseSets[exerciseId] || []
    return sum + sets.reduce((s, set) => s + set.reps * set.weight, 0)
  }, 0)

  const hasAnyWeights = Object.values(exerciseSets).some((sets) =>
    sets.some((s) => s.weight > 0),
  )

  useEffect(() => {
    if (todayButtonRef.current) {
      todayButtonRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [])

  const handleComplete = async () => {
    const allSets = exercisesForDay.flatMap((exerciseId) => {
      const sets = exerciseSets[exerciseId] || []
      return sets.filter((s) => s.weight > 0)
    })

    if (allSets.length === 0) return

    dispatch({
      type: 'LOG_SESSION',
      payload: {
        id: crypto.randomUUID(),
        date: selectedDate,
        day: selectedDay,
        sets: allSets,
      },
    })

    clearDraft()
    setSaved(true)
    await syncNow()
  }

  const handleUpdate = async () => {
    const allSets = exercisesForDay.flatMap((exerciseId) => {
      const sets = exerciseSets[exerciseId] || []
      return sets.filter((s) => s.weight > 0)
    })

    if (allSets.length === 0) return

    dispatch({
      type: 'UPDATE_SESSION',
      payload: {
        ...existingSession,
        sets: allSets,
      },
    })

    setEditing(false)
    await syncNow()
  }

  const navigateWeek = (direction) => {
    setCurrentWeekStart((prev) => addDays(prev, direction * 7))
  }

  return (
    <div className="space-y-5">
      <h1 style={{ color: 'var(--text-heading)' }}>Antrenman Kaydet</h1>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => navigateWeek(-1)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          aria-label="Önceki hafta"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {weekDates.map((dateStr) => {
          const active = dateStr === selectedDate
          const isTodayDate = dateStr === today()
          return (
            <button
              key={dateStr}
              ref={isTodayDate ? todayButtonRef : null}
              onClick={() => { setSelectedDate(dateStr); setSaved(false); setEditing(false) }}
              className="shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-colors relative"
              style={{
                background: active ? 'var(--accent)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--text)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {formatDateLabel(dateStr)}
              {isTodayDate && !active && (
                <span
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </button>
          )
        })}

        <button
          onClick={() => navigateWeek(1)}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors"
          style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          aria-label="Sonraki hafta"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
        {formatMonthLabel(currentWeekStart)}
      </div>

      {exercisesForDay.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ color: 'var(--text-muted)' }}>
            {selectedDay} için antrenman atanmamış. Programınızı ayarlamak için Ayarlar'a gidin.
          </p>
        </div>
      ) : (
        <>
          {isPast && (
            <div className="flex items-center gap-2">
              <div
                className="rounded-xl px-5 py-3 text-center text-sm flex-1"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                {existingSession ? 'Seans kaydedildi — salt okunur' : 'Bu tarih için kayıt yok'}
              </div>
              <button
                onClick={() => setEditing((e) => !e)}
                className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-colors"
                style={{
                  color: editing ? '#fff' : 'var(--accent)',
                  background: editing ? 'var(--accent)' : 'var(--surface)',
                  border: `1px solid var(--accent)`,
                }}
                aria-label={editing ? 'Düzenlemeyi iptal et' : 'Seansı düzenle'}
              >
                {editing ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {grandTotal > 0 && (
            <div
              className="flex items-center justify-between rounded-xl px-5 py-3"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <span className="text-sm font-medium opacity-90">Seans Toplamı</span>
              <span className="text-xl font-bold tabular-nums">{grandTotal.toLocaleString()} kg</span>
            </div>
          )}

          <div className="space-y-4">
            {exercisesForDay.map((exerciseId, i) => (
              <ExerciseCard
                key={`${selectedDate}-${exerciseId}-${existingSession ? 'loaded' : 'empty'}`}
                exerciseId={exerciseId}
                exerciseName={exerciseNameById(state.exercises, exerciseId)}
                initialSets={exerciseSets[exerciseId]}
                previousWeights={previousWeightsByExercise[exerciseId]?.weights}
                previousDate={previousWeightsByExercise[exerciseId]?.date}
                onChange={(sets) => handleExerciseChange(exerciseId, sets)}
                readOnly={isPast && !editing}
                savedLabel={
                  i === exercisesForDay.length - 1 && saved
                    ? 'Seans kaydedildi!'
                    : undefined
                }
              />
            ))}
          </div>

          {hasAnyWeights && (!isPast || editing) && (
            <button
              onClick={editing && existingSession ? handleUpdate : handleComplete}
              className="w-full rounded-xl py-4 text-base font-semibold transition-colors"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(232, 93, 42, 0.3)',
              }}
            >
              {editing && existingSession ? 'Seansı Güncelle' : 'Seansı Tamamla'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default LogWorkout
