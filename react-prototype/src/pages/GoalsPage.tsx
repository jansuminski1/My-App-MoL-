export function GoalsPage() {
  return (
    <div className="page goals-page">
      <div className="page-section-label">Weekly Goals</div>
      <div className="goals-empty-state">
        <div className="goals-empty-icon">◇</div>
        <div className="goals-empty-title">No weekly goals yet</div>
        <div className="goals-empty-sub">
          Set your 3 most important goals for this week.
        </div>
      </div>

      <div className="page-section-label" style={{ marginTop: 24 }}>Monthly Goals</div>
      <div className="goals-empty-state">
        <div className="goals-empty-icon">◇</div>
        <div className="goals-empty-title">No monthly goals yet</div>
        <div className="goals-empty-sub">
          Set the direction for this month — what matters most?
        </div>
      </div>

      <button className="page-add-btn" disabled>
        + Add Goal (coming soon)
      </button>
    </div>
  );
}
