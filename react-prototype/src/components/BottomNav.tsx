import { TabId } from '../types';

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="15" rx="3"/>
      <path d="M8 3.5v3"/>
      <path d="M16 3.5v3"/>
      <path d="M4 9h16"/>
      <path d="M8 13h2"/>
      <path d="M13.5 13h2.5"/>
      <path d="M8 16.5h5.5"/>
    </svg>
  );
}

function MindIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4.5a3 3 0 0 0-3 3 3.2 3.2 0 0 0-1.5 5.8A3.6 3.6 0 0 0 8 18.5h1"/>
      <path d="M15 4.5a3 3 0 0 1 3 3 3.2 3.2 0 0 1 1.5 5.8 3.6 3.6 0 0 1-3.5 5.2h-1"/>
      <path d="M9 4.5v14"/>
      <path d="M15 4.5v14"/>
      <path d="M9 9h-2"/>
      <path d="M15 9h2"/>
      <path d="M9 13h-2.5"/>
      <path d="M15 13h2.5"/>
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
      <path d="M4 19V5"/>
      <path d="M4 19h16"/>
      <rect x="7" y="11" width="2.8" height="5" rx="1"/>
      <rect x="11.1" y="8" width="2.8" height="8" rx="1"/>
      <rect x="15.2" y="6" width="2.8" height="10" rx="1"/>
      <path d="M7 8.5l3.4-2.5 3.2 1.7L18 4.8"/>
    </svg>
  );
}

function SelfIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l6.5 2.6v5.2c0 4.1-2.7 7.7-6.5 9.2-3.8-1.5-6.5-5.1-6.5-9.2V6.1L12 3.5z"/>
      <circle cx="12" cy="10" r="2.1"/>
      <path d="M8.8 16.1c.7-1.5 1.8-2.2 3.2-2.2s2.5.7 3.2 2.2"/>
      <path d="M17.2 4.9l.5-1.3.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5z"/>
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
