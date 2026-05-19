import { useState } from 'react';
import { HealthState, MealType, MealQuality, CardioType, CardioIntensity } from '../types';
import { todayDateKey } from '../utils/date';

export interface MealFormData {
  type: MealType;
  label?: string;
  quality?: MealQuality;
}

export interface CardioFormData {
  type: CardioType;
  minutes: number;
  intensity?: CardioIntensity;
  distanceKm?: number;
}

export interface WeightFormData {
  weightKg: number;
}

export interface RecoveryFormData {
  sleepQuality?: 'Poor' | 'Okay' | 'Good';
  energy?: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

interface Props {
  health: HealthState;
  onAddMeal: (data: MealFormData) => void;
  onDeleteMeal: (id: string) => void;
  onAddCardio: (data: CardioFormData) => void;
  onDeleteCardio: (id: string) => void;
  onAddWeight: (data: WeightFormData) => void;
  onDeleteWeight: (id: string) => void;
  onSaveRecovery: (data: RecoveryFormData) => void;
  onDeleteRecovery: () => void;
}

const CARDIO_TYPES: CardioType[] = ['Walk', 'Run', 'Bike', 'Gym Cardio', 'Other'];
const STRUCTURED_MEALS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

function cardioXpPreview(minutes: number, intensity: CardioIntensity): number {
  const mult = intensity === 'Easy' ? 0.8 : intensity === 'Hard' ? 1.2 : 1.0;
  return Math.min(80, Math.round(minutes * mult));
}

function mealChipStyle(type: MealType): React.CSSProperties {
  switch (type) {
    case 'Breakfast': return { background: 'rgba(217,119,6,0.12)', color: 'var(--amber)' };
    case 'Lunch':     return { background: 'rgba(22,163,74,0.10)', color: 'var(--green)' };
    case 'Dinner':    return { background: 'rgba(14,165,233,0.10)', color: 'var(--accent-dark)' };
    case 'Snack':     return { background: 'var(--surface-alt)', color: 'var(--text-sec)' };
  }
}

export function HealthPage({
  health, onAddMeal, onDeleteMeal, onAddCardio, onDeleteCardio,
  onAddWeight, onDeleteWeight, onSaveRecovery, onDeleteRecovery,
}: Props) {
  const today = todayDateKey();
  const todayMeals = health.meals.filter(m => m.dateKey === today);
  const todayCardio = health.cardio.filter(c => c.dateKey === today);
  const todayCardioMin = todayCardio.reduce((s, c) => s + c.minutes, 0);
  const latestWeight = health.weight[0];
  const todayRecovery = health.recovery.find(r => r.dateKey === today);

  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const [mealLabel, setMealLabel] = useState('');
  const [mealQuality, setMealQuality] = useState<MealQuality | ''>('');

  const [showCardioForm, setShowCardioForm] = useState(false);
  const [cardioType, setCardioType] = useState<CardioType>('Walk');
  const [cardioMin, setCardioMin] = useState(30);
  const [cardioIntensity, setCardioIntensity] = useState<CardioIntensity>('Moderate');
  const [cardioDist, setCardioDist] = useState('');

  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weightInput, setWeightInput] = useState('');

  const [sleepQ, setSleepQ] = useState<'Poor' | 'Okay' | 'Good' | ''>(todayRecovery?.sleepQuality ?? '');
  const [energyVal, setEnergyVal] = useState<number>(todayRecovery?.energy ?? 0);
  const [moodVal, setMoodVal] = useState<number>(todayRecovery?.mood ?? 0);
  const [recoveryNote, setRecoveryNote] = useState(todayRecovery?.note ?? '');
  const [recoverySaved, setRecoverySaved] = useState(!!todayRecovery);

  function openMealForm(type: MealType) {
    setActiveMealType(type);
    setMealLabel('');
    setMealQuality('');
  }

  function submitMeal() {
    if (!activeMealType) return;
    onAddMeal({
      type: activeMealType,
      label: mealLabel.trim() || undefined,
      quality: mealQuality || undefined,
    });
    setActiveMealType(null);
    setMealLabel('');
    setMealQuality('');
  }

  function submitCardio() {
    if (cardioMin < 1) return;
    onAddCardio({
      type: cardioType,
      minutes: cardioMin,
      intensity: cardioIntensity,
      distanceKm: cardioDist ? parseFloat(cardioDist) : undefined,
    });
    setShowCardioForm(false);
    setCardioDist('');
  }

