# Masters of Life Architecture

Masters of Life is a vanilla HTML/CSS/JavaScript PWA. It is not currently React, Vite, TypeScript, or Capacitor.

## Main Files

- `index.html` contains the app shell, Firebase/Chart.js script loading, tab containers, and inline handler entry points.
- `css/styles.css` contains the full visual system and responsive styling.
- `js/app-persistence.js` contains schema versioning, default shapes, ensure-helpers, data migration, save/apply, and local load: `APP_SCHEMA_VERSION`, `defaultCharacter`, `ensureCharacter`, `ensureHabitData`, `ensureFinance`, `ensureTodayFlow`, `ensureGoalsStructure`, `ensureBody`, `migrateData`, `applyCoreData`, `coreSaveData`, `ldLocal`. Loads first.
- `js/app-today-flow-data.js` contains Today Flow data and ordering helpers: `todayTasks`, `todayFocusBlocks`, `todayEntries`, `buildTodayFlow`, `applyTodayFlowCustomOrder`, `saveTodayFlowOrder`, `makeTodayFlowOrderKey`, `removeFromTodayFlowOrder`, and placement helpers. Loads second.
- `js/app-today-flow-render.js` contains Today Flow rendering: `renderTodayFlowDropZone`, `renderTodayFlow`, `renderTodayFlowItem`. Loads third.
- `js/app-current-focus.js` contains Current Focus selection and rendering: `getCurrentFocus`, `renderCurrentFocus`, `runningFocusSnapshot`, `flowTheme`, `activeStepTitle`, and rendering helpers. Loads fourth. `flowTheme` and `activeStepTitle` are shared with habit rendering in `app.js`.
- `js/app-xp.js` contains XP curve (`XP_CURVE_CONFIG`, `RANKS`), level/rank calculation, XP quality/difficulty helpers, reward keys, XP event lifecycle (`makeXpEvent`, `addXpEvent`, `removeXpEventByRewardKey`, `removeXpEventsByRewardPrefix`), character stat calculation (`calculateStatsFromEvents`, `recalculateCharacterFromEvents`), all `maybeAward*Xp` helpers, `showXpFloat`, `getTodayXpEvents`, `todayXpGained`, and `importXpFromHistory`. Loads fifth.
- `js/app-today-actions.js` contains Today task / focus block / Today Flow reorder actions: `showAddTodayTask`, `saveTodayTask`, `toggleTodayTask`, `deleteTodayTask`, `showAddFocusBlock`, `saveFocusBlock`, `toggleFocusBlock`, `deleteFocusBlock`, `startTodayFocusBlock`, `toggleTodayFlowReorderMode`, `moveTodayFlowItem`, `moveTodayEntry`, `updateTodayEntryPlacement`, `parseTodayPlacement`, `nextTodayOrder`, `renderTodayPlacementOptions`, `todayPlacementValue`. Loads sixth.
- `js/app-habit-render.js` contains Habit Flow / habit card rendering: `renderHabitChain`, `renderHabitRow`, `renderCurrentStepSubCard`, `renderFlowEditPanel`, `renderNodeProgress`, `renderFlowNodeRow`, `renderFlowSegments`, `renderHabitDropZone`, `habitDetailBlock`, `renderChainMoveOptions`. Loads seventh.
- `js/app-habit-actions.js` contains Habit action functions: `togH`, `uncompleteHabitInFlow`, `toggleStack`, `moveHabit`, `editHabitFlow`, `showAddHabit`, `saveHabit`, `showEditHabit`, `saveEditHabit`, `deleteHabit`, `moveHabitToGroup`, `moveHabitWithinGroup`, `rebuildHabitsFromGroups`, `renderFreqPicker`, `setFreqType`, `toggleFreqDay`, and related helpers. Loads eighth.
- `js/app-goals.js` contains Goals rendering, creation, completion, deletion, carry-over, and weekly stats: `getWeekBounds`, `weekKey`, `monthKey`, `todayGoalKey`, `getGoalsForType`, `goalPrefix`, `carryOverGoals`, `renGoals`, `renGoalList`, `addGoal`, `togGoal`, `delGoal`, `renStats`. Loads ninth.
- `js/app-analytics.js` contains Analytics rendering and Chart.js chart creation: `TAG_COLORS`, `chartCombo/Donut/Yearly`, `navMonth`, `navYear`, `getMonthSessions`, `renAnalytics`, `chartDefaults`, `chartScaleMax`, `renComboChart`, `renDonutChart`, `renYearlyChart`, `loadDemo`, `clearDemo`. Loads tenth.
- `js/app-focus-timer.js` contains the focus timer, recall/rest phases, session profiles, study session logging, manual session logging, and alarm: `playAlarm`, `toggleAlarm`, in-session tag dropdown, `renProfilesMini`, `selectProfile`, `selectedFocusMinutes`, `updateFocusTimerPanel`, `handleFocusRingTap/Primary`, profile editor helpers, `fmt`, `setRing`, `showPh`, timer state variables, `startWork`, `startFocusPhase`, `tickW`, `pauseResume`, `finishEarly`, `abandon`, `enterRecall`, `tickR`, `startRest`, `startRestPhase`, `skipRest`, `visibilitychange` handler, `selFocus`, `logSess`, `renSCnt`, `initSlogFilter`, `renSlog`, `resetIdle`, `showManualLog`, `selManFocus`, `saveManualLog`. Loads eleventh.
- `js/app.js` contains app state, persistence, Firebase/localStorage sync, habit data helpers (`buildHabitChains`, `buildHabitGroups`), Character tab rendering (`renderCharacter`, `generateRole`, `generateSuggestion`, `renStatGrid`), Today Flow drag/drop, tags, meals, body, finance, and app glue. Loads twelfth.

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

- `coreSaveData()` prepares the saved data shape. Defined in `js/app-persistence.js`.
- `sv()` saves locally to `localStorage` and syncs to Firestore when authenticated. Defined in `js/app.js` (Firebase-coupled).
- `migrateData(raw)` normalizes loaded data before it is applied. Defined in `js/app-persistence.js`.
- `applyCoreData(data)` applies loaded data to `D` and runs default/ensure helpers. Defined in `js/app-persistence.js`.
- `ldLocal()` loads local data when offline or before cloud data exists. Defined in `js/app-persistence.js`.

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
node --check js/app-persistence.js
node --check js/app-today-flow-data.js
node --check js/app-today-flow-render.js
node --check js/app-current-focus.js
node --check js/app-xp.js
node --check js/app-today-actions.js
node --check js/app-habit-render.js
node --check js/app-habit-actions.js
node --check js/app-goals.js
node --check js/app-analytics.js
node --check js/app-focus-timer.js
node --check js/app.js
git diff --check
```

Then manually check that Today, Current Focus, habit completion, quick tasks, focus blocks, Character, and sync/offline loading still work.
