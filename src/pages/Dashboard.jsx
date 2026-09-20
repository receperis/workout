import { Link } from 'react-router-dom'
import { useWorkout } from '../context/WorkoutContext'
import { exerciseNameById } from '../types'
import WeightProgression from '../components/WeightProgression'

function Dashboard() {
  const { state: { exercises, schedule, sessions } } = useWorkout()

  const today = new Date().toLocaleString('tr-TR', { weekday: 'long' })
  const todaySlug = today.toLowerCase()
  const exercisesForToday = schedule[today] || []

  const hasExerciseData = (exerciseId) =>
    sessions.some((s) => s.sets.some((set) => set.exerciseId === exerciseId))

  return (
    <div className="space-y-5">
      <div>
        <h1 style={{ color: 'var(--text-heading)' }}>{today}</h1>
        <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          {exercisesForToday.length === 0
            ? 'Bugün için antrenman planlanmamış'
            : `Bugün ${exercisesForToday.length} antrenman${exercisesForToday.length > 1 ? '' : ''}`}
        </p>
      </div>

      {exercisesForToday.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ color: 'var(--text-muted)' }}>
            Bugün için antrenman planlanmamış. Programınızı ayarlamak için Ayarlar'a gidin.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {exercisesForToday.map((exerciseId) => (
            <div
              key={exerciseId}
              className="rounded-xl p-4"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <h3
                className="mb-3"
                style={{ color: 'var(--text-heading)', fontSize: '16px', fontWeight: 600 }}
              >
                {exerciseNameById(exercises, exerciseId)}
              </h3>
              {hasExerciseData(exerciseId) ? (
                <WeightProgression exerciseId={exerciseId} compact />
              ) : (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {exerciseNameById(exercises, exerciseId)} için henüz kayıt yok.
                </p>
              )}
            </div>
          ))}

          <Link
            to={`/log/${todaySlug}`}
            className="flex items-center justify-center w-full rounded-xl py-3.5 text-base font-semibold transition-colors"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(232, 93, 42, 0.3)',
            }}
          >
            Bugünü Kaydet
          </Link>
        </div>
      )}
    </div>
  )
}

export default Dashboard
