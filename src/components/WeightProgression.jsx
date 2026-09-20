import React from 'react'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

import { useWorkout } from '../context/WorkoutContext'
import { PYRAMID_REPS } from '../types'
import Sparkline from './Sparkline'

const REP_HEX = {
  15: '#3b82f6',
  13: '#10b981',
  11: '#f59e0b',
  9: '#ef4444',
  7: '#8b5cf6',
}

function CompactView({ data }) {
  const tiersWithData = PYRAMID_REPS.filter(
    (reps) => data.some((point) => point[`${reps} reps`] > 0),
  )

  if (tiersWithData.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Bu dönem için veri yok.</p>
  }

  const lastPoint = data[data.length - 1]

  return (
    <div className="space-y-2">
      {tiersWithData.map((reps) => {
        const values = data.map((point) => point[`${reps} reps`]).filter((v) => v > 0)
        const lastWeight = lastPoint[`${reps} reps`]
        return (
          <div key={reps} className="flex items-center gap-3">
            <span
              className="text-xs font-semibold w-8 text-right shrink-0"
              style={{ color: REP_HEX[reps] }}
            >
              {reps}
            </span>
            <div className="flex-1 min-w-0">
              <Sparkline
                data={values}
                color={REP_HEX[reps]}
                height={24}
              />
            </div>
            <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
              {lastWeight}kg
            </span>
          </div>
        )
      })}
    </div>
  )
}

function FullView({ data, dateRange, setDateRange }) {
  return (
    <div>
      <div className="mb-3">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{
            background: 'var(--surface-raised)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          <option value="all">Tüm zamanlar</option>
          <option value="30d">30 gün</option>
          <option value="90d">90 gün</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '13px',
              boxShadow: 'var(--shadow)',
            }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null
              return (
                <div style={{ padding: '8px' }}>
                  <div style={{ marginBottom: '4px', fontWeight: 'bold', color: 'var(--text-heading)' }}>{label}</div>
                  {payload.map((entry) => (
                    <div key={entry.dataKey} style={{ color: entry.color }}>
                      {entry.dataKey}: {entry.value} kg
                    </div>
                  ))}
                </div>
              )
            }}
          />
          <Legend />
          {PYRAMID_REPS.map((reps) => (
            <Line
              key={reps}
              type="monotone"
              dataKey={`${reps} reps`}
              stroke={REP_HEX[reps]}
              activeDot={{ r: 6 }}
              dot={true}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function WeightProgression({ exerciseId, compact = false }) {
  const { state: { sessions } } = useWorkout()
  const [dateRange, setDateRange] = React.useState('all')

  const now = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(now.getDate() - 30)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(now.getDate() - 90)

  const cutoffDate = dateRange === '30d' ? thirtyDaysAgo : dateRange === '90d' ? ninetyDaysAgo : null

  const filteredSessions = sessions.filter((session) => {
    if (!cutoffDate) return session.sets.some((set) => set.exerciseId === exerciseId)
    const sessionDate = new Date(session.date)
    return sessionDate >= cutoffDate && session.sets.some((set) => set.exerciseId === exerciseId)
  })

  const data = filteredSessions
    .map((session) => {
      const point = { date: session.date }
      for (const reps of PYRAMID_REPS) {
        const set = session.sets.find(
          (s) => s.exerciseId === exerciseId && s.reps === reps,
        )
        point[`${reps} reps`] = set?.weight || 0
      }
      return point
    })
    .filter((point) => PYRAMID_REPS.some((r) => point[`${r} reps`] > 0))

  if (compact) {
    return <CompactView data={data} exerciseId={exerciseId} />
  }

  return (
    <div>
      <FullView data={data} dateRange={dateRange} setDateRange={setDateRange} />

      {data.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Bu dönem için veri yok.</p>
      ) : (
        <div className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="font-medium" style={{ color: 'var(--text)' }}>Son seans: </span>
          {PYRAMID_REPS.filter((r) => data[data.length - 1][`${r} reps`] > 0)
            .map((r) => `${r} tekrar → ${data[data.length - 1][`${r} reps`]} kg`)
            .join(' | ')}
        </div>
      )}
    </div>
  )
}

export default WeightProgression
