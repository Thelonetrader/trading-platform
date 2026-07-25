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
  onTestFmp,
  agentConfig,
  onSaveAgent,
  onAgentSetActiveProfile,
  onAgentUpdateProfile,
  onAgentAddProfile,
  onTestAgent,
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
  const [mdForm, setMdForm] = useState({ fmpApiKey: '', cacheTtlMinutes: 60 });
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [editingProfileId, setEditingProfileId] = useState('local-ollama');
  const [profileDraft, setProfileDraft] = useState({
    label: '',
    baseUrl: '',
    model: '',
    apiKey: '',
    maxTokens: 1024,
  });
  const [addTemplateId, setAddTemplateId] = useState('openai-byok');
  const [message, setMessage] = useState(null);
  const [includeBrokerExport, setIncludeBrokerExport] = useState(false);
  const [importMode, setImportMode] = useState('merge');
  const [importBroker, setImportBroker] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (settings?.ib) {
      setForm((f) => ({ ...f, ...settings.ib }));
    }
    if (settings?.marketData) {
      setMdForm((f) => ({ ...f, ...settings.marketData }));
    }
  }, [settings]);

  useEffect(() => {
    if (!agentConfig) return;
    setAgentEnabled(agentConfig.enabled !== false);
    const pid = agentConfig.activeProfileId || 'local-ollama';
    setEditingProfileId((prev) =>
      agentConfig.profiles?.some((p) => p.id === prev) ? prev : pid,
    );
  }, [agentConfig]);

  useEffect(() => {
    if (!agentConfig) return;
    const p = agentConfig.profiles?.find((x) => x.id === editingProfileId);
    if (!p) return;
    setProfileDraft({
      label: p.label || '',
      baseUrl: p.baseUrl || '',
      model: p.model || '',
      apiKey: '',
      maxTokens: p.maxTokens ?? 1024,
    });
  }, [agentConfig, editingProfileId]);

  const selectProfile = (profileId) => {
    setEditingProfileId(profileId);
    const p = agentConfig?.profiles?.find((x) => x.id === profileId);
    if (p) {
      setProfileDraft({
        label: p.label || '',
        baseUrl: p.baseUrl || '',
        model: p.model || '',
        apiKey: '',
        maxTokens: p.maxTokens ?? 1024,
      });
    }
  };

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
    await onSave({ ib: form, marketData: mdForm });
    setMessage('Settings saved.');
  };

  const connect = async () => {
    setMessage(null);
    try {
      await onSave({ ib: form, marketData: mdForm });
      await onConnect();
      setMessage('Connected to IB Gateway.');
    } catch (e) {
      setMessage(e.message || String(e));
    }
  };

  const testFmp = async () => {
    setMessage(null);
    try {
      await onSave({ ib: form, marketData: mdForm });
      const res = await onTestFmp?.();
      if (res?.ok) setMessage(`FMP connected (${res.sample || 'OK'})`);
      else setMessage(res?.error || 'FMP test failed');
    } catch (e) {
      setMessage(e.message || String(e));
    }
  };

  const saveAgent = async () => {
    setMessage(null);
    try {
      await onSaveAgent?.({ enabled: agentEnabled });
      const fields = {
        label: profileDraft.label.trim(),
        baseUrl: profileDraft.baseUrl.trim(),
        model: profileDraft.model.trim(),
        maxTokens: Number(profileDraft.maxTokens) || 1024,
      };
      if (profileDraft.apiKey?.trim()) fields.apiKey = profileDraft.apiKey.trim();
      await onAgentUpdateProfile?.(editingProfileId, fields);
      if (agentConfig?.activeProfileId !== editingProfileId) {
        await onAgentSetActiveProfile?.(editingProfileId);
      }
      setMessage('AI profile saved and set active.');
    } catch (e) {
      setMessage(e.message || String(e));
    }
  };

  const activateProfile = async (profileId) => {
    setMessage(null);
    try {
      await onAgentSetActiveProfile?.(profileId);
      selectProfile(profileId);
      setMessage('Active AI profile updated.');
    } catch (e) {
      setMessage(e.message || String(e));
    }
  };

  const addAgentProfile = async () => {
    setMessage(null);
    try {
      await onAgentAddProfile?.(addTemplateId);
      setMessage('Provider profile added — edit fields and Save.');
    } catch (e) {
      setMessage(e.message || String(e));
    }
  };

  const testAgent = async () => {
    setMessage(null);
    try {
      await onSaveAgent?.({ enabled: true });
      const fields = {
        baseUrl: profileDraft.baseUrl.trim(),
        model: profileDraft.model.trim(),
        maxTokens: Number(profileDraft.maxTokens) || 1024,
      };
      if (profileDraft.apiKey?.trim()) fields.apiKey = profileDraft.apiKey.trim();
      await onAgentUpdateProfile?.(editingProfileId, fields);
      await onAgentSetActiveProfile?.(editingProfileId);
      const res = await onTestAgent?.();
      if (res?.ok) {
        setMessage(
          res.warning ||
            `LLM OK · ${res.profileLabel || 'profile'} (${res.sample || 'connected'})`,
        );
      } else {
        setMessage(res?.error || 'LLM test failed');
      }
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
        await onSave({ ib: broker, marketData: mdForm });
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
      {!(mdForm.fmpApiKey || '').trim() && (
        <div
          style={{
            marginBottom: 20,
            padding: 14,
            borderRadius: 10,
            background: '#6366f114',
            border: '1px solid #6366f140',
            fontSize: 13,
            color: '#cbd5e1',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: '#818cf8' }}>FMP API key</strong> — scroll to{' '}
          <strong style={{ color: '#f1f5f9' }}>Market data (Phase 2)</strong> below, paste your key, then click{' '}
          <strong style={{ color: '#f1f5f9' }}>Save market data</strong> and <strong style={{ color: '#f1f5f9' }}>Test FMP</strong>.
          Use the Electron app (<code style={{ fontSize: 12 }}>npm run electron:dev</code>), not browser-only{' '}
          <code style={{ fontSize: 12 }}>npm start</code>.
        </div>
      )}
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
        Market data type (Save while connected re-subscribes quotes)
        <select
          value={form.marketDataType ?? 3}
          onChange={(e) => setForm((f) => ({ ...f, marketDataType: Number(e.target.value) }))}
          style={fieldStyle}
        >
          <option value={3}>Delayed — default for paper / no live subscription</option>
          <option value={4}>Delayed frozen — when market closed</option>
          <option value={1}>Live — requires IB market data subscription</option>
        </select>
        <span style={{ display: 'block', marginTop: 6, color: '#475569', lineHeight: 1.45 }}>
          After switching to Delayed, click <strong style={{ color: '#94a3b8' }}>Save</strong> (or Disconnect →
          Connect). Orange “additional subscription” text is for live feeds; delayed quotes may take ~15 minutes
          after the open.
        </span>
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
          AI assistant
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>Research agent · provider profiles</div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
          Start free with <strong style={{ color: '#94a3b8' }}>Ollama</strong> (local). Add OpenAI, Groq, or any compatible API
          when you want stronger models — pay providers directly (BYOK). A future <strong style={{ color: '#94a3b8' }}>Pro</strong>{' '}
          plan can unlock hosted models without pasting keys.
        </p>
        <div style={{ marginTop: 12, fontSize: 12, color: '#475569' }}>
          App plan:{' '}
          <strong style={{ color: '#94a3b8' }}>
            {agentConfig?.subscriptionPlans?.find((p) => p.id === agentConfig?.subscription?.plan)?.label ||
              'Free'}
          </strong>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 12, fontSize: 13, color: '#94a3b8' }}>
          <input
            type="checkbox"
            checked={agentEnabled !== false}
            onChange={(e) => setAgentEnabled(e.target.checked)}
          />
          Enable AI assistant on Terminal
        </label>

        <label style={{ display: 'block', marginBottom: 8, fontSize: 11, color: '#64748b' }}>
          Active provider profile
          <select
            value={editingProfileId}
            onChange={(e) => selectProfile(e.target.value)}
            style={fieldStyle}
          >
            {(agentConfig?.profiles || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.tier === 'free' ? 'Free' : p.tier === 'byok' ? 'BYOK' : p.tier})
                {p.id === agentConfig?.activeProfileId ? ' · active' : ''}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button
            type="button"
            style={btnSecondary}
            disabled={editingProfileId === agentConfig?.activeProfileId}
            onClick={() => activateProfile(editingProfileId)}
          >
            Use this profile
          </button>
          <select
            value={addTemplateId}
            onChange={(e) => setAddTemplateId(e.target.value)}
            style={{ ...fieldStyle, flex: 1, minWidth: 160 }}
          >
            {(agentConfig?.providerTemplates || []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button type="button" style={btnSecondary} onClick={addAgentProfile}>
            Add profile
          </button>
        </div>

        {agentConfig?.profiles?.find((p) => p.id === editingProfileId)?.description && (
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 12 }}>
            {agentConfig.profiles.find((p) => p.id === editingProfileId).description}
          </p>
        )}

        <label style={{ display: 'block', marginBottom: 12, fontSize: 11, color: '#64748b' }}>
          Display name
          <input
            value={profileDraft.label || ''}
            onChange={(e) => setProfileDraft((f) => ({ ...f, label: e.target.value }))}
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 11, color: '#64748b' }}>
          API base URL (OpenAI-compatible /v1)
          <input
            value={profileDraft.baseUrl || ''}
            onChange={(e) => setProfileDraft((f) => ({ ...f, baseUrl: e.target.value }))}
            placeholder="http://127.0.0.1:11434/v1"
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 11, color: '#64748b' }}>
          Model name
          <input
            value={profileDraft.model || ''}
            onChange={(e) => setProfileDraft((f) => ({ ...f, model: e.target.value }))}
            placeholder="llama3.2"
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12, fontSize: 11, color: '#64748b' }}>
          API key (optional for Ollama)
          <input
            type="password"
            autoComplete="off"
            value={profileDraft.apiKey || ''}
            onChange={(e) => setProfileDraft((f) => ({ ...f, apiKey: e.target.value }))}
            placeholder={
              agentConfig?.profiles?.find((p) => p.id === editingProfileId)?.hasApiKey
                ? 'Saved — enter to replace'
                : 'Leave blank for Ollama'
            }
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 16, fontSize: 11, color: '#64748b' }}>
          Max tokens per reply
          <input
            type="number"
            min={256}
            max={8192}
            value={profileDraft.maxTokens ?? 1024}
            onChange={(e) => setProfileDraft((f) => ({ ...f, maxTokens: Number(e.target.value) || 1024 }))}
            style={fieldStyle}
          />
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={saveAgent} style={btnSecondary}>
            Save profile
          </button>
          <button type="button" onClick={testAgent} style={btnSecondary}>
            Test active profile
          </button>
        </div>
      </div>

      <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid #1a2035' }}>
        <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          Market data (Phase 2)
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>Financial Modeling Prep</div>
        <p style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>
          Powers scorecard auto-fill (without IB Reuters), News & sentiment, and earnings dates. Key stays in local
          Electron storage — not included in research backup export.
        </p>
        <label style={{ display: 'block', marginTop: 16, marginBottom: 12, fontSize: 11, color: '#64748b' }}>
          FMP API key
          <input
            type="password"
            autoComplete="off"
            value={mdForm.fmpApiKey || ''}
            onChange={(e) => setMdForm((f) => ({ ...f, fmpApiKey: e.target.value.trim() }))}
            placeholder="From financialmodelingprep.com/developer"
            style={fieldStyle}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 16, fontSize: 11, color: '#64748b' }}>
          Cache TTL (minutes)
          <input
            type="number"
            min={5}
            max={1440}
            value={mdForm.cacheTtlMinutes ?? 60}
            onChange={(e) => setMdForm((f) => ({ ...f, cacheTtlMinutes: Number(e.target.value) || 60 }))}
            style={fieldStyle}
          />
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={save} style={btnSecondary}>
            Save market data
          </button>
          <button type="button" onClick={testFmp} style={btnSecondary}>
            Test FMP
          </button>
        </div>
      </div>

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