  function submitWeight() {
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0) return;
    onAddWeight({ weightKg: kg });
    setShowWeightForm(false);
    setWeightInput('');
  }

  function submitRecovery() {
    onSaveRecovery({
      sleepQuality: sleepQ || undefined,
      energy: energyVal > 0 ? (energyVal as 1|2|3|4|5) : undefined,
      mood: moodVal > 0 ? (moodVal as 1|2|3|4|5) : undefined,
      note: recoveryNote.trim() || undefined,
    });
    setRecoverySaved(true);
  }

  function handleDeleteRecovery() {
    onDeleteRecovery();
    setSleepQ('');
    setEnergyVal(0);
    setMoodVal(0);
    setRecoveryNote('');
    setRecoverySaved(false);
  }

  return (
    <div className="page health-page">
      <div className="health-page-header">
        <h1 className="health-page-title">Health</h1>
        <p className="health-page-sub">Body, energy, and recovery.</p>
      </div>

      <div className="health-summary-row">
        <div className="health-summary-card">
          <div className="hsc-value">{todayMeals.length > 0 ? todayMeals.length : '—'}</div>
          <div className="hsc-label">Meals</div>
        </div>
        <div className="health-summary-card">
          <div className="hsc-value">{todayCardioMin > 0 ? `${todayCardioMin}m` : '—'}</div>
          <div className="hsc-label">Cardio</div>
        </div>
        <div className="health-summary-card">
          <div className="hsc-value">{latestWeight ? `${latestWeight.weightKg}` : '—'}</div>
          <div className="hsc-label">Weight</div>
        </div>
        <div className="health-summary-card">
          <div className="hsc-value">{energyVal > 0 ? energyVal : (todayRecovery?.energy ?? '—')}</div>
          <div className="hsc-label">Energy</div>
        </div>
      </div>

      <div className="page-section-label">Meals today</div>
      <div className="health-section health-section-meals">
        {STRUCTURED_MEALS.map(mtype => {
          const entry = todayMeals.find(m => m.type === mtype);
          return (
            <div key={mtype} className="meal-section-row">
              <span className="meal-type-chip" style={mealChipStyle(mtype)}>{mtype}</span>
              {entry ? (
                <>
                  <span className="hle-label meal-row-label">{entry.label || entry.type}</span>
                  {entry.quality && <span className="hle-badge">{entry.quality}</span>}
                  {entry.xpReward != null && entry.xpReward > 0 && <span className="hle-xp">+{entry.xpReward} XP</span>}
                  <button className="hle-delete" onClick={() => onDeleteMeal(entry.id)}>×</button>
                </>
              ) : activeMealType === mtype ? (
                <span className="meal-form-active-hint">logging…</span>
              ) : (
                <button className="meal-log-quick-btn" onClick={() => openMealForm(mtype)}>+ Log</button>
              )}
            </div>
          );
        })}

        {todayMeals.filter(m => m.type === 'Snack').map(m => (
          <div key={m.id} className="meal-section-row">
            <span className="meal-type-chip" style={mealChipStyle('Snack')}>Snack</span>
            <span className="hle-label meal-row-label">{m.label || 'Snack'}</span>
            {m.quality && <span className="hle-badge">{m.quality}</span>}
            {m.xpReward != null && m.xpReward > 0 && <span className="hle-xp">+{m.xpReward} XP</span>}
            <button className="hle-delete" onClick={() => onDeleteMeal(m.id)}>×</button>
          </div>
        ))}
        {activeMealType !== 'Snack' && (
          <div className="meal-empty-row">
            <button className="meal-log-quick-btn" onClick={() => openMealForm('Snack')}>+ Snack</button>
          </div>
        )}

        {activeMealType && (
          <div className="health-form">
            <div className="hf-row">
              <select
                value={mealQuality}
                onChange={e => setMealQuality(e.target.value as MealQuality | '')}
                className="hf-select"
              >
                <option value="">Quality</option>
                <option value="Light">Light</option>
                <option value="Balanced">Balanced</option>
                <option value="Heavy">Heavy</option>
              </select>
            </div>
            <input
              type="text"
              placeholder={`${activeMealType} description (optional)`}
              value={mealLabel}
              onChange={e => setMealLabel(e.target.value)}
              className="hf-input"
              autoFocus
            />
            <div className="hf-actions">
              <button className="hf-btn-primary" onClick={submitMeal}>Log {activeMealType} +8 XP</button>
              <button className="hf-btn-cancel" onClick={() => setActiveMealType(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="page-section-label">Move your body</div>
      <div className="health-section health-section-cardio">
        {todayCardio.length === 0 && !showCardioForm && (
          <div className="health-empty">No cardio logged today</div>
        )}
        {todayCardio.map(c => (
          <div key={c.id} className="health-log-entry">
            <span className="hle-type-badge hle-cardio-badge">{c.type}</span>
            <span className="hle-label">
              {c.minutes} min{c.intensity ? ` · ${c.intensity}` : ''}{c.distanceKm ? ` · ${c.distanceKm} km` : ''}
            </span>
            {c.xpReward != null && c.xpReward > 0 && <span className="hle-xp">+{c.xpReward} XP</span>}
            <button className="hle-delete" onClick={() => onDeleteCardio(c.id)}>×</button>
          </div>
        ))}
        {showCardioForm ? (
          <div className="health-form">
            <div className="hf-row">
              <select value={cardioType} onChange={e => setCardioType(e.target.value as CardioType)} className="hf-select">
                {CARDIO_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={cardioIntensity} onChange={e => setCardioIntensity(e.target.value as CardioIntensity)} className="hf-select">
                <option value="Easy">Easy (×0.8)</option>
                <option value="Moderate">Moderate (×1.0)</option>
                <option value="Hard">Hard (×1.2)</option>
              </select>
            </div>
            <div className="hf-row">
              <div className="hf-field">
                <label className="hf-label">Minutes</label>
                <input
                  type="number" min={1} max={300} value={cardioMin}
                  onChange={e => setCardioMin(Math.max(1, parseInt(e.target.value) || 1))}
                  className="hf-input hf-input-sm"
                />
              </div>
              <div className="hf-field">
                <label className="hf-label">Distance km (opt)</label>
                <input
                  type="number" min={0} step={0.1} value={cardioDist}
                  onChange={e => setCardioDist(e.target.value)}
                  className="hf-input hf-input-sm"
                  placeholder="0.0"
                />
              </div>
            </div>
            <div className="hf-actions">
              <button className="hf-btn-primary" onClick={submitCardio}>
                Log Cardio +{cardioXpPreview(cardioMin, cardioIntensity)} XP
              </button>
              <button className="hf-btn-cancel" onClick={() => setShowCardioForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="health-add-btn" onClick={() => setShowCardioForm(true)}>+ Log Cardio</button>
        )}
      </div>

      <div className="page-section-label">Body log</div>
      <div className="health-section health-section-body">
        {health.weight.length === 0 && !showWeightForm && (
          <div className="health-empty">No weight logged yet</div>
        )}
        {health.weight.slice(0, 5).map(w => (
          <div key={w.id} className="health-log-entry">
            <span className="hle-weight-value">{w.weightKg} kg</span>
            <span className="hle-date">{w.dateKey === today ? 'Today' : w.dateKey}</span>
            {w.xpReward != null && w.xpReward > 0 && <span className="hle-xp">+{w.xpReward} XP</span>}
            <button className="hle-delete" onClick={() => onDeleteWeight(w.id)}>×</button>
          </div>
        ))}
        {showWeightForm ? (
          <div className="health-form">
            <div className="hf-row">
              <div className="hf-field">
                <label className="hf-label">Weight (kg)</label>
                <input
                  type="number" min={20} max={300} step={0.1}
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  className="hf-input hf-input-sm"
                  placeholder="e.g. 78.5"
                  autoFocus
                />
              </div>
            </div>
            <div className="hf-actions">
              <button className="hf-btn-primary" onClick={submitWeight}>Log Weight +5 XP</button>
              <button className="hf-btn-cancel" onClick={() => setShowWeightForm(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="health-add-btn" onClick={() => setShowWeightForm(true)}>+ Log Weight</button>
        )}
      </div>

      <div className="page-section-label">Recovery check-in</div>
      <div className="health-section health-section-recovery">
        <div className="recovery-form">
          <div className="recovery-row">
            <span className="recovery-row-label">Sleep</span>
            <div className="recovery-chips">
              {(['Poor', 'Okay', 'Good'] as const).map(q => (
                <button
                  key={q}
                  className={`recovery-chip${sleepQ === q ? ' active' : ''}`}
                  onClick={() => setSleepQ(prev => prev === q ? '' : q)}
                >{q}</button>
              ))}
            </div>
          </div>
          <div className="recovery-row">
            <span className="recovery-row-label">Energy</span>
            <div className="recovery-chips">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`recovery-chip recovery-chip-num${energyVal === n ? ' active' : ''}`}
                  onClick={() => setEnergyVal(prev => prev === n ? 0 : n)}
                >{n}</button>
              ))}
            </div>
          </div>
          <div className="recovery-row">
            <span className="recovery-row-label">Mood</span>
            <div className="recovery-chips">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  className={`recovery-chip recovery-chip-num${moodVal === n ? ' active' : ''}`}
                  onClick={() => setMoodVal(prev => prev === n ? 0 : n)}
                >{n}</button>
              ))}
            </div>
          </div>
          <textarea
            className="hf-input recovery-note"
            placeholder="Notes (optional)..."
            value={recoveryNote}
            onChange={e => setRecoveryNote(e.target.value)}
            rows={2}
          />
          <div className="recovery-actions">
            <button className="hf-btn-primary" onClick={submitRecovery}>
              {recoverySaved ? 'Update Recovery' : 'Save Recovery +8 XP'}
            </button>
            {recoverySaved && (
              <button className="recovery-clear-btn" onClick={handleDeleteRecovery}>Clear</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
