const DEFAULT_TIMEOUT_MS = 120_000;

class LlmClient {
  constructor(getRuntime) {
    this.getRuntime = getRuntime;
  }

  _cfg() {
    const r = this.getRuntime() || {};
    if (r.error) {
      throw new Error(r.error);
    }
    return {
      baseUrl: (r.baseUrl || 'http://127.0.0.1:11434/v1').replace(/\/$/, ''),
      model: (r.model || 'llama3.2').trim(),
      apiKey: (r.apiKey || '').trim(),
      maxTokens: Math.min(4096, Math.max(256, Number(r.maxTokens) || 1024)),
      providerKind: r.providerKind || 'ollama',
    };
  }

  async listModels() {
    const { baseUrl, apiKey, providerKind } = this._cfg();
    if (providerKind !== 'ollama') {
      return [];
    }
    const root = baseUrl.replace(/\/v1$/i, '');
    const res = await fetch(`${root}/api/tags`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text?.slice(0, 200) || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return (data.models || []).map((m) => m.name).filter(Boolean);
  }

  async testConnection() {
    const { model, providerKind } = this._cfg();
    if (providerKind === 'ollama') {
      try {
        const models = await this.listModels();
        const hasModel = models.some((n) => n === model || n.startsWith(`${model}:`));
        if (models.length && !hasModel) {
          return {
            ok: true,
            warning: `Connected, but "${model}" not in Ollama list. Available: ${models.slice(0, 5).join(', ')}`,
            models,
          };
        }
      } catch {
        /* chat probe below */
      }
    }

    const reply = await this.chat({
      messages: [{ role: 'user', content: 'Reply with exactly: ok' }],
      maxTokens: 16,
    });
    return { ok: true, sample: (reply.content || '').slice(0, 80) };
  }

  async chat({ messages, system, maxTokens }) {
    const { baseUrl, model, apiKey, maxTokens: cfgMax } = this._cfg();
    const url = `${baseUrl}/chat/completions`;
    const body = {
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...(messages || []),
      ],
      stream: false,
      max_tokens: maxTokens || cfgMax,
      temperature: 0.4,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(text?.slice(0, 300) || `LLM HTTP ${res.status}`);
    }

    if (!res.ok) {
      const errMsg = data?.error?.message || data?.message || text.slice(0, 300);
      throw new Error(errMsg || `LLM HTTP ${res.status}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (content == null) {
      throw new Error('Empty response from model');
    }
    return { content: String(content).trim(), model: data.model || model };
  }
}

module.exports = { LlmClient };
