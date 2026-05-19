import { TabId } from '../types';

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="4.5"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
      <line x1="12" y1="2" x2="12" y2="4.5"/>
      <line x1="12" y1="19.5" x2="12" y2="22"/>
      <line x1="2" y1="12" x2="4.5" y2="12"/>
      <line x1="19.5" y1="12" x2="22" y2="12"/>
    </svg>
  );
}

function MindIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <circle cx="12" cy="12" r="5.5"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function GoalsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,20 9,7 13,14 16.5,9 21,20"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2,12 6,12 8,6 11,18 14,9 16,13 18,12 22,12"/>
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12 C5 6.5 7 6.5 9.5 12 C12 17.5 14 17.5 16.5 12 C19 6.5 21 6.5 21.5 12"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  );
}

function SelfIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 L20.5 7 L20.5 17 L12 22 L3.5 17 L3.5 7 Z"/>
      <path d="M12 2 L12 22"/>
      <path d="M3.5 7 L20.5 7"/>
    </svg>
  );
}

const ICONS: Record<TabId, React.ReactNode> = {
  today:     <TodayIcon />,
  mind:      <MindIcon />,
  goals:     <GoalsIcon />,
  health:    <HealthIcon />,
  analytics: <StatsIcon />,
  character: <SelfIcon />,
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'today',     label: 'Today'  },
  { id: 'mind',      label: 'Mind'   },
  { id: 'goals',     label: 'Goals'  },
  { id: 'health',    label: 'Health' },
  { id: 'analytics', label: 'Stats'  },
  { id: 'character', label: 'Self'   },
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
          className={`bnav-item bnav-item-${tab.id}${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="bnav-icon">
            {ICONS[tab.id]}
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
