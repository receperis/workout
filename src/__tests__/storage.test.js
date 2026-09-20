// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { loadData, saveData, clearSessionData, getFileId, saveFileId, clearFileId, saveDraft, loadDraft, clearDraft } from '../storage'
import { EMPTY_WORKOUT_DATA } from '../types'

beforeEach(() => {
  localStorage.clear()
})

describe('loadData', () => {
  it('returns empty data when nothing is stored', () => {
    expect(loadData()).toEqual(EMPTY_WORKOUT_DATA)
  })

  it('returns stored valid workout data', () => {
    const data = {
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { Monday: [1] },
      sessions: [
        {
          id: 'abc-123',
          date: '2026-09-14',
          day: 'Monday',
          sets: [{ exerciseId: 1, reps: 15, weight: 60 }],
        },
      ],
    }
    localStorage.setItem('workout-data', JSON.stringify(data))
    expect(loadData()).toEqual(data)
  })

  it('returns empty data when stored JSON is invalid', () => {
    localStorage.setItem('workout-data', 'not-json')
    expect(loadData()).toEqual(EMPTY_WORKOUT_DATA)
  })

  it('returns empty data when stored data fails validation', () => {
    localStorage.setItem(
      'workout-data',
      JSON.stringify({ exercises: 'not-array', schedule: {}, sessions: [] }),
    )
    expect(loadData()).toEqual(EMPTY_WORKOUT_DATA)
  })

  it('returns empty data when stored data has invalid session', () => {
    localStorage.setItem(
      'workout-data',
      JSON.stringify({
        exercises: [],
        schedule: {},
        sessions: [{ id: 123, date: 'x', day: 'x', sets: 'y' }],
      }),
    )
    expect(loadData()).toEqual(EMPTY_WORKOUT_DATA)
  })
})

describe('saveData', () => {
  it('saves data to localStorage', () => {
    const data = {
      exercises: [{ id: 1, name: 'Squats' }],
      schedule: {},
      sessions: [],
    }
    saveData(data)
    expect(JSON.parse(localStorage.getItem('workout-data'))).toEqual(data)
  })

  it('overwrites existing data', () => {
    const data1 = {
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: {},
      sessions: [],
    }
    const data2 = {
      exercises: [{ id: 1, name: 'Squats' }],
      schedule: { Friday: [1] },
      sessions: [],
    }
    saveData(data1)
    saveData(data2)
    expect(JSON.parse(localStorage.getItem('workout-data'))).toEqual(data2)
  })

  it('saves empty workout data', () => {
    saveData(EMPTY_WORKOUT_DATA)
    expect(JSON.parse(localStorage.getItem('workout-data'))).toEqual(
      EMPTY_WORKOUT_DATA,
    )
  })
})

describe('roundtrip', () => {
  it('save then load returns same data', () => {
    const data = {
      exercises: [{ id: 1, name: 'Bench Press' }, { id: 2, name: 'Squats' }],
      schedule: { Monday: [1], Wednesday: [2] },
      sessions: [
        {
          id: 'test-id',
          date: '2026-09-14',
          day: 'Monday',
          sets: [
            { exerciseId: 1, reps: 15, weight: 60 },
            { exerciseId: 1, reps: 13, weight: 65 },
          ],
        },
      ],
    }
    saveData(data)
    expect(loadData()).toEqual(data)
  })
})

describe('clearSessionData', () => {
  it('removes workout data from localStorage', () => {
    const data = {
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: { Monday: [1] },
      sessions: [],
    }
    saveData(data)
    expect(loadData()).toEqual(data)
    clearSessionData()
    expect(loadData()).toEqual(EMPTY_WORKOUT_DATA)
  })

  it('preserves Drive file ID', () => {
    saveFileId('test-file-id-123')
    saveData({ exercises: [], schedule: {}, sessions: [] })
    clearSessionData()
    expect(getFileId()).toBe('test-file-id-123')
  })
})

describe('getFileId / saveFileId / clearFileId', () => {
  it('returns null when no file ID stored', () => {
    expect(getFileId()).toBeNull()
  })

  it('saves and retrieves file ID', () => {
    saveFileId('abc-def-123')
    expect(getFileId()).toBe('abc-def-123')
  })

  it('clears file ID', () => {
    saveFileId('abc-def-123')
    clearFileId()
    expect(getFileId()).toBeNull()
  })
})

describe('saveDraft / loadDraft / clearDraft', () => {
  it('saves draft to localStorage', () => {
    const exerciseSets = {
      1: [
        { exerciseId: 1, reps: 15, weight: 60 },
        { exerciseId: 1, reps: 13, weight: 65 },
      ],
    }
    saveDraft('2026-09-19', exerciseSets)
    const stored = JSON.parse(localStorage.getItem('workout-draft'))
    expect(stored).toEqual({ date: '2026-09-19', exerciseSets })
  })

  it('loads saved draft', () => {
    const exerciseSets = {
      1: [
        { exerciseId: 1, reps: 15, weight: 60 },
        { exerciseId: 1, reps: 13, weight: 65 },
      ],
    }
    saveDraft('2026-09-19', exerciseSets)
    const draft = loadDraft()
    expect(draft).toEqual({ date: '2026-09-19', exerciseSets })
  })

  it('returns null when no draft stored', () => {
    expect(loadDraft()).toBeNull()
  })

  it('returns null when stored draft JSON is invalid', () => {
    localStorage.setItem('workout-draft', 'not-json')
    expect(loadDraft()).toBeNull()
  })

  it('clears draft', () => {
    saveDraft('2026-09-19', { 1: [{ exerciseId: 1, reps: 15, weight: 60 }] })
    clearDraft()
    expect(loadDraft()).toBeNull()
  })

  it('draft is independent of workout-data key', () => {
    const workoutData = {
      exercises: [{ id: 1, name: 'Bench Press' }],
      schedule: {},
      sessions: [],
    }
    saveData(workoutData)
    saveDraft('2026-09-19', { 1: [{ exerciseId: 1, reps: 15, weight: 60 }] })

    clearDraft()
    expect(loadDraft()).toBeNull()
    expect(loadData()).toEqual(workoutData)
  })

  it('overwrites existing draft', () => {
    saveDraft('2026-09-19', { 1: [{ exerciseId: 1, reps: 15, weight: 60 }] })
    saveDraft('2026-09-19', { 1: [{ exerciseId: 1, reps: 15, weight: 70 }] })
    const draft = loadDraft()
    expect(draft.exerciseSets[1][0].weight).toBe(70)
  })
})
