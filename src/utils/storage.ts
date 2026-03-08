import type { HistoryItem } from '../types';

const HISTORY_KEY = 'ir-gym-history-v1';
const MAX_HISTORY = 5;

export function getHistory(): HistoryItem[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addToHistory(item: HistoryItem): void {
  try {
    const history = getHistory();
    const deduped = history.filter((h) => h.id !== item.id);
    const updated = [item, ...deduped].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // localStorage unavailable — fail silently
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch { /* empty */ }
}
