const HEALTH_SECTIONS = [
  { icon: '◎', title: 'Meals',    sub: 'Track daily nutrition and eating patterns.' },
  { icon: '◎', title: 'Cardio',   sub: 'Log runs, walks, and aerobic sessions.' },
  { icon: '◎', title: 'Weight',   sub: 'Track body weight and body composition trends.' },
  { icon: '◎', title: 'Recovery', sub: 'Sleep quality, HRV, and intentional rest.' },
];

export function HealthPage() {
  return (
    <div className="page health-page">
      <div className="page-section-label">Health Domains</div>
      {HEALTH_SECTIONS.map(s => (
        <div key={s.title} className="placeholder-card">
          <div className="placeholder-card-header">
            <span className="placeholder-card-icon">{s.icon}</span>
            <span className="placeholder-card-title">{s.title}</span>
            <span className="coming-soon-chip">Soon</span>
          </div>
          <div className="placeholder-card-sub">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}
