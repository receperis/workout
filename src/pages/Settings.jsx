import { useState } from 'react'
import { useWorkout } from '../context/WorkoutContext'
import { DAYS_OF_WEEK } from '../types'

function SectionCard({ title, children }) {
  return (
    <section
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div
        className="px-5 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h2 style={{ color: 'var(--text-heading)', fontSize: '17px', fontWeight: 600 }}>
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">
        {children}
      </div>
    </section>
  )
}

function Settings() {
  const { state, dispatch, signedIn, signIn, signOut, syncNow, syncStatus } = useWorkout()
  const [newExercise, setNewExercise] = useState('')
  const [editingId, setEditingId] = useState(-1)
  const [editValue, setEditValue] = useState('')
  const [expandedDay, setExpandedDay] = useState(null)

  function handleAdd(e) {
    e.preventDefault()
    const name = newExercise.trim()
    if (!name || state.exercises.some((ex) => ex.name === name)) return
    dispatch({ type: 'ADD_EXERCISE', payload: name })
    setNewExercise('')
  }

  function handleRemove(id) {
    dispatch({ type: 'REMOVE_EXERCISE', payload: id })
  }

  function startRename(id, currentName) {
    setEditingId(id)
    setEditValue(currentName)
  }

  function handleRename(id) {
    const newName = editValue.trim()
    const oldName = state.exercises.find((e) => e.id === id)?.name
    if (!newName || newName === oldName || state.exercises.some((e) => e.name === newName)) {
      setEditingId(-1)
      return
    }
    dispatch({ type: 'RENAME_EXERCISE', payload: { id, newName } })
    setEditingId(-1)
  }

  return (
    <div className="space-y-4">
      <h1 style={{ color: 'var(--text-heading)' }}>Ayarlar</h1>

      <SectionCard title="Antrenmanlar">
        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            placeholder="Yeni antrenman adı"
            className="flex-1 rounded-lg px-3 py-2.5 text-sm"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              color: 'var(--text-heading)',
            }}
          />
          <button
            type="submit"
            className="rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Ekle
          </button>
        </form>

        {state.exercises.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Henüz antrenman yok.</p>
        ) : (
          <div className="space-y-2">
            {state.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5"
                style={{ background: 'var(--surface-raised)' }}
              >
                {editingId === exercise.id ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(exercise.id)
                        if (e.key === 'Escape') setEditingId(-1)
                      }}
                      className="flex-1 rounded-lg px-3 py-2 text-sm"
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-heading)',
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(exercise.id)}
                      className="text-sm font-medium px-3 py-1.5 rounded-lg"
                      style={{ color: '#059669' }}
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => setEditingId(-1)}
                      className="text-sm font-medium px-3 py-1.5 rounded-lg"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      İptal
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-heading)' }}>{exercise.name}</span>
                    <button
                      onClick={() => startRename(exercise.id, exercise.name)}
                      className="text-sm font-medium px-3 py-1.5 rounded-lg"
                      style={{ color: 'var(--accent)' }}
                    >
                      Yeniden Adlandır
                    </button>
                    <button
                      onClick={() => handleRemove(exercise.id)}
                      className="text-sm font-medium px-3 py-1.5 rounded-lg"
                      style={{ color: '#ef4444' }}
                    >
                      Kaldır
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Program">
        {state.exercises.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Önce antrenman ekleyin, sonra program oluşturun.
          </p>
        ) : (
          <div className="space-y-2">
            {DAYS_OF_WEEK.map((day) => {
              const dayExercises = state.schedule[day] || []
              const expanded = expandedDay === day
              return (
                <div
                  key={day}
                  className="rounded-lg overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <button
                    onClick={() => setExpandedDay(expanded ? null : day)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                    style={{ background: 'var(--surface-raised)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                        {day}
                      </span>
                      {dayExercises.length > 0 && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'var(--accent)', color: '#fff' }}
                        >
                          {dayExercises.length}
                        </span>
                      )}
                    </div>
                    <svg
                      className="w-4 h-4 transition-transform"
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
                    <div className="p-3 flex flex-wrap gap-2" style={{ background: 'var(--surface)' }}>
                      {state.exercises.map((exercise) => {
                        const checked = dayExercises.includes(exercise.id)
                        return (
                          <label
                            key={exercise.id}
                            className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 cursor-pointer select-none transition-colors"
                            style={{
                              background: checked ? 'var(--accent)' + '15' : 'var(--surface-raised)',
                              border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                              color: checked ? 'var(--accent)' : 'var(--text)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const current = state.schedule[day] || []
                                const next = checked
                                  ? current.filter((id) => id !== exercise.id)
                                  : [...current, exercise.id]
                                dispatch({ type: 'SET_SCHEDULE', payload: { ...state.schedule, [day]: next } })
                              }}
                              className="sr-only"
                            />
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center"
                              style={{
                                background: checked ? 'var(--accent)' : 'transparent',
                                border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                              }}
                            >
                              {checked && (
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                                  <path d="M5 12l5 5L20 7" />
                                </svg>
                              )}
                            </div>
                            {exercise.name}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Google Drive">
        {signedIn ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Bağlı</span>
              <span
                className="text-sm font-medium"
                style={{
                  color: syncStatus === 'syncing' ? '#059669' : syncStatus === 'error' ? '#ef4444' : 'var(--text-muted)',
                }}
                data-testid="syncStatus"
              >
                {syncStatus === 'syncing' ? 'Senkronize ediliyor...' : syncStatus === 'error' ? 'Senkronizasyon hatası' : 'Güncel'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => syncNow()}
                disabled={syncStatus === 'syncing'}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: 'var(--surface-raised)',
                  color: 'var(--text-heading)',
                  border: '1px solid var(--border)',
                  opacity: syncStatus === 'syncing' ? 0.6 : 1,
                }}
                data-testid="syncButton"
              >
                {syncStatus === 'syncing' ? 'Senkronize ediliyor...' : 'Şimdi Senkronize Et'}
              </button>
              <button
                onClick={() => signOut()}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold"
                style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}
              >
                Bağlantıyı Kes
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => signIn()}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold"
            style={{ background: '#059669', color: '#fff' }}
          >
            Google Drive'a Bağlan
          </button>
        )}
      </SectionCard>
    </div>
  )
}

export default Settings
