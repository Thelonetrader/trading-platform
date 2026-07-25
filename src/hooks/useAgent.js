import { useCallback, useEffect, useMemo, useState } from 'react';

const noopAgent = {
  getConfig: async () => ({
    enabled: false,
    activeProfileId: 'local-ollama',
    profiles: [],
    subscription: { plan: 'free' },
    providerTemplates: [],
    subscriptionPlans: [],
  }),
  setConfig: async (c) => c,
  setActiveProfile: async (id) => ({ activeProfileId: id }),
  updateProfile: async () => ({}),
  addProfile: async () => ({}),
  test: async () => ({ ok: false, error: 'Run via Electron for AI assistant' }),
  chat: async () => ({ error: 'Run via Electron for AI assistant' }),
};

export function useAgent() {
  const api = useMemo(() => (typeof window !== 'undefined' && window.agent) || noopAgent, []);
  const [config, setConfigState] = useState(null);
  const isElectron = api !== noopAgent;

  const reloadConfig = useCallback(async () => {
    const c = await api.getConfig();
    setConfigState(c);
    return c;
  }, [api]);

  useEffect(() => {
    reloadConfig();
  }, [reloadConfig]);

  const saveConfig = useCallback(
    async (patch) => {
      const next = await api.setConfig(patch);
      setConfigState(next);
      return next;
    },
    [api],
  );

  const setActiveProfile = useCallback(
    async (profileId) => {
      const next = await api.setActiveProfile(profileId);
      setConfigState(next);
      return next;
    },
    [api],
  );

  const updateProfile = useCallback(
    async (profileId, fields) => {
      const next = await api.updateProfile(profileId, fields);
      setConfigState(next);
      return next;
    },
    [api],
  );

  const addProfile = useCallback(
    async (templateId) => {
      const next = await api.addProfile(templateId);
      setConfigState(next);
      return next;
    },
    [api],
  );

  const testAgent = useCallback(() => api.test(), [api]);

  const chat = useCallback((payload) => api.chat(payload), [api]);

  const activeProfile = useMemo(() => {
    if (!config?.profiles?.length) return null;
    return config.profiles.find((p) => p.id === config.activeProfileId) || config.profiles[0];
  }, [config]);

  return {
    config,
    activeProfile,
    isElectron,
    reloadConfig,
    saveConfig,
    setActiveProfile,
    updateProfile,
    addProfile,
    testAgent,
    chat,
  };
}
