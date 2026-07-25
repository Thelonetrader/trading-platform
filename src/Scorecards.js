import React, { useEffect, useState } from 'react';
import {
  SECTORS,
  calcAvg,
  defaultValues,
  getBand,
  getRating,
  getRatingColor,
  getScore,
} from './scorecards/model';
import { getScorecardEval, upsertScorecardEval } from './scorecards/storage';
import { RESEARCH_DATA_IMPORTED_EVENT } from './utils/dataBackup';


const Pip = ({ filled, color }) => (
  <div style={{ width: 12, height: 12, borderRadius: 2, background: filled ? color : "#1e293b", transition: "background 0.2s", flexShrink: 0 }} />
);

const ScorePips = ({ score, color }) => (
  <div style={{ display: "flex", gap: 3 }}>
    {[1,2,3,4,5].map(i => <Pip key={i} filled={i <= score} color={color} />)}
  </div>
);

const MetricInput = ({ metric, value, onChange, accent }) => {
  const band = getBand(metric, value);
  const score = getScore(metric, value);
  const bandColor = band?.color || accent;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {metric.type === "select" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {metric.options.map(opt => (
            <button key={opt.value} onClick={() => onChange(opt.value)} style={{
              padding: "4px 8px", borderRadius: 5, textAlign: "left",
              border: `1px solid ${value === opt.value ? opt.color : "#1a2035"}`,
              background: value === opt.value ? `${opt.color}18` : "transparent",
              color: value === opt.value ? opt.color : "#334155",
              fontSize: 11, cursor: "pointer", fontWeight: value === opt.value ? 600 : 400,
            }}>{opt.label}</button>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: bandColor, marginBottom: 4 }}>{value}{metric.unit}</div>
          <input type="range" min={metric.min} max={metric.max} step={metric.step} value={value}
            onChange={e => onChange(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: accent, cursor: "pointer", margin: "4px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155" }}>
            <span>{metric.min}{metric.unit}</span><span>{metric.max}{metric.unit}</span>
          </div>
        </div>
      )}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <ScorePips score={score} color={bandColor} />
        {band && <span style={{ fontSize: 10, color: bandColor }}>{band.label}</span>}
      </div>
    </div>
  );
};

