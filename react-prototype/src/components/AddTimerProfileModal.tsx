import { useState } from 'react';

interface ProfileData {
  name: string;
  focusMinutes: number;
  recallMinutes: number;
  restMinutes: number;
}

interface Props {
  onAdd: (data: ProfileData) => void;
  onClose: () => void;
}

export function AddTimerProfileModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [recallMinutes, setRecallMinutes] = useState(5);
  const [restMinutes, setRestMinutes] = useState(5);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || focusMinutes < 1) return;
    onAdd({ name: name.trim(), focusMinutes, recallMinutes, restMinutes });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">New Timer Profile</span>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-label">
            Profile name
            <input
              className="modal-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Deep Study"
              autoFocus
            />
          </label>
          <div className="modal-row-3">
            <label className="modal-label">
              Focus (min)
              <input type="number" className="modal-input" min={1} max={180} value={focusMinutes}
                onChange={e => setFocusMinutes(Number(e.target.value))} />
            </label>
            <label className="modal-label">
              Recall (min)
              <input type="number" className="modal-input" min={0} max={60} value={recallMinutes}
                onChange={e => setRecallMinutes(Number(e.target.value))} />
            </label>
            <label className="modal-label">
              Rest (min)
              <input type="number" className="modal-input" min={0} max={60} value={restMinutes}
                onChange={e => setRestMinutes(Number(e.target.value))} />
            </label>
          </div>
          <div className="modal-profile-preview">
            {focusMinutes}m focus · {recallMinutes}m recall · {restMinutes}m rest
          </div>
          <button className="modal-submit" type="submit" disabled={!name.trim() || focusMinutes < 1}>
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}
