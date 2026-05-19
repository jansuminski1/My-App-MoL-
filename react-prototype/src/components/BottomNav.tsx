import { TabId } from '../types';

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M8.5 12l2.5 2.5 4.5-4.5"/>
    </svg>
  );
}

function MindIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L4 14h7l-2 8 11-12h-7z"/>
    </svg>
  );
}

function GoalsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20L8.5 6 13 14 16 10 22 20z"/>
    </svg>
  );
}

function HealthIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V12M8 20V5M12 20V9M16 20V7M20 20v-6"/>
      <path d="M2 20h20"/>
    </svg>
  );
}

function SelfIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L21 9.5 12 22 3 9.5z"/>
      <path d="M3 9.5h18"/>
      <path d="M7.5 2.5L3 9.5M16.5 2.5L21 9.5"/>
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
          className={`bnav-item${activeTab === tab.id ? ' active' : ''}`}
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
