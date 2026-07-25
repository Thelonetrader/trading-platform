export function escapeCsvCell(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** @param {string[]} headers @param {Record<string, unknown>[]} rows */
export function rowsToCsv(headers, rows) {
  const head = headers.map(escapeCsvCell).join(',');
  const body = (rows || []).map((row) => headers.map((h) => escapeCsvCell(row[h])).join(','));
  return [head, ...body].join('\n');
}

export function downloadTextFile(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, csvText) {
  downloadTextFile(filename, csvText, 'text/csv;charset=utf-8');
}
