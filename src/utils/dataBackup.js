import { readJson } from './storageStats';
import { RANK_WEIGHTS_KEY, getRankWeights } from './customRank';

export const BACKUP_VERSION = 1;
export const BACKUP_APP_ID = 'trading-platform';
export const RESEARCH_DATA_IMPORTED_EVENT = 'research-data-imported';

/** localStorage keys included in research export/import (array values) */
export const RESEARCH_STORAGE_KEYS = [
  'watchlist',
  'trades',
  'portfolio',
  'scorecardEvals',
  'screenerPresets',
  'alertRules',
];

function emptyForKey(key) {
  return [];
}

export function buildExportPayload({ includeBroker = false, brokerSettings = null } = {}) {
  const data = {};
  for (const key of RESEARCH_STORAGE_KEYS) {
    data[key] = readJson(key, emptyForKey(key));
  }
  data.rankWeights = getRankWeights();

  const payload = {
    version: BACKUP_VERSION,
    app: BACKUP_APP_ID,
    exportedAt: new Date().toISOString(),
    data,
  };

  if (includeBroker && brokerSettings) {
    payload.broker = { ib: brokerSettings };
  }

  return payload;
}

export function validateBackupPayload(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid file: expected JSON object');
  }
  if (raw.app !== BACKUP_APP_ID) {
    throw new Error('This file is not a Trading Platform backup');
  }
  if (!raw.data || typeof raw.data !== 'object') {
    throw new Error('Backup is missing data section');
  }
  for (const key of RESEARCH_STORAGE_KEYS) {
    const val = raw.data[key];
    if (val != null && !Array.isArray(val)) {
      throw new Error(`Backup field "${key}" must be an array`);
    }
  }
  const rw = raw.data.rankWeights;
  if (rw != null && (typeof rw !== 'object' || Array.isArray(rw))) {
    throw new Error('Backup field "rankWeights" must be an object');
  }
  return raw;
}

function mergeById(existing, incoming) {
  const map = new Map();
  for (const item of existing || []) {
    if (item && item.id != null) map.set(String(item.id), item);
  }
  for (const item of incoming || []) {
    if (item && item.id != null) map.set(String(item.id), item);
  }
  return Array.from(map.values());
}

function mergeRankWeights(existing, incoming) {
  return { ...existing, ...incoming };
}

export function applyResearchImport(payload, mode = 'merge') {
  const validated = validateBackupPayload(payload);

  for (const key of RESEARCH_STORAGE_KEYS) {
    const incoming = validated.data[key];
    if (incoming == null) continue;

    if (mode === 'replace') {
      localStorage.setItem(key, JSON.stringify(incoming));
      continue;
    }

    const existing = readJson(key, []);
    const merged = mergeById(existing, incoming);
    localStorage.setItem(key, JSON.stringify(merged));
  }

  const incomingWeights = validated.data.rankWeights;
  if (incomingWeights != null) {
    if (mode === 'replace') {
      localStorage.setItem(RANK_WEIGHTS_KEY, JSON.stringify(incomingWeights));
    } else {
      const merged = mergeRankWeights(getRankWeights(), incomingWeights);
      localStorage.setItem(RANK_WEIGHTS_KEY, JSON.stringify(merged));
    }
  }

  return {
    broker: validated.broker?.ib ?? null,
  };
}

export function downloadBackupFile(payload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `trading-platform-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        resolve(validateBackupPayload(parsed));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

export function summarizeBackup(payload) {
  const validated = validateBackupPayload(payload);
  const counts = {};
  for (const key of RESEARCH_STORAGE_KEYS) {
    counts[key] = (validated.data[key] || []).length;
  }
  counts.rankWeights = validated.data.rankWeights ? 1 : 0;
  return {
    exportedAt: validated.exportedAt,
    counts,
    hasBroker: !!validated.broker?.ib,
  };
}
