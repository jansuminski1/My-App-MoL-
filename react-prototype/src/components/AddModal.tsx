import { useState } from 'react';
import { FocusType, FocusTag } from '../types';

type AddMode = 'task' | 'focus' | 'flow';

interface AddData {
  title: string;
  notes: string;
  duration: number;
  focusType: FocusType;
  steps: string[];
  trigger: string;
  identity: string;
  identityShort: string;
  place: string;
  tinyVersion: string;
  obstacle: string;
  obstaclePlan: string;
  firstAction: string;
  entryStep: string;
  difficulty: string;
  taskTime?: string;
  tagId?: string;
  tagName?: string;
}

interface Props {
  mode: AddMode;
  focusTags: FocusTag[];
  onAdd: (data: AddData) => void;
  onClose: () => void;
  onCustomDuration?: () => void;
}

const DURATIONS = [25, 45, 60, 90];
const FOCUS_TYPES: FocusType[] = ['Deep Work', 'Study', 'Admin', 'Health', 'Recovery', 'Other'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

const CONFIG = {
  task:  { label: 'Quick Task',  submitClass: 'submit-task',  placeholder: 'e.g. Call dentist' },
  focus: { label: 'Focus Block', submitClass: '',             placeholder: 'e.g. Deep Work: Report' },
  flow:  { label: 'Habit Flow',  submitClass: 'submit-flow',  placeholder: 'e.g. Evening Reset' },
};

export function AddModal({ mode, focusTags, onAdd, onClose, onCustomDuration }: Props) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(25);
  const [durationInput, setDurationInput] = useState('25');
  const [focusType, setFocusType] = useState<FocusType>('Deep Work');
  const [steps, setSteps] = useState('');
  const [trigger, setTrigger] = useState('');
  const [identity, setIdentity] = useState('');
  const [identityShort, setIdentityShort] = useState('');
  const [place, setPlace] = useState('');
  const [tinyVersion, setTinyVersion] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [obstaclePlan, setObstaclePlan] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [firstAction, setFirstAction] = useState('');
  const [entryStep, setEntryStep] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [tagId, setTagId] = useState('');

  const cfg = CONFIG[mode];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const selectedTag = focusTags.find(t => t.id === tagId);
    const customDuration = Math.round(Number(durationInput));
    const resolvedDuration = mode === 'focus' && Number.isFinite(customDuration)
      ? Math.min(240, Math.max(5, customDuration))
      : duration;
    onAdd({
      title: title.trim(),
      notes: notes.trim(),
      duration: resolvedDuration,
      focusType,
      steps: steps.split(',').map(s => s.trim()).filter(Boolean),
      trigger: trigger.trim(),
      identity: identity.trim(),
      identityShort: identityShort.trim(),
      place: place.trim(),
      tinyVersion: tinyVersion.trim(),
      obstacle: obstacle.trim(),
      obstaclePlan: obstaclePlan.trim(),
      firstAction: firstAction.trim(),
      entryStep: entryStep.trim(),
      difficulty: difficulty.trim(),
      taskTime: taskTime || undefined,
      tagId: selectedTag?.id,
      tagName: selectedTag?.name,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add {cfg.label}</span>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-label">
            {mode === 'flow' ? 'Flow name' : 'Title'}
            <input
              className="modal-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={cfg.placeholder}
              autoFocus
            />
          </label>

          {mode !== 'flow' && (
            <label className="modal-label">
              Note (optional)
              <input
                className="modal-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional details"
              />
            </label>
          )}

          {mode === 'focus' && (
            <>
              <div className="modal-label">
                Duration
                <div className="modal-duration-row">
                  {DURATIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`modal-duration-btn${duration === d ? ' selected' : ''}`}
                      onClick={() => { setDuration(d); setDurationInput(String(d)); }}
                    >
                      {d} min
                    </button>
                  ))}
                  <button
                    type="button"
                    className="modal-duration-btn modal-duration-custom"
                    onClick={() => onCustomDuration?.()}
                  >
                    Custom
                  </button>
                </div>
              </div>
              <label className="modal-label">
                Custom minutes
                <input
                  className="modal-input modal-minutes-input"
                  type="number"
                  min={5}
                  max={240}
                  step={5}
                  value={durationInput}
                  onChange={e => {
                    setDurationInput(e.target.value);
                    const value = Number(e.target.value);
                    if (Number.isFinite(value)) {
                      setDuration(Math.min(240, Math.max(5, Math.round(value))));
                    }
                  }}
                  onBlur={() => {
                    const value = Math.round(Number(durationInput));
                    const next = Number.isFinite(value) ? Math.min(240, Math.max(5, value)) : duration;
                    setDuration(next);
                    setDurationInput(String(next));
                  }}
                  placeholder="45"
                />
              </label>
              <div className="modal-label">
                Type
                <div className="modal-type-row">
                  {FOCUS_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`modal-type-btn${focusType === t ? ' selected' : ''}`}
                      onClick={() => setFocusType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {focusTags.length > 0 && (
                <div className="modal-label">
                  Tag
                  <div className="modal-tag-row">
                    <button
                      type="button"
                      className={`modal-tag-btn${tagId === '' ? ' selected' : ''}`}
                      onClick={() => setTagId('')}
                    >
                      None
                    </button>
                    {focusTags.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className={`modal-tag-btn${tagId === t.id ? ' selected' : ''}`}
                        onClick={() => setTagId(prev => prev === t.id ? '' : t.id)}
                      >
                        {t.color && <span className="modal-tag-dot" style={{ background: t.color }} />}
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'task' && (
            <>
              <button
                type="button"
                className="modal-advanced-toggle"
                onClick={() => setAdvancedOpen(o => !o)}
              >
                <span className={`modal-advanced-chevron${advancedOpen ? ' open' : ''}`}>▸</span>
                Refine this task
              </button>

              {advancedOpen && (
                <div className="modal-advanced-section">
                  <label className="modal-label">
                    Time (optional)
                    <input
                      type="time"
                      className="modal-input"
                      value={taskTime}
                      onChange={e => setTaskTime(e.target.value)}
                    />
                  </label>
                  <label className="modal-label">
                    First action
                    <input
                      className="modal-input"
                      value={firstAction}
                      onChange={e => setFirstAction(e.target.value)}
                      placeholder="e.g. Open the document"
                    />
                  </label>
                  <label className="modal-label">
                    Tiny version
                    <input
                      className="modal-input"
                      value={tinyVersion}
                      onChange={e => setTinyVersion(e.target.value)}
                      placeholder="Bare minimum to count"
                    />
                  </label>
                </div>
              )}
            </>
          )}

          {mode === 'focus' && (
            <>
              <button
                type="button"
                className="modal-advanced-toggle"
                onClick={() => setAdvancedOpen(o => !o)}
              >
                <span className={`modal-advanced-chevron${advancedOpen ? ' open' : ''}`}>▸</span>
                Refine this block
              </button>

              {advancedOpen && (
                <div className="modal-advanced-section">
                  <label className="modal-label">
                    Entry step / tiny start
                    <input
                      className="modal-input"
                      value={entryStep}
                      onChange={e => setEntryStep(e.target.value)}
                      placeholder="Auto-generated if empty"
                    />
                  </label>
                  <div className="modal-label">
                    Difficulty
                    <div className="modal-difficulty-row">
                      {DIFFICULTIES.map(d => (
                        <button
                          key={d}
                          type="button"
                          className={`modal-difficulty-btn${difficulty === d ? ' selected' : ''}`}
                          onClick={() => setDifficulty(prev => prev === d ? '' : d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {mode === 'flow' && (
            <>
              <label className="modal-label">
                Starts after
                <input
                  className="modal-input"
                  value={trigger}
                  onChange={e => setTrigger(e.target.value)}
                  placeholder="After I wake up"
                />
              </label>
              <label className="modal-label">
                Identity
                <input
                  className="modal-input"
                  value={identity}
                  onChange={e => setIdentity(e.target.value)}
                  placeholder="I am someone who starts the day deliberately."
                />
              </label>
              <label className="modal-label">
                Steps (comma-separated)
                <input
                  className="modal-input"
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                  placeholder="e.g. drink water, stretch, review tasks"
                />
              </label>

              <button
                type="button"
                className="modal-advanced-toggle"
                onClick={() => setAdvancedOpen(o => !o)}
              >
                <span className={`modal-advanced-chevron${advancedOpen ? ' open' : ''}`}>▸</span>
                Refine this flow
              </button>

              {advancedOpen && (
                <div className="modal-advanced-section">
                  <label className="modal-label">
                    Short identity label
                    <input
                      className="modal-input"
                      value={identityShort}
                      onChange={e => setIdentityShort(e.target.value)}
                      placeholder="Auto-generated if empty"
                    />
                  </label>
                  <label className="modal-label">
                    Place / context
                    <input
                      className="modal-input"
                      value={place}
                      onChange={e => setPlace(e.target.value)}
                      placeholder="kitchen, desk, bedroom…"
                    />
                  </label>
                  <label className="modal-label">
                    Tiny version
                    <input
                      className="modal-input"
                      value={tinyVersion}
                      onChange={e => setTinyVersion(e.target.value)}
                      placeholder="Bare minimum to count"
                    />
                  </label>
                  <label className="modal-label">
                    What might get in the way?
                    <input
                      className="modal-input"
                      value={obstacle}
                      onChange={e => setObstacle(e.target.value)}
                      placeholder="I check my phone first"
                    />
                  </label>
                  <label className="modal-label">
                    If that happens, I will…
                    <input
                      className="modal-input"
                      value={obstaclePlan}
                      onChange={e => setObstaclePlan(e.target.value)}
                      placeholder="Put phone across the room"
                    />
                  </label>
                </div>
              )}
            </>
          )}

          <button
            className={`modal-submit${cfg.submitClass ? ` ${cfg.submitClass}` : ''}`}
            type="submit"
            disabled={!title.trim()}
          >
            Add {cfg.label}
          </button>
        </form>
      </div>
    </div>
  );
}
