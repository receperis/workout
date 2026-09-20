// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import ExerciseCard from '../components/ExerciseCard'
import { PYRAMID_REPS } from '../types'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  localStorage.clear()
})

function expandCard() {
  fireEvent.click(screen.getByText('Bench Press'))
}

describe('ExerciseCard', () => {
  it('renders exercise name as heading', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} />)
    expect(screen.getByText('Bench Press')).toBeInTheDocument()
  })

  it('starts collapsed', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} />)
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('expands when header is clicked', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} />)
    expandCard()
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toBeInTheDocument()
  })

  it('renders 5 rep rows with correct values when expanded', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} />)
    expandCard()
    PYRAMID_REPS.forEach((reps) => {
      expect(screen.getByText(String(reps))).toBeInTheDocument()
    })
  })

  it('renders rows in correct order (15, 13, 11, 9, 7) when expanded', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} />)
    expandCard()
    const reps = PYRAMID_REPS.map((reps) => screen.getByText(String(reps)).textContent)
    expect(reps).toEqual(['15', '13', '11', '9', '7'])
  })

  it('each row displays the rep number and kg label when expanded', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} />)
    expandCard()
    const kgLabels = screen.getAllByText('kg')
    expect(kgLabels).toHaveLength(PYRAMID_REPS.length)
  })

  it('renders weight input per rep row with kg suffix when expanded', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} />)
    expandCard()
    PYRAMID_REPS.forEach((reps) => {
      const input = screen.getByRole('spinbutton', { name: `Bench Press ${reps} tekrar ağırlığı` })
      expect(input).toBeInTheDocument()
    })
  })

  it('displays total as 0 when no weights entered', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} />)
    expect(screen.getByText('Toplam: 0 kg')).toBeInTheDocument()
  })

  it('calculates total correctly when weights are entered', () => {
    const onChange = () => {}
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={onChange} />)
    expandCard()
    const inputs = PYRAMID_REPS.map((reps) =>
      screen.getByRole('spinbutton', { name: `Bench Press ${reps} tekrar ağırlığı` })
    )
    fireEvent.change(inputs[0], { target: { value: '20' } })
    fireEvent.change(inputs[1], { target: { value: '25' } })
    fireEvent.change(inputs[2], { target: { value: '30' } })
    fireEvent.change(inputs[3], { target: { value: '35' } })
    fireEvent.change(inputs[4], { target: { value: '40' } })
    // 15*20 + 13*25 + 11*30 + 9*35 + 7*40 = 300+325+330+315+280 = 1550
    expect(screen.getByText('Toplam: 1,550 kg')).toBeInTheDocument()
  })

  it('calls onChange with sets array when weights change', () => {
    let receivedSets = []
    const onChange = (sets) => { receivedSets = sets }
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={onChange} />)
    expandCard()
    const input = screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })
    fireEvent.change(input, { target: { value: '50' } })
    expect(receivedSets).toHaveLength(5)
    expect(receivedSets[0]).toEqual({ exerciseId: 1, reps: 15, weight: 50 })
  })
})

describe('ExerciseCard - readOnly', () => {
  const initialSets = [
    { exerciseId: 1, reps: 15, weight: 60 },
    { exerciseId: 1, reps: 13, weight: 65 },
    { exerciseId: 1, reps: 11, weight: 70 },
    { exerciseId: 1, reps: 9, weight: 75 },
    { exerciseId: 1, reps: 7, weight: 80 },
  ]

  it('starts expanded when readOnly and has data', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} initialSets={initialSets} readOnly />)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toBeInTheDocument()
  })

  it('starts collapsed when readOnly and has no data', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} readOnly />)
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('disables all inputs when readOnly', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} initialSets={initialSets} readOnly />)
    PYRAMID_REPS.forEach((reps) => {
      const input = screen.getByRole('spinbutton', { name: `Bench Press ${reps} tekrar ağırlığı` })
      expect(input).toBeDisabled()
    })
  })

  it('pre-populates input values from initialSets when readOnly', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} initialSets={initialSets} readOnly />)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toHaveValue(60)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 13 tekrar ağırlığı' })).toHaveValue(65)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 11 tekrar ağırlığı' })).toHaveValue(70)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 9 tekrar ağırlığı' })).toHaveValue(75)
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 7 tekrar ağırlığı' })).toHaveValue(80)
  })

  it('calculates total correctly in readOnly mode', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} initialSets={initialSets} readOnly />)
    // 15*60 + 13*65 + 11*70 + 9*75 + 7*80 = 900+845+770+675+560 = 3750
    expect(screen.getByText('Toplam: 3,750 kg')).toBeInTheDocument()
  })

  it('shows read only label in collapsed summary when readOnly', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} initialSets={initialSets} readOnly />)
    // Should start expanded, collapse it
    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.getByText('(salt okunur)')).toBeInTheDocument()
  })

  it('can still collapse and expand when readOnly', () => {
    render(<ExerciseCard exerciseId={1} exerciseName="Bench Press" onChange={() => {}} initialSets={initialSets} readOnly />)
    // Starts expanded
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toBeInTheDocument()
    // Collapse
    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    // Expand again
    fireEvent.click(screen.getByText('Bench Press'))
    expect(screen.getByRole('spinbutton', { name: 'Bench Press 15 tekrar ağırlığı' })).toBeInTheDocument()
  })
})
