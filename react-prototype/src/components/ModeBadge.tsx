type Mode = 'on-track' | 'building' | 'recovery';

interface Props {
  mode: Mode;
}

const MODE_CONFIG: Record<Mode, { dot: string; label: string }> = {
  'on-track': { dot: '●', label: 'On Track' },
  'building': { dot: '●', label: 'Building' },
  'recovery': { dot: '◎', label: 'Recovery Mode' },
};

export function ModeBadge({ mode }: Props) {
  const cfg = MODE_CONFIG[mode];
  return (
    <span className={`mode-badge ${mode}`}>
      <span style={{ fontSize: '0.55rem', lineHeight: 1 }}>{cfg.dot}</span>
      {cfg.label}
    </span>
  );
}
