import React, { useEffect, useRef, useState } from 'react';
import {
  applyResearchImport,
  buildExportPayload,
  downloadBackupFile,
  readBackupFile,
  summarizeBackup,
} from '../utils/dataBackup';

const PORT_PRESETS = {
  paper: { gateway: 4002, tws: 7497 },
  live: { gateway: 4001, tws: 7496 },
};

export default function Settings({
  settings,
  connection,
  onSave,
  onConnect,
  onDisconnect,
  onDataImported,
}) {
  const [form, setForm] = useState({
    host: '127.0.0.1',
    port: 4002,
    clientId: 1,
    mode: 'paper',
    accountId: '',
    useTws: false,
    marketDataType: 3,
  });
  const [message, setMessage] = useState(null);
  const [includeBrokerExport, setIncludeBrokerExport] = useState(false);
  const [importMode, setImportMode] = useState('merge');
  const [importBroker, setImportBroker] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings?.ib) {
      setForm((f) => ({ ...f, ...settings.ib }));
    }
  }, [settings]);

  const setMode = (mode) => {
    const ports = PORT_PRESETS[mode];
    setForm((f) => ({
      ...f,
      mode,
      port: f.useTws ? ports.tws : ports.gateway,
    }));
  };

  const save = async () => {
    setMessage(null);
    await onSave(form);
    setMessage('Settings saved.');
  };

  const connect = async () => {
    setMessage(null);
    try {
      await onSave(form);
      await onConnect();
      setMessage('Connected to IB Gateway.');
    } catch (e) {
      setMessage(e.message || String(e));
    }
  };

  const exportData = () => {
    setMessage(null);
    try {
      const payload = buildExportPayload({
        includeBroker: includeBrokerExport,
        brokerSettings: form,
      });
      downloadBackupFile(payload);
      setMessage('Backup downloaded.');
    } catch (e) {
      setMessage(e.message || String(e));
    }
  };

  const pickImportFile = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setMessage(null);
    try {
      const payload = await readBackupFile(file);
      const summary = summarizeBackup(payload);

      const modeLabel = importMode === 'replace' ? 'replace all local research data' : 'merge with existing data';
      const ok = window.confirm(
        `Import backup from ${summary.exportedAt || 'unknown date'}?\n\n` +
          `Watchlist: ${summary.counts.watchlist}\n` +
          `Journal: ${summary.counts.trades}\n` +
          `Portfolio: ${summary.counts.portfolio}\n` +
          `Scorecards: ${summary.counts.scorecardEvals}\n` +
          `Screener presets: ${summary.counts.screenerPresets}\n\n` +
          `Mode: ${modeLabel}.`,
      );
      if (!ok) return;

      const { broker } = applyResearchImport(payload, importMode);

      if (importBroker && broker) {
        await onSave(broker);
        setForm((f) => ({ ...f, ...broker }));
      }

      if (onDataImported) onDataImported();

      setMessage(
        importBroker && broker
          ? 'Research data imported. Broker settings updated.'
          : 'Research data imported.',
      );
    } catch (err) {
      setMessage(err.message || String(err));
    }
  };

  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Broker connection
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc' }}>Interactive Brokers</div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
          Run IB Gateway or TWS locally with API enabled. Trusted IP: 127.0.0.1. Login happens in Gateway, not here.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['paper', 'live'].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: form.mode === m ? '1px solid #6366f1' : '1px solid #1a2035',
              background: form.mode === m ? '#1a2035' : 'transparent',
              color: form.mode === m ? '#f1f5f9' : '#64748b',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {[
        ['host', 'Host'],
        ['port', 'Port', 'number'],
        ['clientId', 'Client ID', 'number'],
        ['accountId', 'Account ID (optional)'],
      ].map(([key, label, type]) => (
        <label key={key} style={{ display: 'block', marginBottom: 12, fontSize: 11, color: '#64748b' }}>
          {label}
          <input
            type={type || 'text'}
            value={form[key]}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                [key]: type === 'number' ? Number(e.target.value) : e.target.value,
              }))
            }
            style={fieldStyle}
          />
        </label>
      ))}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
        <input
          type="checkbox"
          checked={form.useTws}
          onChange={(e) => {
            const useTws = e.target.checked;
            const ports = PORT_PRESETS[form.mode];
            setForm((f) => ({ ...f, useTws, port: useTws ? ports.tws : ports.gateway }));
          }}
        />
        Use TWS ports instead of Gateway
      </label>

      <label style={{ display: 'block', marginBottom: 16, fontSize: 11, color: '#64748b' }}>
        Market data type (reconnect after change)
        <select
          value={form.marketDataType ?? 3}
          onChange={(e) => setForm((f) => ({ ...f, marketDataType: Number(e.target.value) }))}
          style={fieldStyle}
        >
          <option value={3}>Delayed — default for paper / no live subscription</option>
          <option value={4}>Delayed frozen — when market closed</option>
          <option value={1}>Live — requires IB market data subscription</option>
        </select>
      </label>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={save} style={btnSecondary}>
          Save
        </button>
        <button type="button" onClick={connect} style={btnPrimary}>
          Connect
        </button>
        <button type="button" onClick={onDisconnect} style={btnSecondary}>
          Disconnect
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: '#475569' }}>
        Status: <strong style={{ color: connection.status === 'connected' ? '#22c55e' : '#94a3b8' }}>{connection.status}</strong>
      </div>
      {message && <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>{message}</div>}
      {form.mode === 'live' && (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#450a0a', color: '#fecaca', fontSize: 12 }}>
          Live mode sends real orders. Double-check port and account before connecting.
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid #1a2035' }}>
        <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Data backup
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>Export / import</div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
          Save watchlist, journal, portfolio, scorecard library, and screener presets to a JSON file. Import on this
          machine or another install.
        </p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 12, fontSize: 13, color: '#94a3b8' }}>
          <input
            type="checkbox"
            checked={includeBrokerExport}
            onChange={(e) => setIncludeBrokerExport(e.target.checked)}
          />
          Include IB connection settings in export
        </label>

        <button type="button" onClick={exportData} style={btnPrimary}>
          Download backup
        </button>

        <div style={{ marginTop: 24, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Import
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'merge'}
                onChange={() => setImportMode('merge')}
              />
              Merge (keep existing; incoming wins on same id)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
              />
              Replace (overwrite local research data)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8' }}>
              <input
                type="checkbox"
                checked={importBroker}
                onChange={(e) => setImportBroker(e.target.checked)}
              />
              Apply broker settings from file if present
            </label>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleImportFile} />
          <button type="button" onClick={pickImportFile} style={btnSecondary}>
            Choose backup file…
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldStyle = {
  display: 'block',
  width: '100%',
  marginTop: 4,
  background: '#060b16',
  border: '1px solid #1a2035',
  borderRadius: 8,
  color: '#f1f5f9',
  fontSize: 13,
  padding: '8px 10px',
  boxSizing: 'border-box',
};

const btnPrimary = {
  padding: '10px 18px',
  background: '#6366f1',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary = {
  padding: '10px 18px',
  background: 'transparent',
  border: '1px solid #1a2035',
  borderRadius: 8,
  color: '#94a3b8',
  cursor: 'pointer',
};
