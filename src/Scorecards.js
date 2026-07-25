import React, { useState } from 'react';

const SECTORS = {
  tech: {
    id: "tech", label: "Tech Growth", accent: "#6366f1", accentDim: "#312e81", icon: "◈",
    tagline: "Revenue momentum, margin expansion, runway",
    metrics: [
      { id: "revenueGrowth", label: "Revenue Growth (YoY)", description: "Year-on-year top-line growth rate", unit: "%", min: -10, max: 100, step: 0.5, score: v => v >= 40 ? 5 : v >= 25 ? 4 : v >= 15 ? 3 : v >= 5 ? 2 : 1, bands: [{ label: "Hyper-growth", min: 40, color: "#6366f1" }, { label: "Strong", min: 25, color: "#818cf8" }, { label: "Healthy", min: 15, color: "#fbbf24" }, { label: "Slowing", min: 5, color: "#f97316" }, { label: "Stalled", min: -10, color: "#ef4444" }] },
      { id: "grossMargin", label: "Gross Margin", description: "Higher = more scalable business model", unit: "%", min: 0, max: 100, step: 0.5, score: v => v >= 70 ? 5 : v >= 55 ? 4 : v >= 40 ? 3 : v >= 25 ? 2 : 1, bands: [{ label: "Software-like", min: 70, color: "#6366f1" }, { label: "Strong", min: 55, color: "#818cf8" }, { label: "Adequate", min: 40, color: "#fbbf24" }, { label: "Compressed", min: 25, color: "#f97316" }, { label: "Thin", min: 0, color: "#ef4444" }] },
      { id: "ruleof40", label: "Rule of 40", description: "Revenue growth % + profit margin %", unit: "", min: -20, max: 100, step: 1, score: v => v >= 60 ? 5 : v >= 40 ? 4 : v >= 25 ? 3 : v >= 10 ? 2 : 1, bands: [{ label: "Elite", min: 60, color: "#6366f1" }, { label: "Passes", min: 40, color: "#818cf8" }, { label: "Below bar", min: 25, color: "#fbbf24" }, { label: "Weak", min: 10, color: "#f97316" }, { label: "Failing", min: -20, color: "#ef4444" }] },
      { id: "cashRunway", label: "Cash Runway", description: "Months of cash at current burn rate", unit: " mo", min: 0, max: 60, step: 1, score: v => v >= 36 ? 5 : v >= 24 ? 4 : v >= 18 ? 3 : v >= 12 ? 2 : 1, bands: [{ label: "No risk", min: 36, color: "#6366f1" }, { label: "Comfortable", min: 24, color: "#818cf8" }, { label: "Manageable", min: 18, color: "#fbbf24" }, { label: "Watch closely", min: 12, color: "#f97316" }, { label: "Dilution risk", min: 0, color: "#ef4444" }], note: "Set to 60 if already profitable" },
      { id: "psRatio", label: "Price / Sales Ratio", description: "Valuation relative to revenue", unit: "x", min: 0, max: 40, step: 0.5, inverted: true, score: v => v <= 5 ? 5 : v <= 10 ? 4 : v <= 20 ? 3 : v <= 30 ? 2 : 1, bands: [{ label: "Cheap", max: 5, color: "#6366f1" }, { label: "Reasonable", max: 10, color: "#818cf8" }, { label: "Priced for growth", max: 20, color: "#fbbf24" }, { label: "Expensive", max: 30, color: "#f97316" }, { label: "Priced to perfection", max: 99, color: "#ef4444" }] },
      { id: "netRevenueRetention", label: "Net Revenue Retention", description: "% of recurring revenue retained + expanded", unit: "%", min: 60, max: 160, step: 1, score: v => v >= 130 ? 5 : v >= 115 ? 4 : v >= 100 ? 3 : v >= 90 ? 2 : 1, bands: [{ label: "Best-in-class", min: 130, color: "#6366f1" }, { label: "Strong", min: 115, color: "#818cf8" }, { label: "Holding", min: 100, color: "#fbbf24" }, { label: "Churning", min: 90, color: "#f97316" }, { label: "Declining base", min: 60, color: "#ef4444" }], note: "SaaS only. Set to 100 if not applicable." },
      { id: "insiderOwnership", label: "Insider Ownership", description: "% of shares held by founders / management", unit: "%", min: 0, max: 80, step: 0.5, score: v => v >= 20 ? 5 : v >= 10 ? 4 : v >= 5 ? 3 : v >= 2 ? 2 : 1, bands: [{ label: "Skin in game", min: 20, color: "#6366f1" }, { label: "Aligned", min: 10, color: "#818cf8" }, { label: "Moderate", min: 5, color: "#fbbf24" }, { label: "Low", min: 2, color: "#f97316" }, { label: "Negligible", min: 0, color: "#ef4444" }] },
    ],
  },
  energy: {
    id: "energy", label: "Energy & Commodities", accent: "#f59e0b", accentDim: "#78350f", icon: "⬡",
    tagline: "Cycle positioning, balance sheet, cost structure",
    metrics: [
      { id: "breakeven", label: "Production Breakeven", description: "Oil price ($/bbl) at cash flow neutral", unit: "$/bbl", min: 20, max: 80, step: 1, inverted: true, score: v => v <= 35 ? 5 : v <= 45 ? 4 : v <= 55 ? 3 : v <= 65 ? 2 : 1, bands: [{ label: "Very low cost", max: 35, color: "#f59e0b" }, { label: "Competitive", max: 45, color: "#fcd34d" }, { label: "Mid-cost", max: 55, color: "#fbbf24" }, { label: "High cost", max: 65, color: "#f97316" }, { label: "Vulnerable", max: 999, color: "#ef4444" }], note: "For renewables, set to 35" },
      { id: "netDebtEbitda", label: "Net Debt / EBITDA", description: "Low debt survives commodity downturns", unit: "x", min: 0, max: 6, step: 0.1, inverted: true, score: v => v <= 0.5 ? 5 : v <= 1.5 ? 4 : v <= 2.5 ? 3 : v <= 4 ? 2 : 1, bands: [{ label: "Net cash", max: 0.5, color: "#f59e0b" }, { label: "Conservative", max: 1.5, color: "#fcd34d" }, { label: "Manageable", max: 2.5, color: "#fbbf24" }, { label: "Stretched", max: 4, color: "#f97316" }, { label: "Cycle risk", max: 99, color: "#ef4444" }] },
      { id: "reserveLife", label: "Reserve Life Index", description: "Years of proven reserves at current production", unit: " yrs", min: 0, max: 30, step: 0.5, score: v => v >= 15 ? 5 : v >= 10 ? 4 : v >= 7 ? 3 : v >= 4 ? 2 : 1, bands: [{ label: "Long-life", min: 15, color: "#f59e0b" }, { label: "Solid", min: 10, color: "#fcd34d" }, { label: "Adequate", min: 7, color: "#fbbf24" }, { label: "Short", min: 4, color: "#f97316" }, { label: "Depleting", min: 0, color: "#ef4444" }], note: "For renewables, set to 20" },
      { id: "fcfYield", label: "FCF Yield", description: "Free cash flow as % of market cap", unit: "%", min: 0, max: 25, step: 0.5, score: v => v >= 12 ? 5 : v >= 8 ? 4 : v >= 5 ? 3 : v >= 2 ? 2 : 1, bands: [{ label: "Exceptional", min: 12, color: "#f59e0b" }, { label: "Strong", min: 8, color: "#fcd34d" }, { label: "Healthy", min: 5, color: "#fbbf24" }, { label: "Thin", min: 2, color: "#f97316" }, { label: "Weak", min: 0, color: "#ef4444" }] },
      { id: "dividendCover", label: "Dividend Coverage (at cycle lows)", description: "Can dividend survive commodity downturn?", type: "select", options: [{ label: "Covered even at $40/bbl", value: 5, color: "#f59e0b" }, { label: "Covered at $50/bbl", value: 4, color: "#fcd34d" }, { label: "Covered at $60/bbl", value: 3, color: "#fbbf24" }, { label: "Requires $70+/bbl", value: 2, color: "#f97316" }, { label: "Dividend at risk", value: 1, color: "#ef4444" }] },
      { id: "esgRisk", label: "Energy Transition Risk", description: "Exposure to stranded asset / regulatory risk", type: "select", options: [{ label: "Renewables-led / diversified", value: 5, color: "#f59e0b" }, { label: "Active transition strategy", value: 4, color: "#fcd34d" }, { label: "Mixed portfolio", value: 3, color: "#fbbf24" }, { label: "Fossil-heavy, limited pivot", value: 2, color: "#f97316" }, { label: "Pure-play coal / heavy oil", value: 1, color: "#ef4444" }] },
      { id: "roace", label: "ROACE", description: "Return on average capital employed", unit: "%", min: 0, max: 30, step: 0.5, score: v => v >= 18 ? 5 : v >= 12 ? 4 : v >= 8 ? 3 : v >= 4 ? 2 : 1, bands: [{ label: "Excellent", min: 18, color: "#f59e0b" }, { label: "Strong", min: 12, color: "#fcd34d" }, { label: "Adequate", min: 8, color: "#fbbf24" }, { label: "Poor", min: 4, color: "#f97316" }, { label: "Value destroyer", min: 0, color: "#ef4444" }] },
    ],
  },
  financial: {
    id: "financial", label: "Financial Services", accent: "#10b981", accentDim: "#064e3b", icon: "▣",
    tagline: "Capital strength, credit quality, earnings power",
    metrics: [
      { id: "tier1Capital", label: "CET1 / Tier 1 Capital Ratio", description: "Core capital as % of risk-weighted assets", unit: "%", min: 8, max: 20, step: 0.1, score: v => v >= 15 ? 5 : v >= 13 ? 4 : v >= 11 ? 3 : v >= 10 ? 2 : 1, bands: [{ label: "Very strong", min: 15, color: "#10b981" }, { label: "Solid", min: 13, color: "#34d399" }, { label: "Adequate", min: 11, color: "#fbbf24" }, { label: "Regulatory minimum", min: 10, color: "#f97316" }, { label: "Under pressure", min: 8, color: "#ef4444" }], note: "For insurers, use Solvency II ÷ 10" },
      { id: "roe", label: "Return on Equity (ROE)", description: "Profitability relative to shareholder equity", unit: "%", min: 0, max: 25, step: 0.5, score: v => v >= 15 ? 5 : v >= 12 ? 4 : v >= 9 ? 3 : v >= 6 ? 2 : 1, bands: [{ label: "Excellent", min: 15, color: "#10b981" }, { label: "Strong", min: 12, color: "#34d399" }, { label: "Acceptable", min: 9, color: "#fbbf24" }, { label: "Weak", min: 6, color: "#f97316" }, { label: "Value trap risk", min: 0, color: "#ef4444" }] },
      { id: "nim", label: "Net Interest Margin", description: "Spread between lending and borrowing rates", unit: "%", min: 0, max: 5, step: 0.05, score: v => v >= 3 ? 5 : v >= 2.5 ? 4 : v >= 2 ? 3 : v >= 1.5 ? 2 : 1, bands: [{ label: "Strong", min: 3, color: "#10b981" }, { label: "Healthy", min: 2.5, color: "#34d399" }, { label: "Adequate", min: 2, color: "#fbbf24" }, { label: "Compressed", min: 1.5, color: "#f97316" }, { label: "Under pressure", min: 0, color: "#ef4444" }], note: "For insurers/asset managers, set to 2.5" },
      { id: "nplRatio", label: "Non-Performing Loan Ratio", description: "% of loan book that is impaired", unit: "%", min: 0, max: 10, step: 0.1, inverted: true, score: v => v <= 1 ? 5 : v <= 2 ? 4 : v <= 3.5 ? 3 : v <= 5 ? 2 : 1, bands: [{ label: "Clean book", max: 1, color: "#10b981" }, { label: "Healthy", max: 2, color: "#34d399" }, { label: "Watch", max: 3.5, color: "#fbbf24" }, { label: "Elevated", max: 5, color: "#f97316" }, { label: "Stress", max: 99, color: "#ef4444" }] },
      { id: "efficiencyRatio", label: "Cost / Income Ratio", description: "Operating costs as % of income", unit: "%", min: 30, max: 90, step: 1, inverted: true, score: v => v <= 45 ? 5 : v <= 55 ? 4 : v <= 65 ? 3 : v <= 75 ? 2 : 1, bands: [{ label: "Lean", max: 45, color: "#10b981" }, { label: "Efficient", max: 55, color: "#34d399" }, { label: "Industry avg", max: 65, color: "#fbbf24" }, { label: "Bloated", max: 75, color: "#f97316" }, { label: "Restructuring needed", max: 999, color: "#ef4444" }] },
      { id: "pbRatio", label: "Price / Book Ratio", description: "Market value vs book value", unit: "x", min: 0, max: 3, step: 0.05, inverted: true, score: v => v <= 0.8 ? 5 : v <= 1.2 ? 4 : v <= 1.8 ? 3 : v <= 2.5 ? 2 : 1, bands: [{ label: "Deep value", max: 0.8, color: "#10b981" }, { label: "Fair value", max: 1.2, color: "#34d399" }, { label: "Slight premium", max: 1.8, color: "#fbbf24" }, { label: "Expensive", max: 2.5, color: "#f97316" }, { label: "Overvalued", max: 99, color: "#ef4444" }] },
      { id: "dividendCoverage", label: "Dividend Payout Ratio", description: "% of earnings paid as dividends", unit: "%", min: 0, max: 100, step: 1, inverted: true, score: v => v <= 40 ? 5 : v <= 55 ? 4 : v <= 70 ? 3 : v <= 85 ? 2 : 1, bands: [{ label: "Conservative", max: 40, color: "#10b981" }, { label: "Healthy", max: 55, color: "#34d399" }, { label: "Adequate", max: 70, color: "#fbbf24" }, { label: "Stretched", max: 85, color: "#f97316" }, { label: "Unsustainable", max: 999, color: "#ef4444" }] },
    ],
  },
};

