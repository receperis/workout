# Workout Tracker — Product Requirements & Task Plan

Loop engineering plan: **37 tasks** across **9 phases**

---

## Project Overview

**Description:** A React + Vite single-page app that tracks workout routines with a pyramid rep scheme (15→13→11→9→7 reps, increasing weight), organizes exercises by day of week, and syncs all data to Google Drive as a JSON file.

### Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Routing | React Router v7 |
| Auth | Google Identity Services (GIS) + gapi client (no backend) |
| State | React Context + localStorage fallback |
| Storage | Google Drive API v3 (JSON file) |

---

## Data Model

```
WorkoutData
├── exercises: string[]                       # user-defined exercise names
├── schedule: Record<string, string[]>        # day -> exercise names
└── sessions: WorkoutSession[]
      ├── id: string
      ├── date: string                        # ISO date
      ├── day: string                         # e.g. "Monday"
      └── sets: WorkoutSet[]
            ├── exercise: string
            ├── reps: number                  # 15, 13, 11, 9, or 7
            └── weight: number                # kg
```

---

## Screens

1. **Dashboard** — Week overview, today's exercises, quick-start
2. **Log Workout** — Select day, enter weights per pyramid set, and set an exercise-wide kg increase shown as a target above each previous-session weight
3. **Progress** — Line chart per exercise showing weight over time
4. **Settings** — Manage exercises, schedule, Google Drive connection

---

## Phase 1: Project Scaffolding

- [x] **1.1** Initialize Vite + React project
  - Command: `npm create vite@latest . -- --template react`
  - Output: package.json, vite.config.js, boilerplate

- [x] **1.2** Install dependencies
  - Command: `npm install tailwindcss @tailwindcss/vite react-router-dom recharts uuid`
  - Depends on: 1.1
  - Output: node_modules, updated package.json

- [x] **1.3** Configure Tailwind CSS
  - Files: `vite.config.js`, `src/index.css`
  - Depends on: 1.2
  - Output: Tailwind working

- [x] **1.4** Set up React Router with routes
  - Routes: `/` → Dashboard, `/log` → LogWorkout, `/progress` → Progress, `/settings` → Settings
  - Depends on: 1.3
  - Output: App.jsx with Routes

---

## Phase 2: Data Layer & State

- [x] **2.1** Define data types (JSDoc or TypeScript)
  - Types: WorkoutData, WorkoutSession, WorkoutSet
  - Output: Types documented

- [x] **2.2** Create WorkoutContext with useReducer
  - Actions: ADD_EXERCISE, REMOVE_EXERCISE, LOG_SESSION, SET_SCHEDULE, LOAD_DATA
  - Depends on: 2.1
  - Output: WorkoutContext.jsx

- [x] **2.3** Implement localStorage service (storage.js)
  - Depends on: 2.2
  - Output: storage.js

- [x] **2.4** Wire Context provider in main.jsx
  - Depends on: 2.3
  - Output: App has persistent state

---

## Phase 3: Google Drive Integration

- [x] **3.1** Create googleDrive.js — load GIS + gapi scripts dynamically
  - Output: googleDrive.js

- [x] **3.2** Implement signIn() / signOut() via Google Identity Services
  - Depends on: 3.1
  - Output: OAuth flow works

- [x] **3.3** Implement findOrCreateFile() — locate or create WorkoutTracker/workout-data.json
  - Depends on: 3.2
  - Output: File ID resolved

- [x] **3.4** Implement loadFromDrive(fileId) — read and parse JSON
  - Depends on: 3.3
  - Output: Data loaded from Drive

- [x] **3.5** Implement saveToDrive(fileId, data) — serialize and upload JSON
  - Depends on: 3.3
  - Output: Data saved to Drive

- [x] **3.6** Add sync logic in WorkoutContext
  - Flow: On login → merge & load from Drive; On save → push to Drive
  - Depends on: 3.4, 3.5, 2.2
  - Output: Two-way sync

- [x] **3.7** Handle offline — queue changes in localStorage, sync on reconnect
  - Depends on: 3.6
  - Output: Offline resilience

---

## Phase 4: Settings Screen

- [x] **4.1** Build Settings.jsx — exercise list with add/remove/rename
  - Depends on: 2.2
  - Output: Exercise management

- [x] **4.2** Build day-of-week schedule editor
  - Depends on: 4.1
  - Output: Schedule configured

