# Masters of Life Architecture

Masters of Life is a vanilla HTML/CSS/JavaScript PWA. It is not currently React, Vite, TypeScript, or Capacitor.

## Main Files

- `index.html` contains the app shell, Firebase/Chart.js script loading, tab containers, and inline handler entry points.
- `css/styles.css` contains the full visual system and responsive styling.
- `js/app-today-flow-data.js` contains Today Flow data and ordering helpers: `todayTasks`, `todayFocusBlocks`, `todayEntries`, `buildTodayFlow`, `applyTodayFlowCustomOrder`, `saveTodayFlowOrder`, `makeTodayFlowOrderKey`, `removeFromTodayFlowOrder`, and placement helpers. Loads first.
- `js/app-today-flow-render.js` contains Today Flow rendering: `renderTodayFlowDropZone`, `renderTodayFlow`, `renderTodayFlowItem`. Loads second.
- `js/app-current-focus.js` contains Current Focus selection and rendering: `getCurrentFocus`, `renderCurrentFocus`, `runningFocusSnapshot`, `flowTheme`, `activeStepTitle`, and rendering helpers. Loads third. `flowTheme` and `activeStepTitle` are shared with habit rendering in `app.js`.
- `js/app.js` contains app state, persistence, Firebase/localStorage sync, habit rendering, XP/Character logic, action functions, drag/drop handlers, and app glue.

## State

The global state object is `D`. Important areas include:

- `D.habits`
- `D.todayTasks`
- `D.focusBlocks`
- `D.todayFlowOrder`
- `D.sessions`
- `D.character`
- `D.meals`
- `D.body`
- `D.finance`
- `D.goals`

## Persistence Flow

- `coreSaveData()` prepares the saved data shape.
- `sv()` saves locally to `localStorage` and syncs to Firestore when authenticated.
- `migrateData(raw)` normalizes loaded data before it is applied.
- `applyCoreData(data)` applies loaded data to `D` and runs default/ensure helpers.
- `ldLocal()` loads local data when offline or before cloud data exists.

## Today Flow

Today is centered around a unified sequence of habit flows, quick tasks, and focus blocks.

Core functions:

- `buildTodayFlow()`
- `getCurrentFocus()`
- `renderCurrentFocus()`
- `renderTodayFlow()`
- `renderTodayFlowItem()`
- `renderHabitChain()`
- `renderNodeProgress()`

Product rule: **Current Focus = the first incomplete actionable item in the visible Today Flow order.**

## Future Direction

A future React/Capacitor migration is possible, but this codebase should stay static and dependency-light until that work is explicitly requested.

## Do Not Break

- Firebase authentication and Firestore sync
- Offline/localStorage saving
- XP awards, reversal, and Character progression
- Today Flow order and Current Focus selection
- Existing inline `onclick` handlers
- Existing user data shape

## Basic Validation

Run:

```bash
node --check js/app-today-flow-data.js
node --check js/app-today-flow-render.js
node --check js/app-current-focus.js
node --check js/app.js
git diff --check
```

Then manually check that Today, Current Focus, habit completion, quick tasks, focus blocks, Character, and sync/offline loading still work.
