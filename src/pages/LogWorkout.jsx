import { useParams } from 'react-router-dom'
import { useState, useEffect, useRef, useMemo } from 'react'
import { DAYS_OF_WEEK, PYRAMID_REPS } from '../types'
import { useWorkout } from '../context/WorkoutContext'
import ExerciseCard from '../components/ExerciseCard'

const IDLE_SYNC_MS = 10 * 60 * 1000

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
  const exerciseIdsForDisplay = useMemo(
    () => [...new Set([
      ...exercisesForDay,
      ...(existingSession?.sets.map((set) => set.exerciseId) || []),
    ])],
    [exercisesForDay, existingSession],
  )
  const sessionOnlyExerciseIds = exerciseIdsForDisplay.filter(
    (exerciseId) => !exercisesForDay.includes(exerciseId),
  )

  const previousWeightsByExercise = useMemo(() => {
    const result = {}
    for (const exerciseId of exercisesForDay) {
      const pastSessions = state.sessions
        .filter((s) => s.date < selectedDate && s.sets.some((set) => set.exerciseId === exerciseId))
      if (pastSessions.length > 0) {
        const lastSession = pastSessions.reduce((latest, session) =>
          session.date > latest.date ? session : latest,
        )
        const lastSets = lastSession.sets.filter((s) => s.exerciseId === exerciseId)
        const daysSinceLastSession =
          (Date.parse(selectedDate) - Date.parse(lastSession.date)) / 86400000
        result[exerciseId] = {
          weights: PYRAMID_REPS.map((reps) => {
            const found = lastSets.find((s) => s.reps === reps)
            return found?.weight || 0
          }),
          customSets: daysSinceLastSession <= 7
            ? lastSets.filter((set) => !PYRAMID_REPS.includes(set.reps) && set.weight > 0)
            : [],
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
      setExerciseSets({})
    }
    setSaved(false)
    setEditing(false)
  }

  const syncTimerRef = useRef(null)
  const locallyCreatedIdRef = useRef(null)
  const dirtyRef = useRef(false)
  const lastExerciseIdRef = useRef(null)
  const syncNowRef = useRef(syncNow)
  syncNowRef.current = syncNow

  const flushSync = () => {
    clearTimeout(syncTimerRef.current)
    if (!dirtyRef.current) return
    dirtyRef.current = false
    syncNowRef.current()
  }

  useEffect(() => {
    const handleHidden = () => {
      if (document.visibilityState === 'hidden') flushSync()
    }
    document.addEventListener('visibilitychange', handleHidden)
    window.addEventListener('pagehide', flushSync)
    return () => {
      document.removeEventListener('visibilitychange', handleHidden)
      window.removeEventListener('pagehide', flushSync)
      flushSync()
    }
  }, [])

  const buildSessionSets = (allSets) =>
    exerciseIdsForDisplay.flatMap((exerciseId) => {
      const exercise = state.exercises.find((item) => item.id === exerciseId)
      return (allSets[exerciseId] || [])
        .filter((s) => s.weight > 0)
        .map((set) => {
          const existingSet = existingSession?.sets.find(
            (oldSet) => oldSet.exerciseId === set.exerciseId && oldSet.reps === set.reps,
          )
          if (existingSet?.weight === set.weight) return existingSet
          return {
            ...set,
            exerciseName: exercise?.name || existingSet?.exerciseName || String(exerciseId),
          }
        })
    })

  const exerciseSetsRef = useRef(exerciseSets)
  exerciseSetsRef.current = exerciseSets

  const handleExerciseChange = (exerciseId, sets) => {
    const previous = exerciseSetsRef.current[exerciseId]
    const unchanged = previous
      ? JSON.stringify(previous) === JSON.stringify(sets)
      : sets.every((set) => !(set.weight > 0))
    if (unchanged) return

    if (lastExerciseIdRef.current !== null && lastExerciseIdRef.current !== exerciseId) {
      flushSync()
    }
    lastExerciseIdRef.current = exerciseId

    const next = { ...exerciseSetsRef.current, [exerciseId]: sets }
    exerciseSetsRef.current = next
    setExerciseSets(next)

    const sessionSets = buildSessionSets(next)
    const current = existingSession?.sets || []
    if (JSON.stringify(sessionSets) === JSON.stringify(current)) return

    const sessionId = existingSession?.id ?? crypto.randomUUID()
    if (!existingSession) locallyCreatedIdRef.current = sessionId

    dispatch({
      type: 'SAVE_SESSION',
      payload: {
        id: sessionId,
        date: selectedDate,
        day: selectedDay,
        sets: sessionSets,
      },
    })
    setSaved(true)
    dirtyRef.current = true
    clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(flushSync, IDLE_SYNC_MS)
  }

  const grandTotal = exerciseIdsForDisplay.reduce((sum, exerciseId) => {
    const sets = exerciseSets[exerciseId] || []
    return sum + sets.reduce((s, set) => s + set.reps * set.weight, 0)
  }, 0)

  useEffect(() => {
    if (todayButtonRef.current) {
      todayButtonRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [])

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

      {exerciseIdsForDisplay.length === 0 ? (
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
                aria-label={editing ? 'Düzenlemeyi kapat' : 'Seansı düzenle'}
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
            {exerciseIdsForDisplay.map((exerciseId, i) => {
              const exercise = state.exercises.find((e) => e.id === exerciseId)
              const sessionOnlyIndex = sessionOnlyExerciseIds.indexOf(exerciseId)
              return (
                <div key={`${selectedDate}-${exerciseId}-${existingSession && existingSession.id !== locallyCreatedIdRef.current ? 'loaded' : 'empty'}`}>
                  {sessionOnlyIndex === 0 && (
                    <div className="pt-2 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Ek egzersizler
                    </div>
                  )}
                  <ExerciseCard
                    exerciseId={exerciseId}
                    exerciseName={exercise?.name || existingSession?.sets.find((set) => set.exerciseId === exerciseId)?.exerciseName || String(exerciseId)}
                    exerciseImage={exercise?.image}
                    initialSets={exerciseSets[exerciseId]}
                    previousWeights={previousWeightsByExercise[exerciseId]?.weights}
                    previousCustomSets={previousWeightsByExercise[exerciseId]?.customSets}
                    previousDate={previousWeightsByExercise[exerciseId]?.date}
                    targetIncrement={exercise?.targetIncrement || 0}
                    onTargetIncrementChange={(targetIncrement) =>
                      dispatch({
                        type: 'SET_EXERCISE_TARGET_INCREMENT',
                        payload: { id: exerciseId, targetIncrement },
                      })
                    }
                    onChange={(sets) => handleExerciseChange(exerciseId, sets)}
                    readOnly={isPast && !editing}
                    savedLabel={
                      i === exerciseIdsForDisplay.length - 1 && saved
                        ? 'Seans kaydedildi!'
                        : undefined
                    }
                  />
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default LogWorkout