- [x] **4.3** Add Connect/Disconnect Google Drive button with status
  - Depends on: 3.2
  - Output: Drive connection UI

- [x] **4.4** Show sync status (last synced, pending changes)
  - Depends on: 3.6
  - Output: Sync feedback

---

## Phase 5: Dashboard Screen

- [x] **5.1** Build Dashboard.jsx — today's day, assigned exercises
  - Depends on: 2.2, 4.2
  - Output: Today's workout visible

- [x] **5.2** Start Workout button → navigates to /log with day pre-selected
  - Depends on: 5.1
  - Output: Quick-start flow

- [x] **5.3** Show recent session summary (last weight per exercise)
  - Depends on: 2.2
  - Output: Progress snapshot

---

## Phase 6: Log Workout Screen

- [x] **6.1** Build LogWorkout.jsx — day selector dropdown
  - Depends on: 2.2
  - Output: Day selected

- [x] **6.2** Render exercise cards with 5 rows (15, 13, 11, 9, 7 reps)
  - Depends on: 4.2, 6.1
  - Output: Rep grid visible

- [x] **6.3** Weight input field per rep row (number, kg suffix)
  - Depends on: 6.2
  - Output: Weights enterable

- [x] **6.4** Auto-focus next input on Enter key
  - Depends on: 6.3
  - Output: Fast data entry

- [x] **6.5** Save Session button → dispatches LOG_SESSION
  - Depends on: 6.4, 2.2
  - Output: Session persisted

- [x] **6.6** Input validation — warn if weight is 0 or missing
  - Depends on: 6.3
  - Output: Input validation

---

## Phase 7: Progress Screen

- [x] **7.1** Build Progress.jsx — exercise selector dropdown
  - Depends on: 2.2
  - Output: Exercise chosen

- [x] **7.2** Build WeightProgression.jsx — Recharts LineChart (weight Y, date X)
  - Depends on: 7.1, 2.2
  - Output: Chart renders

- [x] **7.3** One line per rep tier (15, 13, 11, 9, 7) with legend
  - Depends on: 7.2
  - Output: Multi-series chart

- [x] **7.4** Date range filter (30d, 90d, all time)
  - Depends on: 7.2
  - Output: Filterable view

- [x] **7.5** Tooltip showing exact weight + date on hover
  - Depends on: 7.2
  - Output: Interactive tooltip

---

## Phase 8: Layout & Polish

- [x] **8.1** Build Layout.jsx — responsive sidebar/top nav with icons
  - Depends on: 1.4
  - Output: App shell

- [x] **8.2** Mobile-friendly responsive grid for workout logging
  - Depends on: 6.2
  - Output: Works on phone

- [x] **8.3** Empty states — "No exercises yet" with CTA to Settings
  - Depends on: 4.1
  - Output: Friendly onboarding

- [x] **8.4** Error boundary for Drive API failures with retry
  - Depends on: 3.6
  - Output: Graceful errors

- [x] **8.5** Loading spinner during Drive sync
  - Depends on: 3.6
  - Output: Loading feedback

---

## Phase 9: Testing & Hardening

- [x] **9.1** E2E flow test — create exercises → schedule → log → chart
  - Depends on: all phases
  - Output: E2E validated

- [x] **9.2** Offline → reconnect sync test
  - Depends on: 3.7
  - Output: Offline works

- [x] **9.3** Drive auth edge cases (expired token, network error)
  - Depends on: 3.2
  - Output: Robust auth

- [x] **9.4** Lint pass (`npm run lint`)
  - Depends on: all phases
  - Output: Clean code

- [x] **9.5** Build production (`npm run build`)
  - Depends on: all phases
  - Output: Deployable

---

## Execution Order

```
Phase 1 (Scaffold) → Phase 2 (Data) → Phase 3 (Drive)
→ Phase 4 (Settings) → Phase 5 (Dashboard)
→ Phase 6 (Log Workout) → Phase 7 (Charts)
→ Phase 8 (Polish) → Phase 9 (Test)
```

---

## Google Cloud Setup

> **Must be completed before Drive integration works**

1. Go to https://console.cloud.google.com
2. Create project (or select existing)
3. Enable **Google Drive API** in APIs & Services > Library
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add `http://localhost:5173` as Authorized JavaScript origin
6. Copy CLIENT_ID into app `.env` or settings
