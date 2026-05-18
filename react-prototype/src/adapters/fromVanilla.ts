// fromVanilla.ts
// Adapter: vanilla app data  →  React prototype types
//
// When connecting to the real vanilla data store, implement these mappers.
// All vanilla shape references are READ-ONLY — never import from js/*.
//
// VANILLA HABIT  →  HabitFlow + HabitStep[]
//   vanilla habit (h):
//     h.id          → HabitFlow.id   (prefix: "flow-" + h.id)
//     h.name        → HabitFlow.title
//     h.id2         → HabitFlow.identity  (identity statement)
//     h.sk          → HabitFlow.trigger   ("After I…")
//     h.startTime   → HabitFlow.startTime
//     h.freq        → per-step HabitStep.freq  (daily / weekdays / custom)
//     h.log         → per-step completionLog   (Record<dateKey, boolean>)
//     h.tm          → HabitStep.tinyMinimum
//   Vanilla habits inside a chain become a single HabitFlow whose steps
//   are the individual chained habits (in stackedToNext order).
//
// VANILLA TODAY TASK  →  QuickTask
//   t.id          → QuickTask.id
//   t.title       → QuickTask.title
//   t.notes       → QuickTask.notes
//   t.completed   → QuickTask.completed
//   t.createdAt   → QuickTask.createdAt  (use completedAt = t.createdAt when done)
//   t.date        → QuickTask.dateKey    (YYYY-MM-DD string from vanilla dateStamp())
//   t.order       → QuickTask.order
//
// VANILLA FOCUS BLOCK  →  FocusBlock
//   b.id          → FocusBlock.id
//   b.title       → FocusBlock.title
//   b.notes       → FocusBlock.notes
//   b.type        → FocusBlock.type      ('Deep Work' | 'Study' | …)
//   b.duration    → FocusBlock.duration  (minutes)
//   b.completed   → FocusBlock.completed
//   b.createdAt   → FocusBlock.createdAt
//   b.date        → FocusBlock.dateKey
//   b.order       → FocusBlock.order
//
// VANILLA CHARACTER  →  CharacterState
//   D.character.totalXp    → CharacterState.totalXp
//   D.character.level      → CharacterState.level  (derived via getLevelProgress)
//   D.character.rank       → CharacterState.rank
//   D.character.rankName   → CharacterState.rankTitle
//   D.character.stats      → CharacterState.stats  (LifeStats)
//   D.character.xpEvents[] → CharacterState.xpEvents[]
//   D.character.rewarded   → CharacterState.rewarded  (Record<string,boolean>)
//
// VANILLA XP EVENT  →  XpEvent
//   e.id          → XpEvent.id
//   e.label       → XpEvent.label
//   e.generalXp   → XpEvent.generalXp
//   e.statXp      → XpEvent.statXp
//   e.timestamp   → XpEvent.timestamp
//   e.type        → XpEvent.type
//   e.rewardKey   → XpEvent.rewardKey
//   e.createdAt   → XpEvent.createdAt
//
// REWARD KEY PARITY
//   vanilla habitRewardKey(h, k)        = "habit:" + h.id + ":" + k
//   react   habitStepRewardKey(stepId, dateKey)  mirrors this exactly
//
//   vanilla todayTaskRewardKey(t, k)    = "today_task:" + k + ":" + t.id
//   react   taskRewardKey(taskId, dateKey)  = "task:" + dateKey + ":" + taskId
//   NOTE: prefix differs ("today_task" vs "task") — align before connecting.
//
//   vanilla focusBlockRewardKey(b, k)   = "focus_block:" + k + ":" + b.id
//   react   focusBlockRewardKey(blockId, dateKey) = "focus:" + dateKey + ":" + blockId
//   NOTE: prefix differs ("focus_block" vs "focus") — align before connecting.
