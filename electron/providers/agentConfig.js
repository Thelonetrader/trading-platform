/**
 * Provider catalog + normalized agent config.
 * Billing/subscription enforcement can plug in via resolveEntitlements() later.
 */

const BUILTIN_PROFILES = [
  {
    id: 'local-ollama',
    label: 'Local · Ollama',
    tier: 'free',
    providerKind: 'ollama',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2',
    apiKey: '',
    maxTokens: 1024,
    builtin: true,
    description: 'Runs on your Mac — no API subscription.',
  },
  {
    id: 'openai-byok',
    label: 'OpenAI (your API key)',
    tier: 'byok',
    providerKind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKey: '',
    maxTokens: 2048,
    builtin: true,
    description: 'Bring your own OpenAI key — pay OpenAI directly.',
  },
  {
    id: 'groq-byok',
    label: 'Groq (your API key)',
    tier: 'byok',
    providerKind: 'openai_compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    apiKey: '',
    maxTokens: 2048,
    builtin: true,
    description: 'Fast hosted models — often has a free tier at Groq.',
  },
  {
    id: 'custom-compatible',
    label: 'Custom OpenAI-compatible',
    tier: 'byok',
    providerKind: 'openai_compatible',
    baseUrl: '',
    model: '',
    apiKey: '',
    maxTokens: 2048,
    builtin: true,
    description: 'Any /v1/chat/completions endpoint (Together, Fireworks, etc.).',
  },
];

/** Reserved for in-app subscription — not wired to billing yet. */
const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    allowedTiers: ['free', 'byok'],
    maxTokensCap: 2048,
    features: { streaming: false, tools: false },
  },
  pro: {
    id: 'pro',
    label: 'Pro (coming soon)',
    allowedTiers: ['free', 'byok', 'pro'],
    maxTokensCap: 8192,
    features: { streaming: true, tools: true },
  },
};

const AGENT_DEFAULTS = {
  enabled: true,
  activeProfileId: 'local-ollama',
  profiles: [],
  subscription: {
    plan: 'free',
  },
};

function cloneProfile(p) {
  return {
    id: p.id,
    label: p.label,
    tier: p.tier || 'byok',
    providerKind: p.providerKind || 'openai_compatible',
    baseUrl: p.baseUrl || '',
    model: p.model || '',
    apiKey: p.apiKey || '',
    maxTokens: Number(p.maxTokens) || 1024,
    builtin: !!p.builtin,
    description: p.description || '',
  };
}

function mergeWithBuiltins(profiles) {
  const byId = new Map(BUILTIN_PROFILES.map((p) => [p.id, cloneProfile(p)]));
  for (const p of profiles || []) {
    if (!p?.id) continue;
    const base = byId.get(p.id) || {};
    byId.set(p.id, cloneProfile({ ...base, ...p, id: p.id }));
  }
  return [...byId.values()];
}

function migrateLegacyAgent(raw) {
  if (raw?.profiles?.length && raw.activeProfileId) {
    return raw;
  }
  const legacy = {
    id: 'legacy-custom',
    label: 'Custom (migrated)',
    tier: raw?.provider === 'ollama' ? 'free' : 'byok',
    providerKind: raw?.provider === 'ollama' ? 'ollama' : 'openai_compatible',
    baseUrl: raw?.baseUrl || 'http://127.0.0.1:11434/v1',
    model: raw?.model || 'llama3.2',
    apiKey: raw?.apiKey || '',
    maxTokens: raw?.maxTokens || 1024,
    builtin: false,
  };
  const activeProfileId = raw?.provider === 'ollama' ? 'local-ollama' : 'legacy-custom';
  const profiles = raw?.provider === 'ollama' ? [] : [legacy];
  return {
    enabled: raw?.enabled !== false,
    activeProfileId,
    profiles: mergeWithBuiltins(profiles),
    subscription: { ...AGENT_DEFAULTS.subscription, ...(raw?.subscription || {}) },
  };
}

