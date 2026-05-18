import { TabId } from '../types';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'today',     label: 'Today',  icon: '○' },
  { id: 'mind',      label: 'Mind',   icon: '◎' },
  { id: 'goals',     label: 'Goals',  icon: '◇' },
  { id: 'health',    label: 'Health', icon: '♡' },
  { id: 'analytics', label: 'Stats',  icon: '≡' },
  { id: 'character', label: 'Self',   icon: '◈' },
];

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  hasActiveSession?: boolean;
}

export function BottomNav({ activeTab, onTabChange, hasActiveSession }: Props) {
  return (
    <nav className="bottom-nav" role="tablist" aria-label="Main navigation">
      {TABS.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-label={tab.label}
          className={`bnav-item${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="bnav-icon">
            {tab.id === 'today' && activeTab === tab.id ? '●' : tab.icon}
          </span>
          <span className="bnav-label">{tab.label}</span>
          {tab.id === 'today' && hasActiveSession && (
            <span className="bnav-session-dot" aria-hidden="true" />
          )}
        </button>
      ))}
    </nav>
  );
}
