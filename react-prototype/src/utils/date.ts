export function todayDateKey(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function nowTs(): number {
  return Date.now();
}

export function currentWeekKey(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun...6=Sat
  const diffToMonday = (day + 6) % 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - diffToMonday);
  const yyyy = mon.getFullYear();
  const mm = String(mon.getMonth() + 1).padStart(2, '0');
  const dd = String(mon.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
