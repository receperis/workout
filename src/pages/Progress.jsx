import { useState } from 'react'
import { useWorkout } from '../context/WorkoutContext'
import { DAYS_OF_WEEK, PYRAMID_REPS, exerciseNameById } from '../types'
import WeightProgression from '../components/WeightProgression'
import Sparkline from '../components/Sparkline'

const REP_HEX = {
  15: '#3b82f6',
  13: '#10b981',
  11: '#f59e0b',
  9: '#ef4444',
  7: '#8b5cf6',
}

function ExerciseSummary({ exerciseId, sessions }) {
  const filteredSessions = sessions.filter((s) =>
    s.sets.some((set) => set.exerciseId === exerciseId),
  )

  if (filteredSessions.length === 0) return null

  const lastSession = filteredSessions[filteredSessions.length - 1]
  const lastSets = lastSession.sets.filter((s) => s.exerciseId === exerciseId)

  const tiersWithData = PYRAMID_REPS.filter((reps) =>
    filteredSessions.some((s) =>
      s.sets.some((set) => set.exerciseId === exerciseId && set.reps === reps && set.weight > 0),
    ),
  )

  const sparkData = (reps) =>
    filteredSessions
      .map((s) => {
        const set = s.sets.find((st) => st.exerciseId === exerciseId && st.reps === reps)
        return set?.weight || 0
      })
      .filter((v) => v > 0)

  return (
    <div className="space-y-2 mt-3">
      {tiersWithData.map((reps) => (
        <div key={reps} className="flex items-center gap-3">
          <span
            className="text-xs font-semibold w-8 text-right shrink-0"
            style={{ color: REP_HEX[reps] }}
          >
            {reps}
          </span>
          <div className="flex-1 min-w-0">
            <Sparkline data={sparkData(reps)} color={REP_HEX[reps]} height={20} />
          </div>
          <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
            {lastSets.find((s) => s.reps === reps)?.weight || 0}kg
          </span>
        </div>
      ))}
    </div>
  )
}

function Progress() {
  const { state: { exercises, schedule, sessions } } = useWorkout()

  const daysWithExercises = DAYS_OF_WEEK.filter(
    (day) => schedule[day] && schedule[day].length > 0,
  )

  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date().toLocaleString('tr-TR', { weekday: 'long' })
    return daysWithExercises.includes(today) ? today : daysWithExercises[0] || ''
  })

  const [expandedExercise, setExpandedExercise] = useState(null)

  const currentDay = daysWithExercises.includes(selectedDay) ? selectedDay : daysWithExercises[0] || ''
  const exercisesForDay = currentDay ? (schedule[currentDay] || []) : []

  const hasSessionData = (exerciseId) =>
    sessions.some((s) => s.sets.some((set) => set.exerciseId === exerciseId))

  if (daysWithExercises.length === 0) {
    return (
      <div>
        <h1 style={{ color: 'var(--text-heading)' }}>İlerleme</h1>
        <div
          className="mt-4 rounded-xl p-6 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ color: 'var(--text-muted)' }}>
            Henüz antrenman planlanmamış. Antrenman günlerinizi ayarlamak için Ayarlar'a gidin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h1 style={{ color: 'var(--text-heading)' }}>İlerleme</h1>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
        {daysWithExercises.map((day) => {
          const active = day === currentDay
          return (
            <button
              key={day}
              onClick={() => { setSelectedDay(day); setExpandedExercise(null) }}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--accent)' : 'var(--surface)',
                color: active ? '#fff' : 'var(--text)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {day.slice(0, 3)}
            </button>
          )
        })}
      </div>

      {exercisesForDay.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No exercises assigned to {currentDay}.</p>
      ) : (
        <div className="space-y-3">
          {exercisesForDay.map((exerciseId) => {
            const expanded = expandedExercise === exerciseId
            const hasData = hasSessionData(exerciseId)
            const name = exerciseNameById(exercises, exerciseId)

            return (
              <div
                key={exerciseId}
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <button
                  onClick={() => setExpandedExercise(expanded ? null : exerciseId)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                  style={{ background: 'var(--surface)' }}
                >
                  <div className="min-w-0 flex-1">
                    <h3 style={{ color: 'var(--text-heading)', fontSize: '16px', fontWeight: 600 }}>
                      {name}
                    </h3>
                    {hasData && !expanded && (
                      <ExerciseSummary exerciseId={exerciseId} sessions={sessions} />
                    )}
                  </div>
                  <svg
                    className="w-5 h-5 shrink-0 ml-2 transition-transform"
                    style={{
                      color: 'var(--text-muted)',
                      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </button>

                {expanded && (
                  <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border)' }}>
                    {hasData ? (
                      <div className="pt-4">
                        <WeightProgression exerciseId={exerciseId} />
                      </div>
                    ) : (
                      <p className="pt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                        {name} için henüz veri yok.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Progress
