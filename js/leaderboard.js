const SCORES_KEY = 'gavin-racing-leaderboard';
const NAME_KEY = 'gavin-racing-driver';
const cleanName = value => String(value || '').trim().slice(0, 20) || 'You';
const sortScores = (a, b) => b.score - a.score || b.distance - a.distance || a.timestamp - b.timestamp;

export class Leaderboard {
  constructor() {
    this.entries = [];
    this.input = document.getElementById('driver-name');
    this.rows = document.getElementById('leaderboard-rows');
    this.status = document.getElementById('leaderboard-status');
    try {
      this.input.value = localStorage.getItem(NAME_KEY) || '';
      const saved = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
      if (Array.isArray(saved)) this.entries = saved.filter(entry => entry && Number.isFinite(entry.score) && entry.score > 0 && Number.isFinite(entry.distance) && entry.distance >= 0 && Number.isFinite(entry.timestamp) && !Number.isNaN(new Date(entry.timestamp).getTime()))
        .map(entry => ({ driver: cleanName(entry.driver), score: Math.floor(entry.score), distance: Math.floor(entry.distance), timestamp: entry.timestamp }))
        .sort(sortScores).slice(0, 10);
    } catch (_) { /* Start fresh when browser storage is unavailable or invalid. */ }
    this.input.addEventListener('input', () => {
      try { localStorage.setItem(NAME_KEY, this.input.value.slice(0, 20)); } catch (_) { /* Name remains usable this session. */ }
    });
    this.render();
  }

  get driver() { return cleanName(this.input.value); }

  record(driver, score, distance) {
    if (!Number.isFinite(score) || score < 1 || !Number.isFinite(distance) || distance < 0) return;
    const entry = { driver: cleanName(driver), score: Math.floor(score), distance: Math.floor(distance), timestamp: Date.now() };
    this.entries.push(entry); this.entries.sort(sortScores); this.entries = this.entries.slice(0, 10);
    const rank = this.entries.indexOf(entry) + 1;
    let saved = true;
    try { localStorage.setItem(SCORES_KEY, JSON.stringify(this.entries)); } catch (_) { saved = false; }
    this.render(entry);
    this.status.textContent = rank ? `${entry.driver} placed #${rank} with ${entry.score.toLocaleString()} points!` : 'Keep chasing! Your next run could break the top 10.';
    if (!saved) this.status.textContent += ' Scores are available for this session only.';
  }

  render(latest) {
    this.rows.replaceChildren();
    if (!this.entries.length) {
      const row = this.rows.insertRow(), cell = row.insertCell();
      cell.colSpan = 5; cell.className = 'leaderboard-empty';
      cell.textContent = 'The road is yours. Finish your first race to set a score.';
      return;
    }
    this.entries.forEach((entry, index) => {
      const row = this.rows.insertRow();
      if (entry === latest) row.classList.add('latest-run');
      const values = [String(index + 1).padStart(2, '0'), entry.driver, entry.score.toLocaleString(), `${entry.distance.toLocaleString()} m`, new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })];
      for (const value of values) row.insertCell().textContent = value;
    });
  }
}
