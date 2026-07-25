const { getStore } = require('../store');
const { LlmClient } = require('./llmClient');
const { createMarketDataService } = require('./marketDataService');
const {
  AGENT_DEFAULTS,
  normalizeAgentConfig,
  resolveActiveRuntime,
  sanitizeConfigForRenderer,
  applyProfilePatch,
  addProfileFromTemplate,
} = require('./agentConfig');

function buildSystemPrompt(context = {}) {
  const lines = [
    'You are a research assistant inside a local-first trading terminal (Electron app).',
    'You help interpret watchlist notes, scorecards, quotes, and fundamentals — not a broker.',
    'Never claim to execute trades. Say when data is missing or stale.',
    'Not financial advice; user must verify numbers and do their own diligence.',
    '',
    'App context (may be incomplete):',
  ];

  if (context.symbol) lines.push(`Active symbol: ${context.symbol}`);
  if (context.listing) lines.push(`Listing: ${context.listing}`);
  if (context.quoteSummary) lines.push(`Quote: ${context.quoteSummary}`);
  if (context.watchlistNotes) lines.push(`Watchlist notes: ${context.watchlistNotes}`);
  if (context.scorecardSummary) lines.push(`Scorecard: ${context.scorecardSummary}`);
  if (context.metricsBlock) lines.push(`Key metrics:\n${context.metricsBlock}`);
  if (context.newsHeadlines) lines.push(`Recent headlines:\n${context.newsHeadlines}`);
  if (context.ibStatus) lines.push(`IB connection: ${context.ibStatus}`);

  lines.push('');
  lines.push('Be concise. Use bullet points for metrics. Cite which field you used when quoting numbers.');
  return lines.join('\n');
}

function formatMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object') return '';
  const pick = [
    'forwardPE',
    'pegRatio',
    'epsGrowth',
    'revenueGrowth',
    'fcfYield',
    'debtToEquity',
    'roe',
    'marketCap',
  ];
  const rows = [];
  for (const k of pick) {
    if (metrics[k] != null && metrics[k] !== '') {
      rows.push(`- ${k}: ${metrics[k]}`);
    }
  }
  return rows.join('\n');
}

function createAgentService() {
  let configCache = normalizeAgentConfig(AGENT_DEFAULTS);
  const marketData = createMarketDataService();

  async function refreshConfig() {
    const store = await getStore();
    configCache = normalizeAgentConfig({ ...AGENT_DEFAULTS, ...(store.get('agent') || {}) });
    await marketData.refreshConfig();
    return configCache;
  }

  async function persistConfig(next) {
    const store = await getStore();
    configCache = normalizeAgentConfig(next);
    store.set('agent', configCache);
    return configCache;
  }

  const llm = new LlmClient(() => resolveActiveRuntime(configCache));

  return {
    readConfig: async () => {
      await refreshConfig();
      return sanitizeConfigForRenderer(configCache);
    },

    writeConfig: async (patch) => {
      await refreshConfig();
      const merged = normalizeAgentConfig({ ...configCache, ...(patch || {}) });
      await persistConfig(merged);
      return sanitizeConfigForRenderer(configCache);
    },

    setActiveProfile: async (profileId) => {
      await refreshConfig();
      await persistConfig({ ...configCache, activeProfileId: profileId });
      return sanitizeConfigForRenderer(configCache);
    },

    updateProfile: async (profileId, fields) => {
      await refreshConfig();
      const next = applyProfilePatch(configCache, profileId, fields);
      await persistConfig(next);
      return sanitizeConfigForRenderer(configCache);
    },

    addProfile: async (templateId) => {
      await refreshConfig();
      const next = addProfileFromTemplate(configCache, templateId);
      await persistConfig(next);
      return sanitizeConfigForRenderer(configCache);
    },

    refreshConfig,

    testConnection: async () => {
      await refreshConfig();
      if (!configCache.enabled) {
        return { ok: false, error: 'Enable the agent in Settings first' };
      }
      const runtime = resolveActiveRuntime(configCache);
      if (runtime.error) {
        return { ok: false, error: runtime.error };
      }
      const result = await llm.testConnection();
      return {
        ...result,
        profileId: runtime.profileId,
        profileLabel: runtime.profileLabel,
        plan: runtime.plan,
      };
    },

    chat: async ({ messages, context }) => {
      await refreshConfig();
      if (!configCache.enabled) {
        return { error: 'Agent is disabled in Settings → AI assistant' };
      }
      if (!Array.isArray(messages) || !messages.length) {
        return { error: 'No messages' };
      }

      const runtime = resolveActiveRuntime(configCache);
      if (runtime.error) {
        return { error: runtime.error };
      }

      const enriched = { ...(context || {}) };
      const symbol = (context?.symbol || '').trim().toUpperCase();

      if (symbol && !enriched.metricsBlock) {
        try {
          const fund = await marketData.getFundamentals({ ticker: symbol });
          if (fund?.metrics) {
            enriched.metricsBlock = formatMetrics(fund.metrics);
          }
          if (fund?.profile?.companyName && !enriched.listing) {
            enriched.listing = fund.profile.companyName;
          }
        } catch {
          /* optional FMP */
        }
      }

      if (symbol && !enriched.newsHeadlines) {
        try {
          const news = await marketData.getNews({ tickers: [symbol], limit: 5 });
          const items = news?.items || [];
          if (Array.isArray(items) && items.length) {
            enriched.newsHeadlines = items
              .slice(0, 5)
              .map((n) => `- ${n.title || n.headline || ''}`.trim())
              .filter(Boolean)
              .join('\n');
          }
        } catch {
          /* optional */
        }
      }

      const system = buildSystemPrompt(enriched);
      try {
        const reply = await llm.chat({ messages, system });
        return {
          content: reply.content,
          model: reply.model,
          profileId: runtime.profileId,
          profileLabel: runtime.profileLabel,
          plan: runtime.plan,
        };
      } catch (e) {
        return {
          error: e.message || 'LLM request failed — check Settings → AI assistant profile.',
        };
      }
    },
  };
}

module.exports = { createAgentService, buildSystemPrompt };
