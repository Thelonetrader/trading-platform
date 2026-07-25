import { useEffect } from 'react';
import { RESEARCH_DATA_IMPORTED_EVENT } from '../utils/dataBackup';
import { evaluateAllRules } from '../utils/alertRules';
import { rankAllWatchlistItems } from '../utils/customRank';
import {
  getAlertNotifyPrefs,
  getAlertNotifyState,
  saveAlertNotifyState,
  tickAlertNotifications,
} from '../utils/alertNotifications';

const MIN_INTERVAL_MS = 60_000;

export function useAlertNotifications(quotes = {}) {
  useEffect(() => {
    let intervalId = null;

    const run = () => {
      const prefs = getAlertNotifyPrefs();
      if (!prefs.enabled) return;

      const evaluations = evaluateAllRules(rankAllWatchlistItems(quotes), quotes);
      const { lastFingerprint } = getAlertNotifyState();
      const { fingerprint, didNotify } = tickAlertNotifications(
        evaluations,
        prefs,
        lastFingerprint,
      );

      if (didNotify || fingerprint !== lastFingerprint) {
        saveAlertNotifyState({ lastFingerprint: fingerprint });
      }
    };

    const schedule = () => {
      if (intervalId) clearInterval(intervalId);
      const prefs = getAlertNotifyPrefs();
      if (!prefs.enabled) return;

      run();
      const ms = Math.max(MIN_INTERVAL_MS, (prefs.intervalMinutes || 15) * 60_000);
      intervalId = setInterval(run, ms);
    };

    schedule();
    window.addEventListener(RESEARCH_DATA_IMPORTED_EVENT, schedule);
    window.addEventListener('alert-notify-prefs-changed', schedule);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener(RESEARCH_DATA_IMPORTED_EVENT, schedule);
      window.removeEventListener('alert-notify-prefs-changed', schedule);
    };
  }, [quotes]);
}
