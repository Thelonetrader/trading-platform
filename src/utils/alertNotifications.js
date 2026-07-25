import { readJson } from './storageStats';

export const ALERT_NOTIFY_PREFS_KEY = 'alertNotifyPrefs';
export const ALERT_NOTIFY_STATE_KEY = 'alertNotifyState';

export const DEFAULT_ALERT_NOTIFY_PREFS = {
  enabled: false,
  intervalMinutes: 15,
  desktopNotify: true,
  sound: false,
};

export function getAlertNotifyPrefs() {
  try {
    const raw = localStorage.getItem(ALERT_NOTIFY_PREFS_KEY);
    if (!raw) return { ...DEFAULT_ALERT_NOTIFY_PREFS };
    return { ...DEFAULT_ALERT_NOTIFY_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_ALERT_NOTIFY_PREFS };
  }
}

export function saveAlertNotifyPrefs(prefs) {
  localStorage.setItem(
    ALERT_NOTIFY_PREFS_KEY,
    JSON.stringify({ ...DEFAULT_ALERT_NOTIFY_PREFS, ...prefs }),
  );
}

export function getAlertNotifyState() {
  return readJson(ALERT_NOTIFY_STATE_KEY, { lastFingerprint: '' });
}

export function saveAlertNotifyState(state) {
  localStorage.setItem(ALERT_NOTIFY_STATE_KEY, JSON.stringify(state));
}

export function fingerprintEvaluations(evaluations) {
  return evaluations
    .flatMap(({ rule, matches }) => matches.map((m) => `${rule.id}:${m.ticker}`))
    .sort()
    .join('|');
}

export async function ensureNotificationPermission() {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function playNotifySound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    /* ignore */
  }
}

export function notifyAlertMatches(evaluations, prefs) {
  const hits = evaluations.filter((e) => e.matches.length);
  if (!hits.length) return;

  const total = hits.reduce((n, e) => n + e.matches.length, 0);
  const title = `Trading Platform · ${total} alert match${total === 1 ? '' : 'es'}`;
  const body = hits
    .slice(0, 4)
    .map((e) => `${e.rule.name}: ${e.matches.map((m) => m.ticker).join(', ')}`)
    .join('\n');

  if (prefs.desktopNotify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    const n = new Notification(title, { body: body.slice(0, 500) });
    n.onclick = () => window.focus?.();
  }

  if (prefs.sound) playNotifySound();
}

/**
 * Returns updated fingerprint; fires notification when matches change vs lastFingerprint.
 */
export function tickAlertNotifications(evaluations, prefs, lastFingerprint) {
  const fp = fingerprintEvaluations(evaluations);
  const hasMatches = evaluations.some((e) => e.matches.length);

  if (!prefs.enabled || !hasMatches) {
    return { fingerprint: fp, didNotify: false };
  }

  if (fp === lastFingerprint) {
    return { fingerprint: fp, didNotify: false };
  }

  notifyAlertMatches(evaluations, prefs);
  return { fingerprint: fp, didNotify: true };
}