function normalizeAgentConfig(raw) {
  const migrated = migrateLegacyAgent(raw || {});
  const profiles = mergeWithBuiltins(migrated.profiles);
  let activeProfileId = migrated.activeProfileId || 'local-ollama';
  if (!profiles.some((p) => p.id === activeProfileId)) {
    activeProfileId = 'local-ollama';
  }
  return {
    enabled: migrated.enabled !== false,
    activeProfileId,
    profiles,
    subscription: {
      ...AGENT_DEFAULTS.subscription,
      ...(migrated.subscription || {}),
    },
  };
}

function getProfile(config, profileId) {
  const c = normalizeAgentConfig(config);
  return c.profiles.find((p) => p.id === profileId) || c.profiles[0];
}

function resolveEntitlements(subscription = {}) {
  const planId = subscription.plan || 'free';
  return SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.free;
}

function resolveActiveRuntime(config) {
  const normalized = normalizeAgentConfig(config);
  const profile = getProfile(normalized, normalized.activeProfileId);
  const entitlements = resolveEntitlements(normalized.subscription);

  if (!entitlements.allowedTiers.includes(profile.tier)) {
    return {
      error: `Profile "${profile.label}" requires an upgraded plan (${entitlements.label}).`,
      profile,
      entitlements,
    };
  }

  const maxTokens = Math.min(
    entitlements.maxTokensCap,
    Math.max(256, Number(profile.maxTokens) || 1024),
  );

  return {
    error: null,
    profileId: profile.id,
    profileLabel: profile.label,
    tier: profile.tier,
    providerKind: profile.providerKind,
    plan: entitlements.id,
    planLabel: entitlements.label,
    features: entitlements.features,
    baseUrl: (profile.baseUrl || '').replace(/\/$/, ''),
    model: (profile.model || '').trim(),
    apiKey: (profile.apiKey || '').trim(),
    maxTokens,
  };
}

function sanitizeConfigForRenderer(config) {
  const normalized = normalizeAgentConfig(config);
  return {
    enabled: normalized.enabled,
    activeProfileId: normalized.activeProfileId,
    subscription: normalized.subscription,
    profiles: normalized.profiles.map((p) => ({
      id: p.id,
      label: p.label,
      tier: p.tier,
      providerKind: p.providerKind,
      baseUrl: p.baseUrl,
      model: p.model,
      maxTokens: p.maxTokens,
      builtin: p.builtin,
      description: p.description,
      hasApiKey: !!(p.apiKey && String(p.apiKey).trim()),
    })),
    providerTemplates: BUILTIN_PROFILES.map((p) => ({
      id: p.id,
      label: p.label,
      tier: p.tier,
      providerKind: p.providerKind,
      description: p.description,
    })),
    subscriptionPlans: Object.values(SUBSCRIPTION_PLANS).map((p) => ({
      id: p.id,
      label: p.label,
      allowedTiers: p.allowedTiers,
      features: p.features,
    })),
  };
}

function applyProfilePatch(config, profileId, patch) {
  const normalized = normalizeAgentConfig(config);
  const profiles = normalized.profiles.map((p) =>
    p.id === profileId ? cloneProfile({ ...p, ...patch, id: profileId }) : p,
  );
  if (!profiles.some((p) => p.id === profileId)) {
    profiles.push(cloneProfile({ id: profileId, ...patch }));
  }
  return { ...normalized, profiles: mergeWithBuiltins(profiles) };
}

function addProfileFromTemplate(config, templateId) {
  const template = BUILTIN_PROFILES.find((p) => p.id === templateId);
  if (!template) throw new Error('Unknown provider template');
  const id = `${templateId}-${Date.now()}`;
  const normalized = normalizeAgentConfig(config);
  return {
    ...normalized,
    profiles: mergeWithBuiltins([
      ...normalized.profiles,
      { ...cloneProfile(template), id, label: `${template.label} copy`, builtin: false },
    ]),
    activeProfileId: id,
  };
}

module.exports = {
  AGENT_DEFAULTS,
  BUILTIN_PROFILES,
  SUBSCRIPTION_PLANS,
  normalizeAgentConfig,
  resolveActiveRuntime,
  resolveEntitlements,
  sanitizeConfigForRenderer,
  applyProfilePatch,
  addProfileFromTemplate,
};