const getRating = avg => {
  if (avg >= 4.5) return { label: "Strong Buy", short: "SB" };
  if (avg >= 3.5) return { label: "Buy", short: "B" };
  if (avg >= 2.5) return { label: "Hold", short: "H" };
  if (avg >= 1.5) return { label: "Sell", short: "S" };
  return { label: "Strong Sell", short: "SS" };
};

const getRatingColor = (avg, accent) => {
  if (avg >= 4.5) return accent;
  if (avg >= 3.5) return accent + "cc";
  if (avg >= 2.5) return "#fbbf24";
  if (avg >= 1.5) return "#f97316";
  return "#ef4444";
};

const getBand = (metric, value) => {
  if (metric.type === "select") return metric.options.find(o => o.value === value) || null;
  if (metric.inverted) {
    const sorted = [...metric.bands].sort((a, b) => (a.max ?? 99) - (b.max ?? 99));
    return sorted.find(b => value <= (b.max ?? 99)) || sorted[sorted.length - 1];
  }
  const sorted = [...metric.bands].sort((a, b) => b.min - a.min);
  return sorted.find(b => value >= b.min) || sorted[sorted.length - 1];
};

const getScore = (metric, value) => metric.type === "select" ? value : metric.score(value);
const defaultValues = metrics => Object.fromEntries(metrics.map(m => [m.id, m.type === "select" ? 3 : parseFloat(((m.max - m.min) / 2 + m.min).toFixed(1))]));
const calcAvg = (metrics, values) => { const scores = metrics.map(m => getScore(m, values[m.id])); return scores.reduce((a, b) => a + b, 0) / scores.length; };

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

export default function Scorecards() {
  const [activeSector, setActiveSector] = useState("tech");
  const [compareMode, setCompareMode] = useState(false);
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

  const inputStyle = { background: "#0a0f1e", border: "1px solid #1a2035", borderRadius: 8, color: "#f8fafc", fontSize: 14, padding: "8px 12px", width: "100%", outline: "none", boxSizing: "border-box", fontWeight: 500 };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 11, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Fundamental Analysis</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>Sector Scorecards</div>
        </div>
        <button onClick={() => setCompareMode(m => !m)} style={{
          padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
          border: `1px solid ${compareMode ? "#e879f9" : "#1a2035"}`,
          background: compareMode ? "#e879f915" : "#0a0f1e",
          color: compareMode ? "#e879f9" : "#475569",
        }}>
          {compareMode ? "⇄ Exit Compare" : "⇄ Compare Two Stocks"}
        </button>
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