export default function Scorecards({ focusTicker = '', focusSector = '', onOpenLibrary }) {
  const [activeSector, setActiveSector] = useState(
    focusSector && SECTORS[focusSector] ? focusSector : 'tech',
  );
  const [compareMode, setCompareMode] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [allValuesA, setAllValuesA] = useState({
    tech: defaultValues(SECTORS.tech.metrics),
    energy: defaultValues(SECTORS.energy.metrics),
    financial: defaultValues(SECTORS.financial.metrics),
  });
  const [allValuesB, setAllValuesB] = useState({
    tech: defaultValues(SECTORS.tech.metrics),
    energy: defaultValues(SECTORS.energy.metrics),
    financial: defaultValues(SECTORS.financial.metrics),
  });
  const [stockNameA, setStockNameA] = useState({ tech: "", energy: "", financial: "" });
  const [stockNameB, setStockNameB] = useState({ tech: "", energy: "", financial: "" });

  const sector = SECTORS[activeSector];
  const valuesA = allValuesA[activeSector];
  const valuesB = allValuesB[activeSector];
  const nameA = stockNameA[activeSector];
  const nameB = stockNameB[activeSector];

  const scoresA = sector.metrics.map(m => getScore(m, valuesA[m.id]));
  const scoresB = sector.metrics.map(m => getScore(m, valuesB[m.id]));
  const avgA = scoresA.reduce((a, b) => a + b, 0) / scoresA.length;
  const avgB = scoresB.reduce((a, b) => a + b, 0) / scoresB.length;
  const ratingA = getRating(avgA);
  const ratingB = getRating(avgB);
  const colorA = getRatingColor(avgA, sector.accent);
  const colorB = getRatingColor(avgB, "#e879f9");
  const winner = compareMode ? avgA > avgB ? "a" : avgB > avgA ? "b" : "tie" : null;

  const setValueA = (id, val) => setAllValuesA(prev => ({ ...prev, [activeSector]: { ...prev[activeSector], [id]: val } }));
  const setValueB = (id, val) => setAllValuesB(prev => ({ ...prev, [activeSector]: { ...prev[activeSector], [id]: val } }));

  useEffect(() => {
    if (!focusTicker) return;
    const sectorId = focusSector && SECTORS[focusSector] ? focusSector : activeSector;
    if (focusSector && SECTORS[focusSector]) setActiveSector(focusSector);
    const ticker = focusTicker.trim().toUpperCase();
    setStockNameA((prev) => ({ ...prev, [sectorId]: ticker }));
    const saved = getScorecardEval(ticker, sectorId);
    if (saved?.values) {
      setAllValuesA((prev) => ({ ...prev, [sectorId]: saved.values }));
    }
  }, [focusTicker, focusSector]); // eslint-disable-line react-hooks/exhaustive-deps -- load once per navigation focus

  const handleSaveEval = () => {
    const ticker = (nameA || focusTicker || '').trim();
    if (!ticker) {
      setSaveMsg('Enter a ticker to save to research library');
      return;
    }
    upsertScorecardEval({
      ticker,
      sectorId: activeSector,
      values: valuesA,
      displayName: nameA || ticker,
    });
    setSaveMsg(`Saved ${ticker.toUpperCase()} (${ratingA.short}) for screener`);
    window.dispatchEvent(new Event(RESEARCH_DATA_IMPORTED_EVENT));
    setTimeout(() => setSaveMsg(''), 3500);
  };

  const inputStyle = { background: "#0a0f1e", border: "1px solid #1a2035", borderRadius: 8, color: "#f8fafc", fontSize: 14, padding: "8px 12px", width: "100%", outline: "none", boxSizing: "border-box", fontWeight: 500 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Fundamental Analysis</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>Sector Scorecards</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {saveMsg && (
            <span style={{ fontSize: 12, color: '#22c55e', maxWidth: 220 }}>{saveMsg}</span>
          )}
          <button
            type="button"
            onClick={handleSaveEval}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid #6366f1',
              background: '#6366f115',
              color: '#818cf8',
            }}
          >
            Save to library
          </button>
          {onOpenLibrary && (
            <button
              type="button"
              onClick={onOpenLibrary}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid #1a2035',
                background: '#0a0f1e',
                color: '#94a3b8',
              }}
            >
              Library
            </button>
          )}
          <button onClick={() => setCompareMode(m => !m)} style={{
            padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            border: `1px solid ${compareMode ? "#e879f9" : "#1a2035"}`,
            background: compareMode ? "#e879f915" : "#0a0f1e",
            color: compareMode ? "#e879f9" : "#475569",
          }}>
            {compareMode ? "⇄ Exit Compare" : "⇄ Compare Two Stocks"}
          </button>
        </div>
      </div>

      {/* Sector Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {Object.values(SECTORS).map(s => {
          const isActive = activeSector === s.id;
          const sAvg = calcAvg(s.metrics, allValuesA[s.id]);
          const sRating = getRating(sAvg);
          return (
            <button key={s.id} onClick={() => setActiveSector(s.id)} style={{
              padding: "9px 14px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${isActive ? s.accent : "#1a2035"}`,
              background: isActive ? `${s.accent}15` : "#0a0f1e",
              color: isActive ? s.accent : "#475569",
              fontSize: 13, fontWeight: isActive ? 700 : 400,
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <span>{s.icon}</span>
              <span>{s.label}</span>
              {stockNameA[s.id] && (
                <span style={{ fontSize: 10, background: `${getRatingColor(sAvg, s.accent)}20`, color: getRatingColor(sAvg, s.accent), padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                  {sRating.short}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tagline */}
      <div style={{ fontSize: 12, color: sector.accent, opacity: 0.7, marginBottom: 20, borderLeft: `2px solid ${sector.accent}40`, paddingLeft: 10 }}>
        {sector.tagline}
      </div>

      {/* Stock Name Inputs */}
      <div style={{ display: "grid", gridTemplateColumns: compareMode ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 20 }}>
        <div>
          {compareMode && <div style={{ fontSize: 10, color: sector.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, fontWeight: 700 }}>Stock A</div>}
          <input value={nameA} onChange={e => setStockNameA(prev => ({ ...prev, [activeSector]: e.target.value }))}
            placeholder={compareMode ? "Stock A name / ticker" : `Stock name / ticker (${sector.label})`}
            style={inputStyle} />
        </div>
        {compareMode && (
          <div>
            <div style={{ fontSize: 10, color: "#e879f9", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5, fontWeight: 700 }}>Stock B</div>
            <input value={nameB} onChange={e => setStockNameB(prev => ({ ...prev, [activeSector]: e.target.value }))}
              placeholder="Stock B name / ticker" style={{ ...inputStyle, border: "1px solid #e879f950" }} />
          </div>
        )}
      </div>

      {/* Metrics */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        {sector.metrics.map((metric, i) => {
          const scoreA = getScore(metric, valuesA[metric.id]);
          const scoreB = getScore(metric, valuesB[metric.id]);
          const metricWinner = compareMode ? scoreA > scoreB ? "A" : scoreB > scoreA ? "B" : null : null;
          return (
            <div key={metric.id} style={{ background: "#0a0f1e", border: "1px solid #1a2035", borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{metric.label}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{metric.description}</div>
                {metric.note && <div style={{ fontSize: 10, color: "#334155", marginTop: 3, fontStyle: "italic" }}>ℹ {metric.note}</div>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: compareMode ? "1fr 1fr" : "1fr", gap: 16 }}>
                <MetricInput metric={metric} value={valuesA[metric.id]} onChange={val => setValueA(metric.id, val)} accent={sector.accent} />
                {compareMode && (
                  <div style={{ borderLeft: "1px solid #1a2035", paddingLeft: 16 }}>
                    <MetricInput metric={metric} value={valuesB[metric.id]} onChange={val => setValueB(metric.id, val)} accent="#e879f9" />
                  </div>
                )}
              </div>
              {compareMode && (
                <div style={{ marginTop: 10, fontSize: 11, color: metricWinner === "A" ? sector.accent : metricWinner === "B" ? "#e879f9" : "#334155", fontWeight: 600 }}>
                  {metricWinner ? `▲ ${metricWinner === "A" ? (nameA || "Stock A") : (nameB || "Stock B")} wins this metric` : "— Tied on this metric"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rating Panel */}
      {compareMode ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[{ name: nameA || "Stock A", avg: avgA, rating: ratingA, color: colorA, accent: sector.accent },
              { name: nameB || "Stock B", avg: avgB, rating: ratingB, color: colorB, accent: "#e879f9" }].map((s, i) => (
              <div key={i} style={{ background: `${s.accent}08`, border: `1px solid ${s.accent}25`, borderRadius: 12, padding: "20px 18px" }}>
                <div style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: s.color, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.rating.label}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>Score: <span style={{ color: s.color, fontWeight: 700 }}>{s.avg.toFixed(2)} / 5.00</span></div>
                <div style={{ marginTop: 14, height: 5, background: "#1a2035", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(s.avg / 5) * 100}%`, background: `linear-gradient(90deg, ${s.accent}40, ${s.color})`, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{
            background: winner === "tie" ? "#1a2035" : winner === "a" ? `${sector.accent}12` : "#e879f912",
            border: `1px solid ${winner === "tie" ? "#334155" : winner === "a" ? sector.accent + "40" : "#e879f940"}`,
            borderRadius: 12, padding: "18px 20px", textAlign: "center",
          }}>
            {winner === "tie" ? (
              <div style={{ fontSize: 18, fontWeight: 700, color: "#475569" }}>— Tied —</div>
            ) : (
              <>
                <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>Stronger Pick</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: winner === "a" ? sector.accent : "#e879f9", letterSpacing: "-0.02em" }}>
                  {winner === "a" ? (nameA || "Stock A") : (nameB || "Stock B")}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                  Leads by <span style={{ color: winner === "a" ? sector.accent : "#e879f9", fontWeight: 700 }}>{Math.abs(avgA - avgB).toFixed(2)} points</span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: `${sector.accent}08`, border: `1px solid ${sector.accent}25`, borderRadius: 14, padding: "24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 5 }}>
                {nameA || "Stock"} — {sector.label} Rating
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: colorA, letterSpacing: "-0.03em", lineHeight: 1 }}>{ratingA.label}</div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 5 }}>
                Composite score: <span style={{ color: colorA, fontWeight: 700 }}>{avgA.toFixed(2)} / 5.00</span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {sector.metrics.map((m) => {
                const score = getScore(m, valuesA[m.id]);
                const band = getBand(m, valuesA[m.id]);
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, color: "#475569", width: 130, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.label}</div>
                    <ScorePips score={score} color={band?.color || sector.accent} />
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <div style={{ height: 5, background: "#1a2035", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(avgA / 5) * 100}%`, background: `linear-gradient(90deg, ${sector.accentDim}, ${colorA})`, borderRadius: 3, transition: "width 0.4s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#334155", marginTop: 4 }}>
              <span>Strong Sell</span><span>Sell</span><span>Hold</span><span>Buy</span><span>Strong Buy</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}